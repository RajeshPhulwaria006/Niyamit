/**
 * @file calibration.ts
 * @description Optical calibration engine implementing physical dimension measurement for Legal Metrology packaging.
 * Resolves the fundamental computer vision challenge of converting 2D digital image pixels to physical millimeters
 * using the internationally standardized GS1 EAN-13 barcode as a physical fiducial reference.
 */

import { PhysicalCalibrationMetrics } from '@/types/lmpc';

/**
 * Standard nominal physical dimensions of an EAN-13 barcode as specified by GS1 specifications.
 * At 100% nominal magnification, the barcode symbol (including quiet zones) measures:
 * Nominal Width: 37.29 mm
 * Nominal Height: 25.93 mm
 */
export const GS1_EAN13_NOMINAL_WIDTH_MM = 37.29;
export const GS1_EAN13_NOMINAL_HEIGHT_MM = 25.93;

/**
 * Rule 7 Table-I minimum numeral height thresholds in millimeters based on Principal Display Panel (PDP) area.
 * As prescribed in Legal Metrology (Packaged Commodities) Rules, 2011.
 *
 * | Area of PDP (cm²) | Minimum Height (mm) |
 * | :---              | :---                |
 * | A <= 50           | 1.0 mm              |
 * | 50 < A <= 100     | 1.5 mm              |
 * | 100 < A <= 500    | 2.5 mm              |
 * | A > 500           | 4.0 mm              |
 */
export const RULE_7_TABLE_I_THRESHOLDS = [
  { maxAreaCm2: 50, minHeightMm: 1.0 },
  { maxAreaCm2: 100, minHeightMm: 1.5 },
  { maxAreaCm2: 500, minHeightMm: 2.5 },
  { maxAreaCm2: Infinity, minHeightMm: 4.0 },
] as const;

/**
 * Calculates the statutory minimum numeral height required for a given Principal Display Panel area.
 *
 * @param pdpAreaCm2 The total surface area of the Principal Display Panel in square centimeters.
 * @returns The mandated minimum numeral height in millimeters under Rule 7 Table-I.
 */
export function getMandatedMinNumeralHeight(pdpAreaCm2: number): number {
  if (pdpAreaCm2 <= 0) return 1.0;
  for (const tier of RULE_7_TABLE_I_THRESHOLDS) {
    if (pdpAreaCm2 <= tier.maxAreaCm2) {
      return tier.minHeightMm;
    }
  }
  return 4.0;
}

/**
 * Performs optical calibration by converting pixel dimensions to physical millimeters using the detected barcode bounding box.
 *
 * @param barcodeWidthPx Width of the barcode detected in the image in pixels.
 * @param barcodeHeightPx Height of the barcode detected in the image in pixels.
 * @param numeralHeightPx Measured height of declaration characters/numerals in pixels.
 * @param numeralWidthPx Measured width of declaration characters/numerals in pixels.
 * @param imageWidthPx Total width of the captured package image in pixels.
 * @param imageHeightPx Total height of the captured package image in pixels.
 * @param customPdpAreaCm2 Optional estimated PDP area in cm²; if omitted, estimated from image proportions.
 * @returns Complete physical calibration and Rule 7 compliance evaluation metrics.
 */
export function calibratePhysicalMetrics(
  barcodeWidthPx: number,
  barcodeHeightPx: number,
  numeralHeightPx: number,
  numeralWidthPx: number,
  imageWidthPx: number = 1200,
  imageHeightPx: number = 1600,
  customPdpAreaCm2?: number
): PhysicalCalibrationMetrics {
  // Guard against division by zero or invalid negative numbers
  const safeBarcodeWidth = Math.max(10, barcodeWidthPx);
  const safeBarcodeHeight = Math.max(10, barcodeHeightPx);

  // Derive optical scale: Millimeters per pixel on the package plane
  const mmPerPixel = GS1_EAN13_NOMINAL_WIDTH_MM / safeBarcodeWidth;

  // Measure physical dimensions of the text numerals
  const measuredNumeralHeightMm = Number((numeralHeightPx * mmPerPixel).toFixed(2));
  const measuredNumeralWidthMm = Number((numeralWidthPx * mmPerPixel).toFixed(2));

  // Determine Principal Display Panel area
  let pdpAreaCm2 = 0;
  if (customPdpAreaCm2 && customPdpAreaCm2 > 0) {
    pdpAreaCm2 = customPdpAreaCm2;
  } else {
    // Standard estimation: compute total image physical area in cm²
    const imgWidthMm = imageWidthPx * mmPerPixel;
    const imgHeightMm = imageHeightPx * mmPerPixel;
    // Assuming package face occupies ~75% of camera view frame
    const estimatedFaceAreaCm2 = (imgWidthMm * imgHeightMm * 0.75) / 100;
    pdpAreaCm2 = Number(Math.max(20, Math.min(800, estimatedFaceAreaCm2)).toFixed(1));
  }

  // Lookup minimum mandated height per Rule 7 Table-I
  const mandatedMinHeightMm = getMandatedMinNumeralHeight(pdpAreaCm2);

  // Evaluate Rule 7 height constraint
  const isFontHeightCompliant = measuredNumeralHeightMm >= mandatedMinHeightMm;

  // Evaluate Rule 7 width constraint (width must not be less than 1/3 height, except for numeral '1' and letter 'I')
  const widthToHeightRatio = measuredNumeralHeightMm > 0
    ? Number((measuredNumeralWidthMm / measuredNumeralHeightMm).toFixed(2))
    : 0;

  return {
    barcodeWidthPx: safeBarcodeWidth,
    barcodeHeightPx: safeBarcodeHeight,
    mmPerPixel: Number(mmPerPixel.toFixed(4)),
    pdpAreaCm2,
    measuredNumeralHeightMm,
    measuredNumeralWidthMm,
    mandatedMinHeightMm,
    isFontHeightCompliant,
    widthToHeightRatio,
  };
}
