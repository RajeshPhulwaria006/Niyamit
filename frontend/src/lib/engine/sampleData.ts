/**
 * @file sampleData.ts
 * @description Curated real-world sample test packages for Legal Metrology compliance testing.
 * Provides instant 1-click scenarios representing diverse enforcement cases:
 * - Fully compliant retail FMCG pack
 * - Common retail packaging non-compliance (missing USP, illegal 'gms' unit, font size deficiency)
 * - Criminal price alteration / Dual-MRP sticker tampering (Section 36)
 * - Imported electronic commodity with missing Country of Origin (2026 mandate)
 */

import { ExtractedPackageDeclarations, PhysicalCalibrationMetrics } from '@/types/lmpc';

export interface SamplePackageTestCase {
  id: string;
  name: string;
  category: string;
  summary: string;
  expectedOutcome: 'COMPLIANT' | 'NON_COMPLIANT';
  rawText: string;
  barcode: string;
  calibration: PhysicalCalibrationMetrics;
  declarations: ExtractedPackageDeclarations;
}

export const SAMPLE_PACKAGES: SamplePackageTestCase[] = [
  {
    id: 'SAMPLE_COMPLIANT_BISCUITS',
    name: 'Britannia Good Day Butter Cookies (120g)',
    category: 'Bakery & FMCG',
    summary: 'Fully compliant retail pack meeting all Rule 6 declarations, USP formula, and Rule 7 font standards.',
    expectedOutcome: 'COMPLIANT',
    barcode: '8901063012011',
    rawText: `BRITANNIA GOOD DAY BUTTER COOKIES
Mfd by: Britannia Industries Limited
Plot No. 1, Sector 2, Industrial Area, Bidadi, Bengaluru, Karnataka - 562109
Net Quantity: 120 g
MRP: Rs. 30.00 (incl. of all taxes)
USP: Rs. 0.25 / g
Country of Origin: India
PKD: 08/2024
Customer Care: 18004254449
Email: feedback@britindia.com
Barcode: 8901063012011`,
    calibration: {
      barcodeWidthPx: 380,
      barcodeHeightPx: 260,
      mmPerPixel: 0.098,
      pdpAreaCm2: 120,
      measuredNumeralHeightMm: 3.1,
      measuredNumeralWidthMm: 1.5,
      mandatedMinHeightMm: 2.5,
      isFontHeightCompliant: true,
      widthToHeightRatio: 0.48,
    },
    declarations: {
      mrp: 30.0,
      mrpRawText: 'MRP: Rs. 30.00 (incl. of all taxes)',
      hasInclusiveOfTaxes: true,
      netQuantityValue: 120,
      netQuantityUnit: 'g',
      netQuantityRawText: 'Net Quantity: 120 g',
      isStandardUnitSymbol: true,
      declaredUSP: 0.25,
      declaredUSPUnit: 'g',
      calculatedUSP: 0.25,
      uspDiscrepancyPercent: 0,
      manufacturerName: 'Britannia Industries Limited',
      manufacturerAddress: 'Plot No. 1, Sector 2, Industrial Area, Bidadi, Bengaluru, Karnataka - 562109',
      countryOfOrigin: 'India',
      manufacturingDate: '08/2024',
      consumerCarePhone: '18004254449',
      consumerCareEmail: 'feedback@britindia.com',
      barcode: '8901063012019',
      isDualPriceOrStickerDetected: false,
    },
  },
  {
    id: 'SAMPLE_VIOLATION_POTATO_CHIPS',
    name: 'Spicy Crunch Potato Chips (Common Violations)',
    category: 'Snacks & Packaged Food',
    summary: 'Violations: Missing Unit Sale Price (Rule 6(11)), Prohibited unit symbol "gms" (Rule 12), and font size 1.2mm below Table-I mandate (2.5mm).',
    expectedOutcome: 'NON_COMPLIANT',
    barcode: '8908823192011',
    rawText: `SPICY CRUNCH POTATO CHIPS
Manufactured by: Sunrise Snack Foods Pvt Ltd, GIDC Vatva, Ahmedabad, Gujarat
Net Wt: 85 gms
MRP Rs. 20.00 incl. of all taxes
PKD 06/2024
Country of Origin: India
Helpline: 9876543210
Email: support@sunrisesnacks.in`,
    calibration: {
      barcodeWidthPx: 370,
      barcodeHeightPx: 250,
      mmPerPixel: 0.101,
      pdpAreaCm2: 180,
      measuredNumeralHeightMm: 1.2, // DEFICIENT (Rule 7 requires 2.5mm for area 180cm2)
      measuredNumeralWidthMm: 0.5,
      mandatedMinHeightMm: 2.5,
      isFontHeightCompliant: false,
      widthToHeightRatio: 0.42,
    },
    declarations: {
      mrp: 20.0,
      mrpRawText: 'MRP Rs. 20.00 incl. of all taxes',
      hasInclusiveOfTaxes: true,
      netQuantityValue: 85,
      netQuantityUnit: 'gms', // Non-standard prohibited unit!
      netQuantityRawText: 'Net Wt: 85 gms',
      isStandardUnitSymbol: false,
      declaredUSP: undefined, // Missing USP!
      calculatedUSP: 0.24,
      manufacturerName: 'Sunrise Snack Foods Pvt Ltd',
      manufacturerAddress: 'GIDC Vatva, Ahmedabad, Gujarat',
      countryOfOrigin: 'India',
      manufacturingDate: '06/2024',
      consumerCarePhone: '9876543210',
      consumerCareEmail: 'support@sunrisesnacks.in',
      barcode: '8908823192011',
      isDualPriceOrStickerDetected: false,
    },
  },
  {
    id: 'SAMPLE_TAMPERED_STICKER_COSMETIC',
    name: 'Glow Radiance Night Cream (Section 36 Tampering)',
    category: 'Personal Care & Cosmetics',
    summary: 'Criminal Violation: Secondary adhesive sticker overlaying original MRP ₹ 149.00 with revised ₹ 220.00 (Section 36(2) offence).',
    expectedOutcome: 'NON_COMPLIANT',
    barcode: '8909182390124',
    rawText: `GLOW RADIANCE NIGHT CREAM
Mfd by: Vedic Herbals Lab, Baddi, Solan, Himachal Pradesh
Net Content: 50 g
Original Printed MRP: Rs. 149.00
STICKER OVER-PASTED: Revised MRP Rs. 220.00 (incl of taxes)
USP: Rs. 4.40 / g
Country of Origin: India
Helpline: care@vedicherbals.com`,
    calibration: {
      barcodeWidthPx: 385,
      barcodeHeightPx: 255,
      mmPerPixel: 0.097,
      pdpAreaCm2: 60,
      measuredNumeralHeightMm: 1.8,
      measuredNumeralWidthMm: 0.9,
      mandatedMinHeightMm: 1.5,
      isFontHeightCompliant: true,
      widthToHeightRatio: 0.5,
    },
    declarations: {
      mrp: 220.0,
      mrpRawText: 'Revised MRP Rs. 220.00 (incl of taxes)',
      hasInclusiveOfTaxes: true,
      netQuantityValue: 50,
      netQuantityUnit: 'g',
      netQuantityRawText: 'Net Content: 50 g',
      isStandardUnitSymbol: true,
      declaredUSP: 4.4,
      declaredUSPUnit: 'g',
      calculatedUSP: 4.4,
      manufacturerName: 'Vedic Herbals Lab',
      manufacturerAddress: 'Baddi, Solan, Himachal Pradesh',
      countryOfOrigin: 'India',
      consumerCareEmail: 'care@vedicherbals.com',
      barcode: '8909182390124',
      isDualPriceOrStickerDetected: true, // TAMPERING!
    },
  },
  {
    id: 'SAMPLE_IMPORTED_ELECTRONICS_MISSING_ORIGIN',
    name: 'FastCharge Pro Type-C Cable (Imported Without Declarations)',
    category: 'Electronics & Accessories',
    summary: 'Violations: Missing Country of Origin (mandatory for imports), missing consumer care phone, missing tax inclusion phrase.',
    expectedOutcome: 'NON_COMPLIANT',
    barcode: '6901234567890',
    rawText: `FASTCHARGE PRO TYPE-C NYLON BRAIDED CABLE
Imported and Marketed by: Apex Retail Ventures Ltd, Andheri East, Mumbai
Net Quantity: 1 U
MRP: Rs. 399.00
PKD: 01/2024
Customer feedback: contact@apexventures.in`,
    calibration: {
      barcodeWidthPx: 360,
      barcodeHeightPx: 240,
      mmPerPixel: 0.103,
      pdpAreaCm2: 95,
      measuredNumeralHeightMm: 1.1, // Deficient (Area 95 requires 1.5mm)
      measuredNumeralWidthMm: 0.4,
      mandatedMinHeightMm: 1.5,
      isFontHeightCompliant: false,
      widthToHeightRatio: 0.36,
    },
    declarations: {
      mrp: 399.0,
      mrpRawText: 'MRP: Rs. 399.00',
      hasInclusiveOfTaxes: false, // Missing tax clause!
      netQuantityValue: 1,
      netQuantityUnit: 'U',
      netQuantityRawText: 'Net Quantity: 1 U',
      isStandardUnitSymbol: true,
      declaredUSP: undefined,
      manufacturerName: 'Apex Retail Ventures Ltd',
      manufacturerAddress: 'Andheri East, Mumbai',
      countryOfOrigin: undefined, // Missing Country of Origin!
      manufacturingDate: '01/2024',
      consumerCareEmail: 'contact@apexventures.in',
      barcode: '6901234567890',
      isDualPriceOrStickerDetected: false,
    },
  },
];
