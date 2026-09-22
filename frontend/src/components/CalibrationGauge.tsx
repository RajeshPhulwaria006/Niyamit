import React from 'react';
import { PhysicalCalibrationMetrics } from '@/types/lmpc';
import { Ruler, Maximize2, Check, AlertTriangle, Barcode } from 'lucide-react';

interface CalibrationGaugeProps {
    calibration: PhysicalCalibrationMetrics;
}

export const CalibrationGauge: React.FC<CalibrationGaugeProps> = ({ calibration }) => {
    const percentOfMandate = Math.min(
        200,
        Math.round((calibration.measuredNumeralHeightMm / calibration.mandatedMinHeightMm) * 100)
    );

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                        <Ruler className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-900">
                            Rule 7 Optical Calibration & Font Height Metrics
                        </h3>
                        <p className="text-xs text-slate-500">
                            Fiducial: Standardized GS1 EAN-13 Barcode (Nominal Width: 37.29 mm)
                        </p>
                    </div>
                </div>

                {calibration.isFontHeightCompliant ? (
                    <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Table-I Compliant
                    </span>
                ) : (
                    <span className="bg-rose-50 text-rose-700 text-xs px-2.5 py-1 rounded-full font-bold border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Rule 7 Deficient
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                {/* Optical Scale */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 block mb-1">Optical Scale</span>
                    <span className="font-mono text-base font-bold text-slate-800">
                        {calibration.mmPerPixel} <span className="text-xs text-slate-400 font-sans">mm/px</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                        Barcode: {calibration.barcodeWidthPx}px
                    </span>
                </div>

                {/* PDP Area */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 block mb-1">PDP Surface Area</span>
                    <span className="font-mono text-base font-bold text-slate-800">
                        {calibration.pdpAreaCm2} <span className="text-xs text-slate-400 font-sans">cm²</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Principal Display Panel</span>
                </div>

                {/* Mandated Min Height */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 block mb-1">Table-I Mandate</span>
                    <span className="font-mono text-base font-bold text-indigo-700">
                        ≥ {calibration.mandatedMinHeightMm.toFixed(1)} <span className="text-xs font-sans">mm</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Statutory Threshold</span>
                </div>

                {/* Measured Height */}
                <div
                    className={`p-3 rounded-xl border ${calibration.isFontHeightCompliant
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/60 border-rose-200 text-rose-900'
                        }`}
                >
                    <span className="text-[11px] block mb-1">Measured Numeral</span>
                    <span className="font-mono text-base font-bold">
                        {calibration.measuredNumeralHeightMm.toFixed(1)}{' '}
                        <span className="text-xs font-sans">mm</span>
                    </span>
                    <span className="text-[10px] block mt-0.5">
                        {calibration.isFontHeightCompliant ? 'Above threshold' : 'Under-sized font'}
                    </span>
                </div>
            </div>

            {/* Progress visualizer */}
            <div className="mt-3">
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-600">
                        Measured Height vs Rule 7 Mandate Ratio:
                    </span>
                    <span
                        className={
                            calibration.isFontHeightCompliant ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'
                        }
                    >
                        {percentOfMandate}% of required size
                    </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                        className={`h-full transition-all duration-300 ${calibration.isFontHeightCompliant ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                        style={{ width: `${Math.min(100, (percentOfMandate / 150) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
