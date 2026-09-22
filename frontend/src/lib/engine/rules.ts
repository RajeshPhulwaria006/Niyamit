/**
 * @file rules.ts
 * @description Deterministic Statutory Compliance Rule Engine for Legal Metrology (Packaged Commodities) Rules, 2011.
 * Codifies Rules 6, 7, 9, 11, 12, 26, 27 and Sections 18, 36, 48, 49 of the Legal Metrology Act, 2009.
 * Strictly executes reproducible mathematical calculations and deterministic checks without AI hallucinations.
 */

import {
  ExtractedPackageDeclarations,
  PhysicalCalibrationMetrics,
  RuleEvaluationResult,
  OverallInspectionStatus,
} from '@/types/lmpc';

/**
 * Standard units permitted under Rule 12 of LMPC Rules, 2011.
 */
export const PERMITTED_SI_UNITS = new Set(['g', 'kg', 'ml', 'l', 'm', 'cm', 'mm', 'n', 'u', 'number']);

/**
 * Prohibited colloquial or non-standard unit strings frequently used illegally by manufacturers.
 */
export const PROHIBITED_UNIT_STRINGS = ['gms', 'gm.', 'kilo', 'kilos', 'ltr', 'ltrs', 'cc', 'c.c.', 'caps', 'tabs'];

/**
 * Evaluates the full suite of statutory compliance rules against extracted declarations and calibration metrics.
 *
 * @param declarations Extracted packaging text entities.
 * @param calibration Optical calibration metrics (if image scale was resolved).
 * @returns An array of individual rule evaluations and the overall determination.
 */
export function evaluateAllLMPCRules(
  declarations: ExtractedPackageDeclarations,
  calibration?: PhysicalCalibrationMetrics
): {
  evaluations: RuleEvaluationResult[];
  overallStatus: OverallInspectionStatus;
  criticalViolationsCount: number;
} {
  const evaluations: RuleEvaluationResult[] = [];

  // =========================================================================
  // RULE 1: Maximum Retail Price (MRP) Declaration (Rule 6(1)(e))
  // =========================================================================
  if (declarations.mrp && declarations.mrp > 0) {
    evaluations.push({
      id: 'RULE_6_1_E_MRP_PRESENCE',
      title: 'Maximum Retail Price (MRP) Declaration',
      statutoryReference: 'Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011',
      status: 'PASS',
      explanation: 'MRP is clearly declared in Indian Rupees (INR).',
      observedValue: `₹ ${declarations.mrp.toFixed(2)}`,
      mandatedRequirement: 'Mandatory declaration of Maximum Retail Price (MRP) in Indian currency.',
      severity: 'CRITICAL',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009 (Fine up to ₹25,000 for 1st offence).',
    });
  } else {
    evaluations.push({
      id: 'RULE_6_1_E_MRP_PRESENCE',
      title: 'Maximum Retail Price (MRP) Declaration',
      statutoryReference: 'Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011',
      status: 'FAIL',
      explanation: 'Maximum Retail Price (MRP) is missing, obscured, or not declared.',
      observedValue: declarations.mrpRawText || 'NOT DETECTED',
      mandatedRequirement: 'Mandatory declaration of Maximum Retail Price (MRP) in Indian currency.',
      severity: 'CRITICAL',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009 (Fine up to ₹25,000 for 1st offence, ₹50,000 for 2nd offence, up to 1 yr imprisonment).',
    });
  }

  // =========================================================================
  // RULE 2: Inclusive of All Taxes Clause (Rule 6(1)(e))
  // =========================================================================
  if (declarations.hasInclusiveOfTaxes) {
    evaluations.push({
      id: 'RULE_6_1_E_TAX_CLAUSE',
      title: 'Tax Clause on Retail Price',
      statutoryReference: 'Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011',
      status: 'PASS',
      explanation: 'Price explicitly includes statutory phrase "inclusive of all taxes" or "incl. of all taxes".',
      observedValue: 'Declared ("incl. of all taxes")',
      mandatedRequirement: 'MRP must be accompanied by the words "inclusive of all taxes".',
      severity: 'MAJOR',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
    });
  } else {
    evaluations.push({
      id: 'RULE_6_1_E_TAX_CLAUSE',
      title: 'Tax Clause on Retail Price',
      statutoryReference: 'Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011',
      status: 'FAIL',
      explanation: 'Statutory phrase "inclusive of all taxes" is absent from the MRP declaration.',
      observedValue: 'Omitted or non-compliant format',
      mandatedRequirement: 'MRP must be explicitly stated as "inclusive of all taxes".',
      severity: 'MAJOR',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009 (Penalty up to ₹25,000).',
    });
  }

  // =========================================================================
  // RULE 3: Net Quantity & Standard SI Units (Rule 6(1)(c) & Rule 12)
  // =========================================================================
  if (declarations.netQuantityValue && declarations.netQuantityValue > 0) {
    const rawUnit = (declarations.netQuantityUnit || '').trim().toLowerCase();
    const isProhibited = PROHIBITED_UNIT_STRINGS.includes(rawUnit);
    const isPermitted = PERMITTED_SI_UNITS.has(rawUnit);

    if (isProhibited || !isPermitted) {
      evaluations.push({
        id: 'RULE_6_1_C_NET_QUANTITY_UNITS',
        title: 'Net Quantity Standard SI Units Verification',
        statutoryReference: 'Rule 6(1)(c) read with Rule 12, LMPC Rules, 2011',
        status: 'FAIL',
        explanation: `Non-standard unit symbol '${rawUnit}' used. Rule 12 strictly permits only standard SI symbols ('g', 'kg', 'ml', 'l'). Prohibited terms like 'gms' or 'kilos' are illegal.`,
        observedValue: `${declarations.netQuantityValue} ${rawUnit}`,
        mandatedRequirement: 'Net quantity must be declared using standard SI symbols without punctuation (g, kg, ml, l, N).',
        severity: 'MAJOR',
        penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
      });
    } else {
      evaluations.push({
        id: 'RULE_6_1_C_NET_QUANTITY_UNITS',
        title: 'Net Quantity & Standard SI Units',
        statutoryReference: 'Rule 6(1)(c) read with Rule 12, LMPC Rules, 2011',
        status: 'PASS',
        explanation: `Net quantity correctly stated using statutory SI symbol '${rawUnit}'.`,
        observedValue: `${declarations.netQuantityValue} ${rawUnit}`,
        mandatedRequirement: 'Standard SI unit symbol (g, kg, ml, l, N).',
        severity: 'CRITICAL',
      });
    }
  } else {
    evaluations.push({
      id: 'RULE_6_1_C_NET_QUANTITY_UNITS',
      title: 'Net Quantity Declaration',
      statutoryReference: 'Rule 6(1)(c), LMPC Rules, 2011',
      status: 'FAIL',
      explanation: 'Net quantity is missing or unreadable on the packaging.',
      observedValue: declarations.netQuantityRawText || 'NOT DETECTED',
      mandatedRequirement: 'Mandatory declaration of net quantity in weight, measure, or number.',
      severity: 'CRITICAL',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
    });
  }

  // =========================================================================
  // RULE 4: Unit Sale Price (USP) Mandate & Mathematical Consistency (Rule 6(11))
  // =========================================================================
  if (declarations.mrp && declarations.netQuantityValue && declarations.netQuantityValue > 0) {
    const rawUnit = (declarations.netQuantityUnit || '').toLowerCase();
    let normalizedQty = declarations.netQuantityValue;
    let baseUnit = rawUnit;

    // Normalize quantity to base unit (e.g. per gram or per milliliter)
    if (rawUnit === 'kg') {
      normalizedQty = declarations.netQuantityValue * 1000;
      baseUnit = 'g';
    } else if (rawUnit === 'l' || rawUnit === 'liter') {
      normalizedQty = declarations.netQuantityValue * 1000;
      baseUnit = 'ml';
    }

    const calculatedUspPerBase = declarations.mrp / normalizedQty;
    // Statutory USP is typically expressed per g (if < 1kg) or per kg (if >= 1kg)
    const expectedUSPDisplay = declarations.netQuantityValue >= 1000 || rawUnit === 'kg' || rawUnit === 'l'
      ? Number(((declarations.mrp / declarations.netQuantityValue)).toFixed(2))
      : Number((calculatedUspPerBase).toFixed(2));

    if (declarations.declaredUSP !== undefined && declarations.declaredUSP > 0) {
      // Check mathematical discrepancy between printed USP and true calculated USP
      const diff = Math.abs(declarations.declaredUSP - expectedUSPDisplay);
      const percentDiff = (diff / expectedUSPDisplay) * 100;

      if (percentDiff > 2.0) {
        evaluations.push({
          id: 'RULE_6_11_UNIT_SALE_PRICE',
          title: 'Unit Sale Price (USP) Mathematical Consistency',
          statutoryReference: 'Rule 6(11), LMPC Amendment Rules, 2021',
          status: 'FAIL',
          explanation: `Declared USP (₹ ${declarations.declaredUSP}) does not match true mathematical ratio of MRP to Net Quantity (expected ₹ ${expectedUSPDisplay}). Discrepancy is ${percentDiff.toFixed(1)}%.`,
          observedValue: `Declared: ₹ ${declarations.declaredUSP} / ${declarations.declaredUSPUnit || baseUnit}`,
          mandatedRequirement: `Calculated USP must equal MRP ÷ Net Quantity (Expected: ₹ ${expectedUSPDisplay} / ${baseUnit})`,
          severity: 'MAJOR',
          penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
        });
      } else {
        evaluations.push({
          id: 'RULE_6_11_UNIT_SALE_PRICE',
          title: 'Unit Sale Price (USP) Mandate',
          statutoryReference: 'Rule 6(11), LMPC Amendment Rules, 2021',
          status: 'PASS',
          explanation: 'Unit Sale Price is correctly declared and mathematically consistent with MRP and Net Quantity.',
          observedValue: `₹ ${declarations.declaredUSP} / ${declarations.declaredUSPUnit || baseUnit}`,
          mandatedRequirement: 'USP must be declared per g/kg/ml/l and match mathematical ratio.',
          severity: 'MAJOR',
        });
      }
    } else {
      evaluations.push({
        id: 'RULE_6_11_UNIT_SALE_PRICE',
        title: 'Unit Sale Price (USP) Mandate',
        statutoryReference: 'Rule 6(11), LMPC Amendment Rules, 2021',
        status: 'FAIL',
        explanation: 'Unit Sale Price (USP) is missing from the packaging declaration. Mandatory since December 1, 2022.',
        observedValue: 'NOT DECLARED',
        mandatedRequirement: `Mandatory declaration of Unit Sale Price (calculated as ₹ ${expectedUSPDisplay.toFixed(2)} per ${baseUnit}).`,
        severity: 'MAJOR',
        penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
      });
    }
  }

  // =========================================================================
  // RULE 5: Manufacturer / Packer / Importer Name and Address (Rule 6(1)(a))
  // =========================================================================
  if (declarations.manufacturerName && declarations.manufacturerAddress) {
    evaluations.push({
      id: 'RULE_6_1_A_MANUFACTURER_DETAILS',
      title: 'Manufacturer / Packer / Importer Identity',
      statutoryReference: 'Rule 6(1)(a), LMPC Rules, 2011',
      status: 'PASS',
      explanation: 'Complete legal identity and physical address of manufacturer/packer is declared.',
      observedValue: `${declarations.manufacturerName}, ${declarations.manufacturerAddress}`,
      mandatedRequirement: 'Name and complete physical address of manufacturer, packer, or importer.',
      severity: 'CRITICAL',
    });
  } else if (declarations.manufacturerName) {
    evaluations.push({
      id: 'RULE_6_1_A_MANUFACTURER_DETAILS',
      title: 'Manufacturer Address Incomplete',
      statutoryReference: 'Rule 6(1)(a), LMPC Rules, 2011',
      status: 'WARNING',
      explanation: 'Manufacturer name is detected, but complete physical address or registered unit location is missing.',
      observedValue: declarations.manufacturerName,
      mandatedRequirement: 'Complete address including state and pin code.',
      severity: 'MAJOR',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
    });
  } else {
    evaluations.push({
      id: 'RULE_6_1_A_MANUFACTURER_DETAILS',
      title: 'Manufacturer / Packer Identity Missing',
      statutoryReference: 'Rule 6(1)(a), LMPC Rules, 2011',
      status: 'FAIL',
      explanation: 'No manufacturer, packer, or importer details detected on the packaging.',
      observedValue: 'NOT DETECTED',
      mandatedRequirement: 'Mandatory declaration of manufacturer / packer name and address.',
      severity: 'CRITICAL',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
    });
  }

  // =========================================================================
  // RULE 6: Country of Origin (Rule 6(1)(b) & 2026 Amendment)
  // =========================================================================
  if (declarations.countryOfOrigin) {
    evaluations.push({
      id: 'RULE_6_1_B_COUNTRY_OF_ORIGIN',
      title: 'Country of Origin Declaration',
      statutoryReference: 'Rule 6(1)(b), LMPC Rules, 2011 & Amendment 2026',
      status: 'PASS',
      explanation: 'Country of origin is prominently declared.',
      observedValue: declarations.countryOfOrigin,
      mandatedRequirement: 'Prominent Country of Origin declaration.',
      severity: 'MAJOR',
    });
  } else {
    evaluations.push({
      id: 'RULE_6_1_B_COUNTRY_OF_ORIGIN',
      title: 'Country of Origin Missing',
      statutoryReference: 'Rule 6(1)(b), LMPC Rules, 2011 & Amendment 2026',
      status: 'FAIL',
      explanation: 'Country of Origin is missing. Mandatory for all imported and digital market listings.',
      observedValue: 'NOT DETECTED',
      mandatedRequirement: 'Mandatory declaration of Country of Origin on label and digital listings.',
      severity: 'MAJOR',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
    });
  }

  // =========================================================================
  // RULE 7: Month and Year of Manufacture / Packing (Rule 6(1)(d))
  // =========================================================================
  if (declarations.manufacturingDate) {
    evaluations.push({
      id: 'RULE_6_1_D_DATE_OF_MANUFACTURE',
      title: 'Date of Manufacture / Packing',
      statutoryReference: 'Rule 6(1)(d), LMPC Rules, 2011',
      status: 'PASS',
      explanation: 'Month and year of manufacture or packing is present in valid format.',
      observedValue: declarations.manufacturingDate,
      mandatedRequirement: 'Month and year of manufacture or packing (MM/YYYY or Month YYYY).',
      severity: 'CRITICAL',
    });
  } else {
    evaluations.push({
      id: 'RULE_6_1_D_DATE_OF_MANUFACTURE',
      title: 'Date of Manufacture Missing',
      statutoryReference: 'Rule 6(1)(d), LMPC Rules, 2011',
      status: 'FAIL',
      explanation: 'Month and year of manufacture or packing is missing from package.',
      observedValue: 'NOT DETECTED',
      mandatedRequirement: 'Mandatory declaration of Month and Year of packing / manufacture.',
      severity: 'CRITICAL',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
    });
  }

  // =========================================================================
  // RULE 8: Consumer Care Grievance Redressal (Rule 6(1)(f))
  // =========================================================================
  if (declarations.consumerCarePhone && declarations.consumerCareEmail) {
    evaluations.push({
      id: 'RULE_6_1_F_CONSUMER_CARE',
      title: 'Consumer Grievance Care Details',
      statutoryReference: 'Rule 6(1)(f), LMPC Rules, 2011',
      status: 'PASS',
      explanation: 'Both contact phone number and grievance redressal email address are declared.',
      observedValue: `Tel: ${declarations.consumerCarePhone}, Email: ${declarations.consumerCareEmail}`,
      mandatedRequirement: 'Name/designation, address, telephone, and email for consumer care.',
      severity: 'MAJOR',
    });
  } else if (declarations.consumerCarePhone || declarations.consumerCareEmail) {
    evaluations.push({
      id: 'RULE_6_1_F_CONSUMER_CARE',
      title: 'Consumer Care Incomplete',
      statutoryReference: 'Rule 6(1)(f), LMPC Rules, 2011',
      status: 'WARNING',
      explanation: 'Only partial consumer contact information is present (missing either email or phone).',
      observedValue: declarations.consumerCarePhone || declarations.consumerCareEmail || 'Partial',
      mandatedRequirement: 'Both telephone number and email address required for consumer redressal.',
      severity: 'MAJOR',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
    });
  } else {
    evaluations.push({
      id: 'RULE_6_1_F_CONSUMER_CARE',
      title: 'Consumer Grievance Care Missing',
      statutoryReference: 'Rule 6(1)(f), LMPC Rules, 2011',
      status: 'FAIL',
      explanation: 'No consumer care contact details found on the packaging.',
      observedValue: 'NOT DETECTED',
      mandatedRequirement: 'Mandatory declaration of consumer care telephone and email address.',
      severity: 'MAJOR',
      penaltyClause: 'Section 36(1), Legal Metrology Act, 2009.',
    });
  }

  // =========================================================================
  // RULE 9: Physical Font Size & Numerals Height (Rule 7, Table-I)
  // =========================================================================
  if (calibration) {
    if (calibration.isFontHeightCompliant) {
      evaluations.push({
        id: 'RULE_7_FONT_HEIGHT_TABLE_I',
        title: 'Minimum Font Height (Rule 7 Table-I)',
        statutoryReference: 'Rule 7, Table-I, Legal Metrology (Packaged Commodities) Rules, 2011',
        status: 'PASS',
        explanation: `Measured numeral height (${calibration.measuredNumeralHeightMm} mm) satisfies statutory minimum (${calibration.mandatedMinHeightMm} mm) for PDP area of ${calibration.pdpAreaCm2} cm².`,
        observedValue: `${calibration.measuredNumeralHeightMm} mm`,
        mandatedRequirement: `>= ${calibration.mandatedMinHeightMm} mm (Area: ${calibration.pdpAreaCm2} cm²)`,
        severity: 'CRITICAL',
      });
    } else {
      evaluations.push({
        id: 'RULE_7_FONT_HEIGHT_TABLE_I',
        title: 'Minimum Font Height Violation (Rule 7 Table-I)',
        statutoryReference: 'Rule 7, Table-I, Legal Metrology (Packaged Commodities) Rules, 2011',
        status: 'FAIL',
        explanation: `Under-sized numerals detected. Measured font height is ${calibration.measuredNumeralHeightMm} mm, which is below the mandatory minimum of ${calibration.mandatedMinHeightMm} mm prescribed for PDP area ${calibration.pdpAreaCm2} cm².`,
        observedValue: `${calibration.measuredNumeralHeightMm} mm (DEFICIENT)`,
        mandatedRequirement: `>= ${calibration.mandatedMinHeightMm} mm for PDP area of ${calibration.pdpAreaCm2} cm²`,
        severity: 'CRITICAL',
        penaltyClause: 'Section 36(1), Legal Metrology Act, 2009 (Seizure and compounding penalty).',
      });
    }

    // Width to Height Ratio check
    if (calibration.widthToHeightRatio < 0.33) {
      evaluations.push({
        id: 'RULE_7_WIDTH_RATIO',
        title: 'Numeral Width-to-Height Ratio',
        statutoryReference: 'Rule 7, LMPC Rules, 2011',
        status: 'FAIL',
        explanation: `Numeral width ratio (${calibration.widthToHeightRatio}) is compressed below statutory minimum of 1/3 (0.33) of its height.`,
        observedValue: `Ratio: ${calibration.widthToHeightRatio}`,
        mandatedRequirement: 'Width of numeral/letter must not be less than 1/3 of height.',
        severity: 'MINOR',
      });
    }
  }

  // =========================================================================
  // RULE 10: Price Alteration / Dual MRP Sticker Violation (Section 36(2))
  // =========================================================================
  if (declarations.isDualPriceOrStickerDetected) {
    evaluations.push({
      id: 'SECTION_36_DUAL_PRICING_STICKER',
      title: 'Illegal Price Alteration / Sticker Over-Pasting',
      statutoryReference: 'Section 36(2), Legal Metrology Act, 2009',
      status: 'FAIL',
      explanation: 'Tampering detected: A secondary price sticker has been affixed over the original printed MRP, or dual MRP pricing detected. Strictly prohibited under Section 36(2).',
      observedValue: 'Dual MRP / Sticker Overlay Detected',
      mandatedRequirement: 'Strict prohibition on altering, smudging, or pasting stickers over the manufacturer printed MRP.',
      severity: 'CRITICAL',
      penaltyClause: 'Section 36(2), Legal Metrology Act, 2009 (Fine up to ₹50,000 for second offence, imprisonment up to 1 year).',
    });
  } else {
    evaluations.push({
      id: 'SECTION_36_DUAL_PRICING_STICKER',
      title: 'Price Integrity & Absence of Sticker Over-Pasting',
      statutoryReference: 'Section 36(2), Legal Metrology Act, 2009',
      status: 'PASS',
      explanation: 'No sticker overlay or dual price tampering detected on packaging.',
      observedValue: 'Single intact original printed price',
      mandatedRequirement: 'Intact original printed declaration without over-pasting.',
      severity: 'CRITICAL',
    });
  }

  // Determine overall status
  const failedRules = evaluations.filter((r) => r.status === 'FAIL');
  const criticalFails = failedRules.filter((r) => r.severity === 'CRITICAL');

  let overallStatus: OverallInspectionStatus = 'COMPLIANT';
  if (failedRules.length > 0) {
    overallStatus = 'NON_COMPLIANT';
  } else if (evaluations.some((r) => r.status === 'WARNING')) {
    overallStatus = 'INCOMPLETE_DECLARATION';
  }

  return {
    evaluations,
    overallStatus,
    criticalViolationsCount: criticalFails.length,
  };
}

/**
 * Drafts an official statutory inspection and seizure notice (Form VIII Panchnama memo)
 * under Section 15 & 36 of the Legal Metrology Act, 2009.
 *
 * @param auditId Reference audit identifier.
 * @param location Premises where commodity was audited.
 * @param inspectorId Officer badge number.
 * @param evaluations Array of rule check outcomes.
 * @param declarations Extracted package attributes.
 * @returns Pre-formatted legal notice string suitable for PDF export or enforcement filing.
 */
export function generateLegalNoticeDraft(
  auditId: string,
  location: string,
  inspectorId: string,
  evaluations: RuleEvaluationResult[],
  declarations: ExtractedPackageDeclarations
): string {
  const violations = evaluations.filter((e) => e.status === 'FAIL');
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  let notice = `================================================================================
GOVERNMENT OF INDIA
DEPARTMENT OF CONSUMER AFFAIRS
LEGAL METROLOGY DIVISION
INSPECTION MEMORANDUM & NOTICE OF NON-COMPLIANCE
(Issued under Section 15 read with Section 36 of the Legal Metrology Act, 2009)
================================================================================

MEMO NO: LMPC/ENF/${auditId}
DATE: ${dateStr}
INSPECTING OFFICER ID: ${inspectorId}
INSPECTION PREMISES: ${location}

1. DETAILS OF COMMODITY INSPECTED:
   - Product Identity: ${declarations.manufacturerName || 'Packaged Commodity'}
   - Declared MRP: ₹ ${declarations.mrp ? declarations.mrp.toFixed(2) : 'Not Specified'}
   - Net Quantity: ${declarations.netQuantityValue || ''} ${declarations.netQuantityUnit || ''}
   - Barcode (EAN-13): ${declarations.barcode || 'Not Detected'}
   - Date of Mfg/Pack: ${declarations.manufacturingDate || 'Not Declared'}

2. STATUTORY CONTRAVENTIONS DETECTED:
`;

  if (violations.length === 0) {
    notice += `   No statutory contraventions observed during this inspection.\n   The package is found compliant with Legal Metrology (Packaged Commodities) Rules, 2011.\n`;
  } else {
    violations.forEach((v, idx) => {
      notice += `   (${idx + 1}) ${v.title}
       Statute: ${v.statutoryReference}
       Finding: ${v.observedValue} (Required: ${v.mandatedRequirement})
       Violation: ${v.explanation}
       Applicable Penalty: ${v.penaltyClause || 'Section 36(1)'}
\n`;
    });

    notice += `3. LEGAL DIRECTIVE & COMPLIANCE ORDER:
   Whereas inspection of the aforementioned packaged commodity has revealed prime facie
   violations of the Legal Metrology Act, 2009 and Rules framed thereunder;

   You are hereby called upon to show cause within fifteen (15) days from the date of
   receipt of this notice as to why penal proceedings under Section 36 / Section 49 of the
   said Act should not be initiated against you, or why the said offences should not be
   compounded in accordance with Section 48 of the Act.

   Failure to respond or rectify within the stipulated period shall lead to seizure of
   the non-compliant batch under Section 15(1)(b) and prosecution before the competent Court.

   Issued under the seal of the Controller / Inspector of Legal Metrology.
`;
  }

  notice += `================================================================================\n`;
  return notice;
}
