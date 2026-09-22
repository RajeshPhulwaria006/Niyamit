import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, FileText, Zap } from 'lucide-react';

interface MetricCardsProps {
  totalAudits: number;
  compliantCount: number;
  violationCount: number;
  noticesGenerated: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalAudits,
  compliantCount,
  violationCount,
  noticesGenerated,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
      {/* Total Audited */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Packages Audited</span>
          <Zap className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalAudits}</span>
          <span className="text-xs text-slate-400">commodities</span>
        </div>
      </div>

      {/* Compliant */}
      <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-emerald-700 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Fully Compliant</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-bold text-emerald-700">{compliantCount}</span>
          <span className="text-xs text-emerald-600 font-medium">
            {totalAudits > 0 ? `${Math.round((compliantCount / totalAudits) * 100)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* Violations Detected */}
      <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-rose-700 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Violations Flagged</span>
          <XCircle className="w-4 h-4 text-rose-600" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-bold text-rose-700">{violationCount}</span>
          <span className="text-xs text-rose-600 font-medium">
            {totalAudits > 0 ? `${Math.round((violationCount / totalAudits) * 100)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* Statutory Memos Generated */}
      <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-amber-800 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Form VIII Notices</span>
          <FileText className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-bold text-amber-800">{noticesGenerated}</span>
          <span className="text-xs text-amber-700">Sec 15 Memos</span>
        </div>
      </div>
    </div>
  );
};
