/**
 * @file lmpc.ts
 * @description Core TypeScript type definitions for Legal Metrology 
 * (Packaged Commodities) Rules, 2011 compliance system.
 * Contains data models for physical measurements, mandatory declarations,
 * rule checks, and statutory reports.
 */

/**
 * Standard SI units permitted under Rule 12 of 
 * Legal Metrology (Packaged Commodities) Rules, 2011.
 * Non-standard variations like 'gms', 'kilos', 'ltr', 'cc' are strictly prohibited by law.
 */
export type StandardLegalUnit = 'g' | 'kg' | 'ml' | 'l' | 'm' | 'cm' | 'mm' | 'N' | 'U';

/**
 * Status of an individual statutory compliance check.
 */
export type ComplianceStatus = 'PASS' | 'FAIL' | 'WARNING';

/**
 * Status of the overall package inspection audit.
 */
export type OverallInspectionStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'INCOMPLETE_DECLARATION';

/**
 * Physical geometry and optical scale metrics derived from the package image.
 * Uses the standardized GS1 EAN-13 barcode dimensions (37.29mm nominal width) 
 * as an optical fiducial.
 */
export interface PhysicalCalibrationMetrics {
    /** Width of detected barcode in pixels */
    barcodeWidthPx: number;
    /** Height of detected barcode in pixels */
    barcodeHeightPx: number;
    /** Optical scale factor in millimeters per pixel (e.g. 0.082 mm/px) */
    mmPerPixel: number;
    /** Estimated area of the Principal Display Panel (PDP) in square centimeters */
    pdpAreaCm2: number;
    /** Measured height of numerals in millimeters */
    measuredNumeralHeightMm: number;
    /** Measured width of numerals in millimeters */
    measuredNumeralWidthMm: number;
    /** Minimum mandated numeral height in millimeters according to Rule 7 Table-I */
    mandatedMinHeightMm: number;
    /** Whether the font size satisfies Rule 7 Table-I */
    isFontHeightCompliant: boolean;
    /** Ratio of width to height (must be >= 1/3 per Rule 7) */
    widthToHeightRatio: number;
}

/**
 * Mandatory declarations extracted from the physical packaging label (Rule 6).
 */
export interface ExtractedPackageDeclarations {
    /** Maximum Retail Price in INR (Rule 6(1)(e)) */
    mrp?: number;
    /** Raw text string corresponding to the MRP declaration */
    mrpRawText?: string;
    /** Whether the phrase 'inclusive of all taxes' or 'incl. of all taxes' is present */
    hasInclusiveOfTaxes: boolean;
    /** Net quantity value (e.g. 250) */
    netQuantityValue?: number;
    /** Net quantity unit string (e.g. 'g', 'ml', 'kg') */
    netQuantityUnit?: string;
    /** Raw string detected for net quantity */
    netQuantityRawText?: string;
    /** Whether the unit symbol strictly matches Rule 12 standard SI symbols */
    isStandardUnitSymbol: boolean;
    /** Unit Sale Price declared on the package (Rule 6(11)) */
    declaredUSP?: number;
    /** Declared USP unit (e.g. 'per g', 'per kg', 'per ml') */
    declaredUSPUnit?: string;
    /** Calculated theoretical USP based on MRP / Net Quantity */
    calculatedUSP?: number;
    /** Discrepancy percentage between declared and calculated USP */
    uspDiscrepancyPercent?: number;
    /** Name of manufacturer, packer, or importer (Rule 6(1)(a)) */
    manufacturerName?: string;
    /** Complete physical address of manufacturer/packer/importer */
    manufacturerAddress?: string;
    /** Country of origin, particularly mandatory for imported and e-commerce commodities (Rule 6(1)(b) & 2026 amendment) */
    countryOfOrigin?: string;
    /** Month and year of manufacture, packing, or import (Rule 6(1)(d)) */
    manufacturingDate?: string;
    /** Best before / Expiry date if applicable */
    expiryDate?: string;
    /** Consumer care contact telephone / mobile number (Rule 6(1)(f)) */
    consumerCarePhone?: string;
    /** Consumer care contact email address (Rule 6(1)(f)) */
    consumerCareEmail?: string;
    /** Scanned 13-digit EAN/UPC barcode number */
    barcode?: string;
    /** Whether any sticker / price alteration overlay was detected (Section 36) */
    isDualPriceOrStickerDetected: boolean;
}

/**
 * Result of evaluating one statutory rule under Legal Metrology laws.
 */
export interface RuleEvaluationResult {
    /** Internal unique identifier for the rule check (e.g. 'RULE_6_1_E_MRP') */
    id: string;
    /** Human-readable title of the legal rule */
    title: string;
    /** Exact section / rule reference in statute (e.g. 'Rule 6(1)(e), LMPC Rules 2011') */
    statutoryReference: string;
    /** Pass, Fail, or Warning status */
    status: ComplianceStatus;
    /** Explanation of observed status and legal significance */
    explanation: string;
    /** What was detected on the package */
    observedValue: string;
    /** What is required by the statutory provision */
    mandatedRequirement: string;
    /** Applicable penalty section under Legal Metrology Act, 2009 (e.g. 'Section 36(1)') */
    penaltyClause?: string;
    /** Severity rating for enforcement priority */
    severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
}

/**
 * GS1 India DataKart master registry record for authenticating products.
 */
export interface GS1ProductRecord {
    /** 13-digit Global Trade Item Number (EAN-13) */
    gtin: string;
    /** Registered brand name */
    brandName: string;
    /** Full product title */
    productName: string;
    /** Registered manufacturer / company name */
    companyName: string;
    /** Category of product (Food, Cosmetic, Chemical, Electronics) */
    category: string;
    /** Registered net weight / volume */
    registeredNetQuantity: string;
    /** Registered maximum retail price in INR */
    registeredMRP: number;
    /** Status of company registration in legal metrology portal */
    isLMPCRegistered: boolean;
}

/**
 * Complete inspection dossier generated for an enforcement officer.
 * Suitable for issuing statutory notice (Form VIII Panchnama / 
 * Seizure Memo under Section 15).
 */
export interface InspectionDossier {
    /** Unique audit reference number */
    auditId: string;
    /** UTC timestamp of inspection */
    timestamp: string;
    /** Inspector identity / badge number */
    inspectorId: string;
    /** Physical premises or URL where inspection occurred */
    inspectionLocation: string;
    /** GPS coordinates of field officer */
    gpsCoordinates?: {
        latitude: number;
        longitude: number;
    };
    /** Base64 or URL of original package photograph */
    imageUrl?: string;
    /** Overall compliance outcome */
    overallStatus: OverallInspectionStatus;
    /** Summary of critical violations detected */
    criticalViolationsCount: number;
    /** Complete list of individual rule check results */
    evaluations: RuleEvaluationResult[];
    /** Optical and font height calibration data */
    calibration?: PhysicalCalibrationMetrics;
    /** Extracted structured packaging text */
    declarations: ExtractedPackageDeclarations;
    /** Matched GS1 DataKart registry record (if barcode was detected) */
    gs1Record?: GS1ProductRecord;
    /** Pre-formulated legal seizure / compounding notice text */
    legalNoticeDraft?: string;
}
