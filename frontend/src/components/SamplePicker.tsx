import React from 'react';
import { SAMPLE_PACKAGES, SamplePackageTestCase } from '@/lib/engine/sampleData';
import { CheckCircle2, AlertOctagon, ShieldAlert, Sparkles } from 'lucide-react';

interface SamplePickerProps {
  onSelectSample: (sample: SamplePackageTestCase) => void;
  selectedSampleId?: string;
}

export const SamplePicker: React.FC<SamplePickerProps> = ({
  onSelectSample,
  selectedSampleId,
}) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm sm:text-base font-bold text-slate-800">
            Quick Test Bench: Real-World Case Studies
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200">
          Instant 1-Click Evaluation
        </span>
      </div>
      <p className="text-xs text-slate-600 mb-4">
        Select a real packaged commodity scenario to verify the rule engine, barcode calibration, and statutory notice generator without manual typing:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SAMPLE_PACKAGES.map((sample) => {
          const isSelected = selectedSampleId === sample.id;
          const isCompliant = sample.expectedOutcome === 'COMPLIANT';

          return (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {sample.category}
                  </span>
                  {isCompliant ? (
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Legal
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <AlertOctagon className="w-3 h-3 mr-1" /> Violation
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-xs sm:text-sm text-slate-900 leading-snug mb-1">
                  {sample.name}
                </h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {sample.summary}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-mono text-slate-400">EAN: {sample.barcode.slice(0, 7)}...</span>
                <span className="text-blue-600 font-semibold group-hover:underline">
                  {isSelected ? 'Active Selection' : 'Audit Now →'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
