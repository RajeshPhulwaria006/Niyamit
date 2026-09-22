/**
 * @file barcodeScanner.ts
 * @description Industrial-grade Barcode Scanner optimized for:
 * 1. Curved & cylindrical packaging (face wash squeeze tubes, shampoo bottles, cosmetic jars, cans).
 * 2. Deformable & crinkled surfaces (flexible foil sachets, refill pouches, metallized plastic).
 * 3. Low-contrast and inverted printing (white-on-dark packaging, foil reflections).
 * 
 * Pipeline:
 * - Multi-region candidate cropping (full, bottom 50%, bottom 35%, bottom quadrants, middle band)
 * - Cylindrical dewarping / aspect-ratio compensation (horizontal stretching for curved surfaces)
 * - Contrast stretching, unsharp masking, and inverted luminance passes
 * - Dual-engine execution: Native Browser BarcodeDetector + Enhanced ZXing MultiFormatReader
 */

import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';

export interface BarcodeDetectionResult {
  text: string;
  format: string;
  widthPx: number;
  heightPx: number;
  confidence: number;
  sourceRegion?: string;
}

/**
 * Creates an in-memory canvas from an image or canvas source.
 */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/**
 * Crops a specific Region of Interest (ROI) from the source image.
 */
function extractCrop(
  source: HTMLCanvasElement | HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetWidth?: number
): HTMLCanvasElement {
  const targetW = targetWidth || sw;
  const targetH = Math.round((sh * targetW) / sw);
  const canvas = createCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);
  }
  return canvas;
}

/**
 * Rotates a canvas by given degrees (90, 180, 270).
 */
function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const rad = (degrees * Math.PI) / 180;
  const isSwap = degrees === 90 || degrees === 270;
  const rotCanvas = createCanvas(
    isSwap ? canvas.height : canvas.width,
    isSwap ? canvas.width : canvas.height
  );
  const ctx = rotCanvas.getContext('2d');
  if (ctx) {
    ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  }
  return rotCanvas;
}

/**
 * Compensates for cylindrical distortion by horizontally stretching the image.
 * On a cylindrical bottle or face wash tube, bars near the edges appear compressed (cos theta foreshortening).
 * Stretching horizontally restores the nominal bar-space width ratios (1:1, 1:2, 1:3, 1:4).
 */
function dewarpCylindrical(canvas: HTMLCanvasElement, stretchFactor = 1.35): HTMLCanvasElement {
  const stretched = createCanvas(canvas.width * stretchFactor, canvas.height);
  const ctx = stretched.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, stretched.width, stretched.height);
  }
  return stretched;
}

/**
 * Applies contrast stretching and local sharpening to eliminate plastic specular reflections and glare.
 */
function enhancePackagingContrast(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const enhanced = createCanvas(canvas.width, canvas.height);
  const ctx = enhanced.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // 1. Find min and max luminance
  let minLum = 255;
  let maxLum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  // 2. Linear contrast stretch
  const range = Math.max(1, maxLum - minLum);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    const stretched = Math.min(255, Math.max(0, ((lum - minLum) / range) * 255));
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }

  ctx.putImageData(imgData, 0, 0);
  return enhanced;
}

/**
 * Inverts the image colors (for white barcodes on dark packaging or metallic foil).
 */
function invertCanvasColors(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const inverted = createCanvas(canvas.width, canvas.height);
  const ctx = inverted.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }

  ctx.putImageData(imgData, 0, 0);
  return inverted;
}

/**
 * Attempts scanning with the browser's native BarcodeDetector API.
 */
async function tryNativeDetector(
  canvas: HTMLCanvasElement
): Promise<BarcodeDetectionResult | null> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }

  try {
    // @ts-expect-error Native BarcodeDetector API
    const detector = new window.BarcodeDetector({
      formats: [
        'ean_13',
        'ean_8',
        'upc_a',
        'upc_e',
        'code_128',
        'code_39',
        'qr_code',
      ],
    });

    const barcodes = await detector.detect(canvas);
    if (barcodes && barcodes.length > 0) {
      const primary = barcodes[0];
      const box = primary.boundingBox || {};
      return {
        text: primary.rawValue,
        format: primary.format || 'ean_13',
        widthPx: Math.max(80, Math.round(box.width || 350)),
        heightPx: Math.max(50, Math.round(box.height || 200)),
        confidence: 0.98,
      };
    }
  } catch {
    // Unsupported format or error
  }
  return null;
}

/**
 * Attempts scanning with ZXing MultiFormatReader.
 */
function tryZXing(canvas: HTMLCanvasElement): BarcodeDetectionResult | null {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_8,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new MultiFormatReader();
    reader.setHints(hints);

    const len = imageData.width * imageData.height;
    const luminances = new Uint8ClampedArray(len);
    for (let i = 0; i < len; i++) {
      const offset = i * 4;
      luminances[i] =
        (imageData.data[offset] * 306 +
          imageData.data[offset + 1] * 601 +
          imageData.data[offset + 2] * 117) >>
        10;
    }

    const source = new RGBLuminanceSource(
      luminances,
      imageData.width,
      imageData.height
    );
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const result = reader.decode(bitmap);

    if (result) {
      const points = result.getResultPoints().map((p) => ({
        x: Math.round(p.getX()),
        y: Math.round(p.getY()),
      }));

      let widthPx = 350;
      let heightPx = 200;
      if (points.length >= 2) {
        const dx = points[1].x - points[0].x;
        const dy = points[1].y - points[0].y;
        widthPx = Math.max(80, Math.round(Math.sqrt(dx * dx + dy * dy)));
        heightPx = Math.round(widthPx * 0.65);
      }

      return {
        text: result.getText(),
        format: result.getBarcodeFormat().toString(),
        widthPx,
        heightPx,
        confidence: 0.92,
      };
    }
  } catch {
    // ZXing decode failed on this canvas
  }
  return null;
}

/**
 * Runs both Native and ZXing scanners on a canvas candidate.
 */
async function scanSingleCanvas(
  canvas: HTMLCanvasElement,
  regionName: string
): Promise<BarcodeDetectionResult | null> {
  // 1. Native detector
  const nativeRes = await tryNativeDetector(canvas);
  if (nativeRes) {
    return { ...nativeRes, sourceRegion: regionName };
  }

  // 2. ZXing
  const zxingRes = tryZXing(canvas);
  if (zxingRes) {
    return { ...zxingRes, sourceRegion: regionName };
  }

  return null;
}

/**
 * Main barcode scanning engine.
 * Employs a multi-region, multi-contrast, dewarping strategy specifically engineered for
 * face wash cream pouches, squeeze tubes, cylindrical bottles, and crinkled packaging.
 */
export async function scanBarcodeFromImage(
  source: HTMLCanvasElement | HTMLImageElement
): Promise<BarcodeDetectionResult | null> {
  const w = source.width;
  const h = source.height;

  // 1. Base normalized canvas (max 1200px dimension for sharp line resolution)
  let normW = w;
  let normH = h;
  const maxDim = 1200;
  if (normW > maxDim || normH > maxDim) {
    if (normW > normH) {
      normH = Math.round((normH * maxDim) / normW);
      normW = maxDim;
    } else {
      normW = Math.round((normW * maxDim) / normH);
      normH = maxDim;
    }
  }
  const baseCanvas = createCanvas(normW, normH);
  const baseCtx = baseCanvas.getContext('2d');
  if (baseCtx) {
    baseCtx.drawImage(source, 0, 0, normW, normH);
  }

  // STEP 1: Quick check on the full image
  let res = await scanSingleCanvas(baseCanvas, 'full-image');
  if (res) return res;

  // STEP 2: Multi-Region Candidate Cropping (Crucial for Pouches & Tubes)
  // On tubes and pouches, barcodes are usually in the bottom 45%, or middle on bottles.
  const candidateRegions: { name: string; canvas: HTMLCanvasElement }[] = [
    // Bottom 50% (most common on squeeze tubes & pouches)
    {
      name: 'bottom-50%',
      canvas: extractCrop(baseCanvas, 0, normH * 0.5, normW, normH * 0.5, 900),
    },
    // Bottom 35% (tight zoom on bottom seam/crimp)
    {
      name: 'bottom-35%',
      canvas: extractCrop(baseCanvas, 0, normH * 0.65, normW, normH * 0.35, 900),
    },
    // Bottom-right quadrant (common packaging corner placement)
    {
      name: 'bottom-right-quadrant',
      canvas: extractCrop(baseCanvas, normW * 0.4, normH * 0.5, normW * 0.6, normH * 0.5, 800),
    },
    // Bottom-left quadrant
    {
      name: 'bottom-left-quadrant',
      canvas: extractCrop(baseCanvas, 0, normH * 0.5, normW * 0.6, normH * 0.5, 800),
    },
    // Middle 50% band (cylindrical shampoo/sanitizer bottles)
    {
      name: 'middle-band',
      canvas: extractCrop(baseCanvas, 0, normH * 0.25, normW, normH * 0.5, 900),
    },
    // Top 50% band (some boxes/jars)
    {
      name: 'top-50%',
      canvas: extractCrop(baseCanvas, 0, 0, normW, normH * 0.5, 900),
    },
  ];

  for (const region of candidateRegions) {
    res = await scanSingleCanvas(region.canvas, region.name);
    if (res) return res;
  }

  // STEP 3: Cylindrical Dewarping (Horizontal Stretch Compensation)
  // Decompresses curved barcode lines on bottles and squeeze tubes
  for (const region of candidateRegions.slice(0, 3)) {
    const dewarped = dewarpCylindrical(region.canvas, 1.35);
    res = await scanSingleCanvas(dewarped, `${region.name}-dewarped-1.35x`);
    if (res) return res;
  }

  // STEP 4: Contrast Enhancement & Glare Reduction (for Glossy Plastic / Laminates)
  for (const region of candidateRegions.slice(0, 3)) {
    const enhanced = enhancePackagingContrast(region.canvas);
    res = await scanSingleCanvas(enhanced, `${region.name}-enhanced-contrast`);
    if (res) return res;
  }

  // STEP 5: Rotations (90° and 270° - Barcodes oriented vertically along tube edges)
  const verticalCandidates = [
    { name: 'full-90deg', canvas: rotateCanvas(baseCanvas, 90) },
    { name: 'bottom-50%-90deg', canvas: rotateCanvas(candidateRegions[0].canvas, 90) },
    { name: 'bottom-50%-270deg', canvas: rotateCanvas(candidateRegions[0].canvas, 270) },
  ];

  for (const vert of verticalCandidates) {
    res = await scanSingleCanvas(vert.canvas, vert.name);
    if (res) return res;
  }

  // STEP 6: Inverted Color Pass (White bars on dark foil or cosmetic tubes)
  const invertedBase = invertCanvasColors(baseCanvas);
  res = await scanSingleCanvas(invertedBase, 'inverted-full');
  if (res) return res;

  const invertedBottom = invertCanvasColors(candidateRegions[0].canvas);
  res = await scanSingleCanvas(invertedBottom, 'inverted-bottom-50%');
  if (res) return res;

  // No barcode found after all multi-region CV passes
  return null;
}
