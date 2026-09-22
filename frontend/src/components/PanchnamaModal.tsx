import React, { useRef } from 'react';
import { InspectionDossier } from '@/types/lmpc';
import { FileText, Printer, Download, X, Shield, Stamp } from 'lucide-react';

interface PanchnamaModalProps {
  dossier: InspectionDossier;
  isOpen: boolean;
  onClose: () => void;
}

export const PanchnamaModal: React.FC<PanchnamaModalProps> = ({
  dossier,
  isOpen,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const violations = dossier.evaluations.filter((e) => e.status === 'FAIL');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-sm sm:text-base text-slate-800">
              Statutory Inspection Memo (Form VIII Panchnama)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Legal Notice Body */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto font-serif text-slate-900 space-y-6 text-xs sm:text-sm bg-white">
          {/* Official Emblem Banner */}
          <div className="text-center border-b-2 border-slate-800 pb-4">
            <div className="flex justify-center mb-1">
              <Shield className="w-8 h-8 text-slate-800" />
            </div>
            <h1 className="font-bold text-base sm:text-lg uppercase tracking-wide">
              GOVERNMENT OF INDIA
            </h1>
            <h2 className="font-bold text-xs sm:text-sm uppercase tracking-wide text-slate-700">
              MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION
            </h2>
            <h3 className="font-semibold text-xs uppercase text-slate-600">
              DEPARTMENT OF CONSUMER AFFAIRS — LEGAL METROLOGY DIVISION
            </h3>
            <p className="text-[11px] font-sans text-slate-500 mt-1 italic">
              Inspection Memorandum & Seizure Notice under Section 15 & 36 of the Legal Metrology Act, 2009
            </p>
          </div>

          {/* Memo details */}
          <div className="grid grid-cols-2 font-sans text-xs gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">MEMORANDUM NO:</span>
              <span className="font-mono font-bold text-slate-800">LMPC/ENF/{dossier.auditId}</span>
            </div>
            <div>
              <span className="text-slate-500 block">DATE OF AUDIT:</span>
              <span className="font-semibold text-slate-800">
                {new Date(dossier.timestamp).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">INSPECTING OFFICER ID:</span>
              <span className="font-semibold text-slate-800">{dossier.inspectorId}</span>
            </div>
            <div>
              <span className="text-slate-500 block">INSPECTION LOCATION:</span>
              <span className="font-semibold text-slate-800">{dossier.inspectionLocation}</span>
            </div>
          </div>

          {/* Section 1: Product particulars */}
          <div>
            <h4 className="font-sans font-bold text-xs uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
              1. Particulars of Packaged Commodity Audited
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-sans">
              <div>
                <span className="text-slate-500">Commodity/Manufacturer:</span>{' '}
                <span className="font-semibold">{dossier.declarations.manufacturerName || 'Unspecified'}</span>
              </div>
              <div>
                <span className="text-slate-500">Declared MRP:</span>{' '}
                <span className="font-semibold">
                  {dossier.declarations.mrp ? `₹ ${dossier.declarations.mrp.toFixed(2)}` : 'Not Declared'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Declared Net Quantity:</span>{' '}
                <span className="font-semibold">
                  {dossier.declarations.netQuantityValue || '—'} {dossier.declarations.netQuantityUnit || ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Bar Code (EAN-13):</span>{' '}
                <span className="font-mono font-semibold">{dossier.declarations.barcode || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500">Date of Packing:</span>{' '}
                <span className="font-semibold">{dossier.declarations.manufacturingDate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500">Country of Origin:</span>{' '}
                <span className="font-semibold">{dossier.declarations.countryOfOrigin || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Contraventions */}
          <div>
            <h4 className="font-sans font-bold text-xs uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
              2. Contraventions & Irregularities Observed
            </h4>
            {violations.length === 0 ? (
              <p className="text-emerald-700 font-sans italic text-xs">
                No statutory contraventions observed. The packaged commodity satisfies all mandatory declarations under the Legal Metrology (Packaged Commodities) Rules, 2011.
              </p>
            ) : (
              <div className="space-y-3 font-sans text-xs">
                {violations.map((v, i) => (
                  <div key={v.id} className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-rose-900">
                        ({i + 1}) {v.title}
                      </span>
                      <span className="font-mono text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                        {v.statutoryReference}
                      </span>
                    </div>
                    <p className="text-slate-800 mb-1">{v.explanation}</p>
                    <div className="text-[11px] text-slate-600 flex gap-4">
                      <span>
                        <strong>Observed:</strong> {v.observedValue}
                      </span>
                      <span>
                        <strong>Mandate:</strong> {v.mandatedRequirement}
                      </span>
                    </div>
                    {v.penaltyClause && (
                      <div className="mt-1 text-[11px] text-rose-800 font-semibold">
                        Applicable Penal Clause: {v.penaltyClause}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Legal Directive */}
          {violations.length > 0 && (
            <div className="font-sans text-xs space-y-2 border-t border-slate-200 pt-3">
              <h4 className="font-bold uppercase text-slate-800">
                3. Statutory Show-Cause & Seizure Directive
              </h4>
              <p className="leading-relaxed text-slate-700">
                Whereas inspection of the packaged commodity has revealed the contraventions detailed in Clause 2; you are hereby ordered to show cause within fifteen (15) calendar days from receipt of this notice why prosecution under Section 36 of the Legal Metrology Act, 2009 should not be initiated, or why the said offences should not be compounded under Section 48.
              </p>
              <p className="leading-relaxed text-slate-700">
                Failure to rectify or explain shall lead to immediate seizure of the non-compliant stock under Section 15(1)(b) and filing of a formal complaint before the Judicial Magistrate.
              </p>
            </div>
          )}

          {/* Signatures & Seal */}
          <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-2 font-sans text-xs items-end">
            <div>
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-slate-400 text-[10px] uppercase font-bold text-center">
                <Stamp className="w-5 h-5 mb-0.5 opacity-60" />
                Official Seal
              </div>
            </div>
            <div className="text-right">
              <div className="font-serif italic text-base text-slate-800 mb-1">
                A. K. Sharma
              </div>
              <div className="font-bold text-slate-900">Legal Metrology Inspector</div>
              <div className="text-slate-500 text-[11px]">Badge: {dossier.inspectorId}</div>
              <div className="text-slate-400 text-[10px]">Department of Consumer Affairs, Govt. of India</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Close Memorandum
          </button>
        </div>
      </div>
    </div>
  );
};
