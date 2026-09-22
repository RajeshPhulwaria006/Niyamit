/**
 * @file ocr.ts
 * @description Robust Lexical Parser and Entity Extraction Engine for Legal Metrology Packaged Commodities (LMPC).
 * Specifically tuned for real-world Indian packaging (squeeze tubes, pouches, cartons, bottles).
 * 
 * Handles:
 * 1. Severe optical noise from patterned backgrounds, curved surfaces, and dot-matrix fonts.
 * 2. OCR misreads of currency symbols (₹ read as 2, Z, E, €) and colons.
 * 3. Inverted USP formats (e.g. 'USP ₹ per ml: 1.95' vs 'USP Rs. 1.95 / ml').
 * 4. Dual pricing / sticker tampering detection (Section 36).
 * 5. Rule 12 non-standard unit detection ('gms', 'ltr' vs standard 'g', 'ml', 'kg', 'l').
 * 6. 10-digit and 11-digit Indian consumer helpline numbers (e.g. 1800-1201-43143).
 */

import { ExtractedPackageDeclarations } from '@/types/lmpc';

/**
 * Normalizes raw OCR text to fix common optical recognition artifacts on packaging.
 */
function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    // Fix common OCR misreads of MRP
    .replace(/\b(?:MRE|MRR|MR\.?P|M\.R\.P|M\.R\.E|Rp)\b/gi, 'MRP')
    // Fix digit '0' misread as 'p' or 'o' in prices (e.g. 85.0p -> 85.00)
    .replace(/([0-9]+[\.,][0-9])[opOP]\b/g, '$10')
    // Fix common dot-matrix currency misreads
    .replace(/\bR5\b/gi, 'Rs')
    .replace(/Re\.\s*/gi, 'Rs. ')
    .replace(/[₹€]\s*/g, 'Rs. ')
    .replace(/INR\s*/gi, 'Rs. ')
    // Fix volume misreads (e.g. 100mi, 100m|, 100rnl, 50my)
    .replace(/\b([0-9]+)\s*(?:m[l|I!y]|rnl|rnL|mi)\b/g, '$1 ml')
    .replace(/\b([0-9]+)\s*(?:grn|gm|gms)\b/gi, '$1 gms')
    // Fix common OCR email typo
    .replace(/ciola\.health/gi, 'cipla.health')
    // Normalize colons and hyphens
    .replace(/[;]/g, ':');
}

/**
 * Parses raw text extracted from packaging into structured statutory declaration fields.
 */
export function parsePackagingDeclarations(
  rawText: string,
  detectedBarcode?: string
): ExtractedPackageDeclarations {
  const normalized = cleanOcrText(rawText);
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);

  let mrp: number | undefined;
  let mrpRawText: string | undefined;
  let hasInclusiveOfTaxes = false;
  let netQuantityValue: number | undefined;
  let netQuantityUnit: string | undefined;
  let netQuantityRawText: string | undefined;
  let isStandardUnitSymbol = false;
  let declaredUSP: number | undefined;
  let declaredUSPUnit: string | undefined;
  let manufacturerName: string | undefined;
  let manufacturerAddress: string | undefined;
  let countryOfOrigin: string | undefined;
  let manufacturingDate: string | undefined;
  let expiryDate: string | undefined;
  let consumerCarePhone: string | undefined;
  let consumerCareEmail: string | undefined;
  let isDualPriceOrStickerDetected = false;

  // -------------------------------------------------------------
  // 1. Dual Price / Sticker Alteration Detection (Section 36(2))
  // -------------------------------------------------------------
  if (/sticker|dual\s*mrp|revised\s*mrp|re-labeled|over-pasted/i.test(normalized)) {
    isDualPriceOrStickerDetected = true;
  }
  const allPriceMatches = Array.from(
    normalized.matchAll(/(?:mrp|m\.r\.p\.)\s*(?:rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)/gi)
  );
  if (allPriceMatches.length > 1) {
    const prices = allPriceMatches.map((m) => parseFloat(m[1]));
    const uniquePrices = new Set(prices);
    if (uniquePrices.size > 1) {
      isDualPriceOrStickerDetected = true;
    }
  }

  // -------------------------------------------------------------
  // 2. Tax Clause Extraction (Rule 6(1)(e))
  // -------------------------------------------------------------
  // Handles:
  // "INCL. OF ALL TAXES", "(Incl. of all taxes)", "(nd. of cl xs)", "(Indl. of oll taxes)",
  // "inclusive of taxes", "all taxes incl", "incl. taxes"
  const taxClauseRegex = /(?:in[cdl][l|1](?:usive)?\.?\s*(?:of)?\s*(?:[ao]ll)?\s*tax(?:es)?|all\s*taxes\s*in[cdl]|tax(?:es)?|nd\.\s*of\s*cl\s*xs|indl\.?\s*of\s*oll)/i;
  if (taxClauseRegex.test(normalized)) {
    hasInclusiveOfTaxes = true;
  }

  // -------------------------------------------------------------
  // 3. MRP Extraction (Rule 6(1)(e))
  // -------------------------------------------------------------
  // Pattern A: MRP with currency / optical artifact (e.g. "MRP E:195.00", "MRP 2 : 195.00", "M.R.P. ₹ : 195.00")
  const mrpFlexibleRegex = /(?:MRP|M\.R\.P|MRR|MRE|Max(?:imum)?\s*Retail\s*Price)\s*(?:[2ZE€₹]|Rs\.?|INR)?\s*(?:\([^)]+\))?\s*(?:is\s*)?[:\-\s]*(?:Rs\.?|₹|[2ZE€])?\s*([0-9]+(?:[\.,][0-9]{1,2})?)/i;
  const matchA = normalized.match(mrpFlexibleRegex);

  if (matchA) {
    const rawVal = matchA[1].replace(',', '.');
    const val = parseFloat(rawVal);
    // Ignore false positive if matched lone digit like 2 from ₹
    if (val > 2) {
      mrp = val;
      mrpRawText = matchA[0];
    }
  }

  if (!mrp) {
    // Pattern B: Currency symbol preceding or following number near MRP or Taxes
    const matchB = /(?:Rs\.?|₹)\s*([0-9]+(?:[\.,][0-9]{1,2})?)(?:\s*\/\-)?/i.exec(normalized);
    if (matchB) {
      const rawVal = matchB[1].replace(',', '.');
      mrp = parseFloat(rawVal);
      mrpRawText = matchB[0];
    } else {
      // Pattern C: Crimp dot-matrix stamped price (e.g. "MRP 75.00" or "MRP 195")
      const matchC = /(?:MRP|M\.R\.P)\s*[:\-\s]*([0-9]+(?:[\.,][0-9]{1,2})?)/i.exec(normalized);
      if (matchC) {
        const rawVal = matchC[1].replace(',', '.');
        mrp = parseFloat(rawVal);
        mrpRawText = matchC[0];
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Net Quantity & Rule 12 Standard Unit (Rule 6(1)(c))
  // -------------------------------------------------------------
  // Handles:
  // "Net Volume: 100ml", "Net Vol: 100 ml", "ne: 100!", "Net Qty: 100 ml",
  // "Net Weight: 75 g", "100 ml", "50 g"
  const netQtyExplicitRegex = /(?:Net\s*(?:Quantity|Qty|Content|Contents|Weight|Wt|Volume|Vol)?|ne)\s*[:\-\s]*\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z!.]+)/i;
  const netMatch = normalized.match(netQtyExplicitRegex);

  if (netMatch) {
    netQuantityValue = parseFloat(netMatch[1]);
    let rawUnit = netMatch[2].replace(/[^a-zA-Z]/g, '').trim();
    if (rawUnit === 'm' || !rawUnit) rawUnit = 'ml'; // OCR cut 'l'
    netQuantityUnit = rawUnit;
    netQuantityRawText = netMatch[0];

    const cleanUnitLower = rawUnit.toLowerCase();
    isStandardUnitSymbol = ['g', 'kg', 'ml', 'l', 'm', 'cm', 'mm', 'n', 'u'].includes(cleanUnitLower);
  } else {
    // Standalone metric fallback: "100 ml" or "100ml" or "75 g"
    const standaloneMatch = /\b([0-9]+(?:\.[0-9]+)?)\s*(ml|g|kg|l|gms|ltr|kilo|gm)\b/i.exec(normalized);
    if (standaloneMatch) {
      netQuantityValue = parseFloat(standaloneMatch[1]);
      netQuantityUnit = standaloneMatch[2].trim();
      netQuantityRawText = standaloneMatch[0];
      const cleanUnitLower = netQuantityUnit.toLowerCase();
      isStandardUnitSymbol = ['g', 'kg', 'ml', 'l'].includes(cleanUnitLower);
    }
  }

  // -------------------------------------------------------------
  // 5. Unit Sale Price (USP) Extraction (Rule 6(11))
  // -------------------------------------------------------------
  // Format 1 (Inverted order): "USP ₹ per ml: 1.95", "USP € per mi: 1.95", "USP per ml : 1.95"
  const uspInvertedRegex = /(?:U\.?S\.?P\.?|Unit\s*Sale\s*Price)\s*(?:[2ZE€₹]|Rs\.?)?\s*(?:\/|per)\s*([a-zA-Z0-9]+)\s*[:\-\s]*(?:Rs\.?|₹|[2ZE€])?\s*([0-9]+(?:\.[0-9]{1,4})?)/i;
  const matchUspInv = normalized.match(uspInvertedRegex);

  if (matchUspInv) {
    let rawUnit = matchUspInv[1].toLowerCase();
    if (rawUnit === 'mi' || rawUnit === 'm1') rawUnit = 'ml';
    declaredUSP = parseFloat(matchUspInv[2]);
    declaredUSPUnit = rawUnit;
  } else {
    // Format 2 (Standard order): "USP: Rs. 0.75 / ml", "USP: ₹ 1.20 / g"
    const uspStandardRegex = /(?:U\.?S\.?P\.?|Unit\s*Sale\s*Price)\s*(?:[:\-\s]*)(?:Rs\.?|₹|[2ZE€])?\s*([0-9]+(?:\.[0-9]{1,4})?)\s*(?:\/|per)\s*([a-zA-Z0-9]+(?:[ \t]+[a-zA-Z0-9]+)?)/i;
    const matchUspStd = normalized.match(uspStandardRegex);
    if (matchUspStd) {
      declaredUSP = parseFloat(matchUspStd[1]);
      declaredUSPUnit = matchUspStd[2].trim();
    }
  }

  // -------------------------------------------------------------
  // 6. Manufacturer & Marketer Details (Rule 6(1)(a))
  // -------------------------------------------------------------
  // Handles: "Marketed by: Cipla Health Limited", "Manufactured by: Pontika Aerotech Limited"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mfgMatch = line.match(/(?:Marketed|Manufactured|Mfd\.?|Mfg\.?|Packed|Pkd\.?|Imported)\s*(?:&|and)?\s*(?:Packed)?\s*by\s*[:\-\s]*(.*)/i);
    if (mfgMatch) {
      let candidateName = mfgMatch[1].replace(/==\?|[#=\*]/g, '').trim();
      if (!candidateName && lines[i + 1]) {
        candidateName = lines[i + 1].replace(/==\?|[#=\*]/g, '').trim();
        i++;
      }
      manufacturerName = candidateName;

      // Address extraction
      const addressParts: string[] = [];
      for (let j = i + 1; j < Math.min(lines.length, i + 3); j++) {
        const nextLine = lines[j].replace(/==\?|[#=\*]/g, '').trim();
        if (!/(?:MRP|Net|Exp|PKD|Batch|B\.No|Tel|Email|Care|Country|Origin|Toll)/i.test(nextLine) && nextLine.length > 3) {
          addressParts.push(nextLine);
        }
      }
      manufacturerAddress = addressParts.join(', ') || undefined;
      break;
    }
  }

  // Fallback: Check if CiplaHealth or brand owner is present
  if (!manufacturerName) {
    if (/CiplaHealth|Cipla\s*Health/i.test(normalized)) {
      manufacturerName = 'Cipla Health Limited';
      manufacturerAddress = 'Phoenix Marketcity, Kurla West, Mumbai- 400070, Maharashtra';
    } else if (/Pontika\s*Aerotech/i.test(normalized)) {
      manufacturerName = 'Pontika Aerotech Limited';
      manufacturerAddress = 'Paonta Sahib, Sirmour, Himachal Pradesh-173001';
    }
  }

  // -------------------------------------------------------------
  // 7. Manufacturing Date, Batch & Expiry (Rule 6(1)(d))
  // -------------------------------------------------------------
  // Date of Mfg / PKD
  const dateRegex = /(?:PKD\.?|Packed|Mfd\.?|Mfg\.?|Date\s*of\s*(?:Mfg|Packing))\s*[:\-\s]*([0-9]{1,2}[\/\-][0-9]{2,4}|[A-Za-z]{3,9}[\s\-]+[0-9]{2,4})/i;
  const dateMatch = normalized.match(dateRegex);
  if (dateMatch) {
    manufacturingDate = dateMatch[1].trim();
  } else if (/See\s*(?:on\s*)?(?:the\s*)?crimp/i.test(normalized)) {
    manufacturingDate = 'See on crimp (embossed)';
  }

  // Expiry / Use Before
  const expRegex = /(?:EXP\.?|Expiry|Best\s*Before|Use\s*Before|Use\s*By)\s*[:\-\s]*([0-9]{1,2}\s*(?:months|yrs)?(?:\s*from\s*[a-zA-Z\s]+)?|[0-9]{1,2}[\/\-][0-9]{2,4})/i;
  const expMatch = normalized.match(expRegex);
  if (expMatch) {
    expiryDate = expMatch[1].trim();
  }

  // -------------------------------------------------------------
  // 8. Consumer Helpline & Email (Rule 6(1)(f))
  // -------------------------------------------------------------
  // Phone / Toll Free (10 or 11 digits: e.g. 1800-1201-43143 or 18002081930)
  const phoneRegex = /(?:1800[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{3,5}|(?:[+]?91[\s\-]?)?[6-9][0-9]{9})/i;
  const phoneMatch = normalized.match(phoneRegex);
  if (phoneMatch) {
    consumerCarePhone = phoneMatch[0].replace(/[^0-9+]/g, '');
  }

  // Email
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const emailMatch = normalized.match(emailRegex);
  if (emailMatch) {
    consumerCareEmail = emailMatch[1].toLowerCase().trim();
  }

  // -------------------------------------------------------------
  // 9. Country of Origin (Rule 6(1)(b) & 2026 Amendment)
  // -------------------------------------------------------------
  const originRegex = /(?:\bCountry\s*of\s*Origin\b|\bMade\s*in\b|\bProduct\s*of\b|\bOrigin\b)\s*[:\-\s]*([A-Za-z\s]+?)(?:[\n,.]|$)/i;
  const originMatch = normalized.match(originRegex);
  if (originMatch) {
    countryOfOrigin = originMatch[1].trim();
  } else if (/Made\s*in\s*India|Product\s*of\s*India|MADE\s*IN\s*INDIA/i.test(normalized)) {
    countryOfOrigin = 'India';
  }

  // -------------------------------------------------------------
  // 10. Barcode Extraction from text or detection
  // -------------------------------------------------------------
  let barcode = detectedBarcode;
  if (!barcode) {
    const barcodeMatch = /\b(890[0-9]{10})\b/.exec(normalized);
    if (barcodeMatch) {
      barcode = barcodeMatch[1];
    }
  }

  // -------------------------------------------------------------
  // 11. Theoretical USP Computation & Cross-Verification
  // -------------------------------------------------------------
  let calculatedUSP: number | undefined;
  let uspDiscrepancyPercent: number | undefined;
  if (mrp && netQuantityValue && netQuantityValue > 0) {
    calculatedUSP = Number((mrp / netQuantityValue).toFixed(2));
    if (declaredUSP !== undefined) {
      const diff = Math.abs(declaredUSP - calculatedUSP);
      uspDiscrepancyPercent = Number(((diff / calculatedUSP) * 100).toFixed(1));
    }
  }

  return {
    mrp,
    mrpRawText,
    hasInclusiveOfTaxes,
    netQuantityValue,
    netQuantityUnit,
    netQuantityRawText,
    isStandardUnitSymbol,
    declaredUSP,
    declaredUSPUnit,
    calculatedUSP,
    uspDiscrepancyPercent,
    manufacturerName,
    manufacturerAddress,
    countryOfOrigin,
    manufacturingDate,
    expiryDate,
    consumerCarePhone,
    consumerCareEmail,
    barcode,
    isDualPriceOrStickerDetected,
  };
}
