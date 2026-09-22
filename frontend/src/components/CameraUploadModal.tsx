'use client';

import React, { useState, useRef } from 'react';
import {
  Camera,
  RefreshCw,
  X,
  Barcode,
  FileText,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { scanBarcodeFromImage } from '@/lib/barcodeScanner';
import { parsePackagingDeclarations } from '@/lib/engine/ocr';
import { ExtractedPackageDeclarations } from '@/types/lmpc';

interface CameraUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitAudit: (payload: {
    rawText?: string;
    barcode?: string;
    imageUrl?: string;
    customDeclarations?: ExtractedPackageDeclarations;
    customCalibration?: {
      barcodeWidthPx: number;
      barcodeHeightPx: number;
      numeralHeightPx: number;
      numeralWidthPx: number;
      pdpAreaCm2: number;
    };
  }) => void;
  isLoading: boolean;
}

export const CameraUploadModal: React.FC<CameraUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmitAudit,
  isLoading,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [processingStage, setProcessingStage] = useState<
    'IDLE' | 'SCANNING_BARCODE' | 'EXTRACTING_OCR' | 'PARSING' | 'READY'
  >('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Extracted and officer-editable fields
  const [barcode, setBarcode] = useState<string>('');
  const [barcodeWidthPx, setBarcodeWidthPx] = useState<number>(380);
  const [barcodeSourceRegion, setBarcodeSourceRegion] = useState<string>('');
  const [numeralHeightPx, setNumeralHeightPx] = useState<number>(28);
  const [mrp, setMrp] = useState<string>('');
  const [hasInclusiveOfTaxes, setHasInclusiveOfTaxes] = useState<boolean>(true);
  const [netQuantityValue, setNetQuantityValue] = useState<string>('');
  const [netQuantityUnit, setNetQuantityUnit] = useState<string>('ml');
  const [declaredUSP, setDeclaredUSP] = useState<string>('');
  const [declaredUSPUnit, setDeclaredUSPUnit] = useState<string>('ml');
  const [manufacturerName, setManufacturerName] = useState<string>('');
  const [manufacturerAddress, setManufacturerAddress] = useState<string>('');
  const [countryOfOrigin, setCountryOfOrigin] = useState<string>('India');
  const [manufacturingDate, setManufacturingDate] = useState<string>('');
  const [consumerCarePhone, setConsumerCarePhone] = useState<string>('');
  const [consumerCareEmail, setConsumerCareEmail] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [showRawText, setShowRawText] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  /**
   * Compresses photo and applies initial normalization on an offscreen canvas.
   */
  const compressImage = (file: File): Promise<{ dataUrl: string; imgElement: HTMLImageElement }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const normImg = new Image();
            normImg.onload = () => resolve({ dataUrl, imgElement: normImg });
            normImg.src = dataUrl;
          } else {
            resolve({ dataUrl: e.target?.result as string, imgElement: img });
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Preprocesses image specifically for Tesseract OCR:
   * 1. Crops the central packaging region (18% to 82% width, 4% to 86% height)
   *    to discard patterned bedsheets, tablecloths, or countertop backgrounds.
   * 2. Contrast stretching + Grayscale conversion to handle colored packaging & glare.
   */
  const preprocessForOCR = (img: HTMLImageElement): string => {
    const sx = Math.round(img.width * 0.18);
    const sy = Math.round(img.height * 0.04);
    const sw = Math.round(img.width * 0.64);
    const sh = Math.round(img.height * 0.82);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(10, sw);
    canvas.height = Math.max(10, sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) return img.src;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    let minLum = 255;
    let maxLum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const range = Math.max(1, maxLum - minLum);
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      const val = Math.min(255, Math.max(0, ((lum - minLum) / range) * 255));
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  /**
   * Automated Image Ingestion Pipeline:
   * Runs Barcode Scanner (with cylindrical dewarping) -> Runs OCR -> Parses Statutory Declarations
   */
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setProcessingStage('SCANNING_BARCODE');
    setStatusMessage('Optimizing image & scanning barcode (with curved pouch dewarping)...');

    try {
      const { dataUrl, imgElement } = await compressImage(file);
      const updatedImages = [...capturedImages, dataUrl];
      setCapturedImages(updatedImages);
      setImagePreview(dataUrl);

      // -------------------------------------------------------------
      // STAGE 1: Barcode Detection (Multi-region + Dewarping)
      // -------------------------------------------------------------
      let detectedBc = '';
      let detectedW = 380;
      let detectedRegion = '';

      try {
        const bcResult = await scanBarcodeFromImage(imgElement);
        if (bcResult && bcResult.text) {
          detectedBc = bcResult.text;
          detectedW = bcResult.widthPx;
          detectedRegion = bcResult.sourceRegion || 'detected';
          setBarcode(detectedBc);
          setBarcodeWidthPx(detectedW);
          setBarcodeSourceRegion(detectedRegion);
        }
      } catch (bcErr) {
        console.warn('Barcode scan step warning:', bcErr);
      }

      // -------------------------------------------------------------
      // STAGE 2: PaddleOCR Extraction (PP-OCRv4 ONNX DBNet + SVTR)
      // -------------------------------------------------------------
      setProcessingStage('EXTRACTING_OCR');
      setStatusMessage(
        updatedImages.length > 1
          ? `Aggregating ${updatedImages.length} packaging angles with PaddleOCR...`
          : 'Extracting packaging declarations with PaddleOCR (PP-OCRv4)...'
      );

      let extractedOcrText = '';
      try {
        const ocrPayload =
          updatedImages.length > 1
            ? { images: updatedImages, barcode: detectedBc || barcode || undefined }
            : { imageBase64: dataUrl, barcode: detectedBc || barcode || undefined };

        const ocrRes = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ocrPayload),
        });

        if (ocrRes.ok) {
          const ocrData = await ocrRes.json();
          extractedOcrText = ocrData.rawText || ocrData.raw_text || '';
          if (ocrData.detectedNumeralHeightPx) {
            setNumeralHeightPx(ocrData.detectedNumeralHeightPx);
          }
          const decl = ocrData.declarations;
          if (decl) {
            if (decl.barcode && !detectedBc) setBarcode(decl.barcode);
            if (decl.mrp !== undefined && decl.mrp !== null) setMrp(decl.mrp.toString());
            if (decl.hasInclusiveOfTaxes !== undefined) setHasInclusiveOfTaxes(decl.hasInclusiveOfTaxes);
            if (decl.netQuantityValue !== undefined && decl.netQuantityValue !== null) setNetQuantityValue(decl.netQuantityValue.toString());
            if (decl.netQuantityUnit) setNetQuantityUnit(decl.netQuantityUnit);
            const uspVal = (decl as any).declaredUSP ?? (decl as any).declaredUsp;
            if (uspVal !== undefined && uspVal !== null) setDeclaredUSP(uspVal.toString());
            const uspUnit = (decl as any).declaredUSPUnit ?? (decl as any).declaredUspUnit;
            if (uspUnit) setDeclaredUSPUnit(uspUnit);
            if (decl.manufacturerName) setManufacturerName(decl.manufacturerName);
            if ((decl as any).manufacturerAddress) setManufacturerAddress((decl as any).manufacturerAddress);
            if (decl.countryOfOrigin) setCountryOfOrigin(decl.countryOfOrigin);
            if (decl.manufacturingDate) setManufacturingDate(decl.manufacturingDate);
            if (decl.consumerCarePhone) setConsumerCarePhone(decl.consumerCarePhone);
            if (decl.consumerCareEmail) setConsumerCareEmail(decl.consumerCareEmail);
          }
        } else {
          const errPayload = await ocrRes.json().catch(() => ({}));
          console.warn('PaddleOCR response notice:', errPayload);
        }
      } catch (ocrErr) {
        console.warn('OCR network warning:', ocrErr);
      }

      setRawText(extractedOcrText);

      // Fallback local lexical parser if any field was omitted
      if (extractedOcrText) {
        try {
          const parsed = parsePackagingDeclarations(extractedOcrText, detectedBc);
          if (parsed.barcode && !barcode) setBarcode(parsed.barcode);
          if (parsed.mrp !== undefined && !mrp) setMrp(parsed.mrp.toString());
          if (parsed.netQuantityValue !== undefined && !netQuantityValue) setNetQuantityValue(parsed.netQuantityValue.toString());
          if (parsed.declaredUSP !== undefined && !declaredUSP) setDeclaredUSP(parsed.declaredUSP.toString());
          if (parsed.manufacturerName && !manufacturerName) setManufacturerName(parsed.manufacturerName);
          if (parsed.manufacturerAddress && !manufacturerAddress) setManufacturerAddress(parsed.manufacturerAddress);
        } catch {}
      }

      setProcessingStage('READY');
      setStatusMessage('✓ Optical processing complete. Review declarations below:');
    } catch (err) {
      console.error('Packaging ingestion failed:', err);
      setProcessingStage('READY');
      setErrorMessage('Image processing encountered an issue. You can enter or confirm values manually.');
    }
  };

  /**
   * Final submission to the LMPC statutory audit engine
   */
  const handleRunAudit = () => {
    const numMrp = mrp.trim() ? parseFloat(mrp.trim()) : undefined;
    const numNetQty = netQuantityValue.trim() ? parseFloat(netQuantityValue.trim()) : undefined;
    const cleanUnit = netQuantityUnit.trim() || undefined;
    const numUsp = declaredUSP.trim() ? parseFloat(declaredUSP.trim()) : undefined;

    // Check if at least some declaration is present
    if (!barcode.trim() && numMrp === undefined && numNetQty === undefined && !rawText.trim()) {
      setErrorMessage('Please capture a package photo or enter at least a barcode or MRP to audit.');
      return;
    }

    setErrorMessage('');

    const customDeclarations: ExtractedPackageDeclarations = {
      mrp: numMrp,
      mrpRawText: numMrp ? `MRP Rs. ${numMrp.toFixed(2)}` : undefined,
      hasInclusiveOfTaxes,
      netQuantityValue: numNetQty,
      netQuantityUnit: cleanUnit,
      netQuantityRawText: numNetQty ? `Net Qty: ${numNetQty} ${cleanUnit || ''}` : undefined,
      isStandardUnitSymbol: cleanUnit
        ? ['g', 'kg', 'ml', 'l', 'm', 'cm', 'mm', 'n', 'u'].includes(cleanUnit.toLowerCase())
        : false,
      declaredUSP: numUsp,
      declaredUSPUnit: declaredUSPUnit.trim() || undefined,
      manufacturerName: manufacturerName.trim() || undefined,
      manufacturerAddress: manufacturerAddress.trim() || undefined,
      countryOfOrigin: countryOfOrigin.trim() || undefined,
      manufacturingDate: manufacturingDate.trim() || undefined,
      consumerCarePhone: consumerCarePhone.trim() || undefined,
      consumerCareEmail: consumerCareEmail.trim() || undefined,
      barcode: barcode.trim() || undefined,
      isDualPriceOrStickerDetected: false,
    };

    onSubmitAudit({
      rawText: rawText.trim() || undefined,
      barcode: barcode.trim() || undefined,
      imageUrl: imagePreview || undefined,
      customDeclarations,
      customCalibration: {
        barcodeWidthPx: barcodeWidthPx || 380,
        barcodeHeightPx: Math.round((barcodeWidthPx || 380) * 0.7),
        numeralHeightPx: numeralHeightPx || 28,
        numeralWidthPx: Math.round((numeralHeightPx || 28) * 0.5),
        pdpAreaCm2: 120,
      },
    });
  };

  const isBusy =
    processingStage === 'SCANNING_BARCODE' ||
    processingStage === 'EXTRACTING_OCR' ||
    processingStage === 'PARSING';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Package Ingestion & Scanner
            </h3>
            <p className="text-xs text-slate-500">
              Auto-dewarps curved pouches, squeeze tubes & bottles.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Photo Capture & Upload Box */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50 relative overflow-hidden">
            {imagePreview ? (
              <div className="relative flex flex-col items-center space-y-2">
                <img
                  src={imagePreview}
                  alt="Captured package"
                  className="max-h-48 rounded-xl object-contain shadow-xs border border-slate-200"
                />

                {/* Multi-angle Thumbnails Row */}
                {capturedImages.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
                    {capturedImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImagePreview(img)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                          imagePreview === img ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-300 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} className="w-12 h-12 object-cover" />
                        <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white text-[9px] px-1 rounded-tl font-bold font-mono">
                          Angle {idx + 1}
                        </span>
                      </button>
                    ))}

                    <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-2.5 rounded-lg border border-dashed border-blue-400 font-bold flex items-center gap-1.5 transition-colors shadow-2xs">
                      <Plus className="w-3.5 h-3.5" /> + Snap Back Panel / Crimp
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleImageCapture}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setCapturedImages([]);
                        setImagePreview(null);
                        setRawText('');
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 flex items-center gap-1"
                      title="Clear all angles"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 sm:py-8">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>
                <label className="cursor-pointer">
                  <span className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 shadow-xs transition-colors">
                    <Camera className="w-4 h-4" /> Open Camera / Choose Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageCapture}
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-2">
                  Captures face wash tubes, pouches, cartons & bottles.
                </p>
              </div>
            )}
          </div>

          {/* Processing Status Banner */}
          {isBusy && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-3">
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-blue-600" />
              <div>
                <strong className="block font-semibold">
                  {processingStage === 'SCANNING_BARCODE' && 'Step 1/3: Dewarping & Scanning Barcode...'}
                  {processingStage === 'EXTRACTING_OCR' && 'Step 2/3: Recognizing Packaging Text (OCR)...'}
                  {processingStage === 'PARSING' && 'Step 3/3: Extracting Statutory Declarations...'}
                </strong>
                <span className="text-[11px] text-blue-600">{statusMessage}</span>
              </div>
            </div>
          )}

          {/* Curved Pouch & Cylinder Helpful Guidance */}
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[11px] flex items-start gap-2">
            <HelpCircle className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <div>
              <strong className="text-slate-800">For Curved Pouches & Squeeze Tubes:</strong>
              <p className="text-slate-500">
                Smooth or flatten the pouch slightly to avoid specular glare. If a crushed pouch prevents optical barcode detection, you can type the 13 digits below.
              </p>
            </div>
          </div>

          {/* Extracted Declarations Form (Officer Review & Edit) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Detected Packaging Declarations
              </span>
              <span className="text-[11px] text-slate-400">
                {barcode ? '✓ Barcode Linked' : 'Review & Confirm'}
              </span>
            </div>

            {/* Barcode Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-slate-500" />
                  EAN-13 Barcode Number:
                </label>
                {barcode ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-Detected ({barcodeSourceRegion})
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Not detected (Type or select below)
                  </span>
                )}
              </div>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 8904455005196"
                className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">1-Tap Barcode:</span>
                <button
                  type="button"
                  onClick={() => setBarcode('8904455005196')}
                  className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 transition-colors font-mono"
                >
                  Cipla Astaberry (8904455005196)
                </button>
                <button
                  type="button"
                  onClick={() => setBarcode('8901138810013')}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 transition-colors font-mono"
                >
                  Himalaya (8901138810013)
                </button>
                <button
                  type="button"
                  onClick={() => setBarcode('8901030733857')}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 transition-colors font-mono"
                >
                  Pond's (8901030733857)
                </button>
              </div>
            </div>

            {/* MRP & Tax Clause */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Maximum Retail Price (₹):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="e.g. 75.00"
                  className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tax Clause (Rule 6(1)(e)):
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasInclusiveOfTaxes}
                    onChange={(e) => setHasInclusiveOfTaxes(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                  />
                  <span>Incl. of all taxes</span>
                </label>
              </div>
            </div>

            {/* Net Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Net Quantity Value:
                </label>
                <input
                  type="number"
                  step="any"
                  value={netQuantityValue}
                  onChange={(e) => setNetQuantityValue(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Unit (Rule 12 Standard):
                </label>
                <select
                  value={netQuantityUnit}
                  onChange={(e) => setNetQuantityUnit(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ml">ml (Millilitre)</option>
                  <option value="g">g (Gram)</option>
                  <option value="kg">kg (Kilogram)</option>
                  <option value="l">l (Litre)</option>
                  <option value="N">N (Number of units)</option>
                  <option value="gms">gms (Non-standard / Violation)</option>
                  <option value="ltr">ltr (Non-standard / Violation)</option>
                </select>
              </div>
            </div>

            {/* Unit Sale Price (USP) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Declared USP (₹):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={declaredUSP}
                  onChange={(e) => setDeclaredUSP(e.target.value)}
                  placeholder="e.g. 0.75"
                  className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  USP Unit:
                </label>
                <input
                  type="text"
                  value={declaredUSPUnit}
                  onChange={(e) => setDeclaredUSPUnit(e.target.value)}
                  placeholder="e.g. ml or g"
                  className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Manufacturer & Country of Origin */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Manufacturer / Packer:
                </label>
                <input
                  type="text"
                  value={manufacturerName}
                  onChange={(e) => setManufacturerName(e.target.value)}
                  placeholder="e.g. Lotus Herbals Pvt. Ltd."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Country of Origin:
                </label>
                <input
                  type="text"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Manufacturer Registered Address */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Manufacturer Physical Address (Rule 6(1)(a)):
              </label>
              <input
                type="text"
                value={manufacturerAddress}
                onChange={(e) => setManufacturerAddress(e.target.value)}
                placeholder="e.g. Plot No. 80, EPIP, Phase-1, Jharmajri, Baddi, Distt. Solan (H.P.) - 173205"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Date & Helpline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Date of Mfg / PKD:
                </label>
                <input
                  type="text"
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                  placeholder="e.g. 07/2024"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Consumer Helpline:
                </label>
                <input
                  type="text"
                  value={consumerCarePhone}
                  onChange={(e) => setConsumerCarePhone(e.target.value)}
                  placeholder="e.g. 18002081930"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Raw OCR Text Accordion */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-600 flex items-center justify-between hover:bg-slate-100"
              >
                <span>Raw OCR Extracted Text ({rawText.length} characters)</span>
                {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showRawText && (
                <div className="p-3 border-t border-slate-200 bg-white">
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Raw OCR output appears here..."
                    className="w-full text-[11px] font-mono p-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleRunAudit}
            disabled={isLoading || isBusy}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Audit...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Run Statutory Audit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
