import React from 'react';
import { InspectionDossier } from '@/types/lmpc';
import { CalibrationGauge } from './CalibrationGauge';
import { RuleChecklist } from './RuleChecklist';
import { CheckCircle2, XCircle, AlertTriangle, FileText, Database, ShieldCheck, MapPin, Calendar, Tag } from 'lucide-react';

interface InspectionViewProps {
  dossier: InspectionDossier;
  onOpenPanchnama: () => void;
}

export const InspectionView: React.FC<InspectionViewProps> = ({
  dossier,
  onOpenPanchnama,
}) => {
  const isCompliant = dossier.overallStatus === 'COMPLIANT';
  const hasCriticalViolations = dossier.criticalViolationsCount > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Statutory Determination */}
      <div
        className={`p-4 sm:p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-colors ${
          isCompliant
            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
            : 'bg-rose-50/80 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex items-start space-x-3 sm:space-x-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isCompliant ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {isCompliant ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : (
              <XCircle className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isCompliant
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-rose-100 border-rose-300 text-rose-800'
                }`}
              >
                {dossier.overallStatus.replace('_', ' ')}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Audit ID: {dossier.auditId}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-1 tracking-tight">
              {isCompliant
                ? 'Statutory Compliance Verified — All Declarations Lawful'
                : `${dossier.criticalViolationsCount} Critical Statutory Violation(s) Detected`}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Inspected at {dossier.inspectionLocation} by Officer {dossier.inspectorId}
            </p>
          </div>
        </div>

        {/* Action Button: Form VIII Notice */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={onOpenPanchnama}
            className={`w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
              isCompliant
                ? 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
                : 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isCompliant ? 'View Audit Certificate' : 'Generate Form VIII Panchnama Notice'}
          </button>
        </div>
      </div>

      {/* GS1 India DataKart & Smart Consumer Registry Match Card */}
      {dossier.gs1Record && (
        <div className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  GS1 India DataKart Master Record Authenticated
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                  Smart Consumer Verified
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                {dossier.gs1Record.productName} ({dossier.gs1Record.brandName})
              </h4>
              <p className="text-xs text-slate-500">
                Registered Company: {dossier.gs1Record.companyName} | Category: {dossier.gs1Record.category}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono text-xs text-slate-600 shrink-0 bg-blue-50 sm:bg-transparent p-2 sm:p-0 rounded-lg w-full sm:w-auto">
            <div>Registered Net Qty: <strong className="text-slate-900">{dossier.gs1Record.registeredNetQuantity}</strong></div>
            <div>Registered MRP: <strong className="text-slate-900">₹ {dossier.gs1Record.registeredMRP.toFixed(2)}</strong></div>
          </div>
        </div>
      )}

      {/* Extracted Product Declaration Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Tag className="w-4 h-4 text-slate-700" />
          Extracted Declaration Matrix (Rule 6 Verification)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* MRP */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block mb-0.5">Maximum Retail Price</span>
            <span className="font-mono text-base font-bold text-slate-900">
              {dossier.declarations.mrp ? `₹ ${dossier.declarations.mrp.toFixed(2)}` : 'Not Detected'}
            </span>
            <span className={`text-[10px] block mt-1 font-medium ${dossier.declarations.hasInclusiveOfTaxes ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>
              {dossier.declarations.hasInclusiveOfTaxes ? '✓ Incl. of all taxes' : '✗ Missing tax clause'}
            </span>
          </div>

          {/* Net Quantity */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block mb-0.5">Net Quantity</span>
            <span className="font-mono text-base font-bold text-slate-900">
              {dossier.declarations.netQuantityValue || '—'} {dossier.declarations.netQuantityUnit || ''}
            </span>
            <span className={`text-[10px] block mt-1 font-medium ${dossier.declarations.isStandardUnitSymbol ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>
              {dossier.declarations.isStandardUnitSymbol ? '✓ Rule 12 Standard SI' : '✗ Non-standard unit'}
            </span>
          </div>

          {/* Unit Sale Price */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block mb-0.5">Unit Sale Price (USP)</span>
            <span className="font-mono text-base font-bold text-slate-900">
              {dossier.declarations.declaredUSP !== undefined
                ? `₹ ${dossier.declarations.declaredUSP} / ${dossier.declarations.declaredUSPUnit || ''}`
                : 'Omitted'}
            </span>
            <span className="text-[10px] block mt-1 text-slate-500 font-mono">
              Calc: ₹ {dossier.declarations.calculatedUSP ? `${dossier.declarations.calculatedUSP}/base` : 'N/A'}
            </span>
          </div>

          {/* Country of Origin */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block mb-0.5">Country of Origin</span>
            <span className="font-bold text-slate-900 text-sm block truncate">
              {dossier.declarations.countryOfOrigin || 'Missing (Illegal)'}
            </span>
            <span className="text-[10px] block mt-1 text-slate-400">
              Rule 6(1)(b) & 2026 Mandate
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Manufacturer / Packer Entity:</span>
            <span className="font-medium text-slate-900">
              {dossier.declarations.manufacturerName || 'Not Declared'}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">
              {dossier.declarations.manufacturerAddress || 'Address omitted'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Consumer Care & Grievance Contact:</span>
            <span className="font-medium text-slate-900">
              Tel: {dossier.declarations.consumerCarePhone || 'Omitted'}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">
              Email: {dossier.declarations.consumerCareEmail || 'Omitted'}
            </span>
          </div>
        </div>
      </div>

      {/* Optical Calibration Gauge (Rule 7) */}
      {dossier.calibration && <CalibrationGauge calibration={dossier.calibration} />}

      {/* Full Statutory Rule Checklist */}
      <RuleChecklist evaluations={dossier.evaluations} />
    </div>
  );
};
