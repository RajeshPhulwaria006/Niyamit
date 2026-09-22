import React, { useState } from 'react';
import { RuleEvaluationResult } from '@/types/lmpc';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Scale, AlertOctagon } from 'lucide-react';

interface RuleChecklistProps {
  evaluations: RuleEvaluationResult[];
}

export const RuleChecklist: React.FC<RuleChecklistProps> = ({ evaluations }) => {
  const [filter, setFilter] = useState<'ALL' | 'FAIL' | 'PASS'>('ALL');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const filteredRules = evaluations.filter((rule) => {
    if (filter === 'FAIL') return rule.status === 'FAIL';
    if (filter === 'PASS') return rule.status === 'PASS';
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedRuleId(expandedRuleId === id ? null : id);
  };

  const failCount = evaluations.filter((r) => r.status === 'FAIL').length;
  const passCount = evaluations.filter((r) => r.status === 'PASS').length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-slate-800" />
            <h3 className="font-bold text-base text-slate-900">
              Statutory Compliance Evaluation Audit
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Legal Metrology (Packaged Commodities) Rules, 2011 & Legal Metrology Act, 2009
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Checks ({evaluations.length})
          </button>
          <button
            onClick={() => setFilter('FAIL')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
              filter === 'FAIL' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            Violations ({failCount})
          </button>
          <button
            onClick={() => setFilter('PASS')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'PASS' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-600'
            }`}
          >
            Compliant ({passCount})
          </button>
        </div>
      </div>

      {/* Rules Accordion List */}
      <div className="divide-y divide-slate-100 mt-2">
        {filteredRules.map((rule) => {
          const isExpanded = expandedRuleId === rule.id;
          const isFail = rule.status === 'FAIL';
          const isWarning = rule.status === 'WARNING';

          return (
            <div key={rule.id} className="py-3">
              <button
                onClick={() => toggleExpand(rule.id)}
                className="w-full flex items-start justify-between text-left gap-3 focus:outline-hidden group"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {isFail ? (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600">
                        {rule.title}
                      </span>
                      {rule.severity === 'CRITICAL' && (
                        <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-bold uppercase">
                          Critical
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                      {rule.statutoryReference}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      isFail
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isWarning
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {rule.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 pl-8 pr-2 py-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2.5">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Legal Explanation & Finding:
                    </span>
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {rule.explanation}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Observed On Package:
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-800 break-words mt-0.5 block">
                        {rule.observedValue}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Statutory Mandate:
                      </span>
                      <span className="font-sans text-xs text-slate-700 break-words mt-0.5 block">
                        {rule.mandatedRequirement}
                      </span>
                    </div>
                  </div>

                  {rule.penaltyClause && (
                    <div className="mt-2 p-2.5 bg-rose-50/80 border border-rose-200 rounded-lg text-rose-900 flex items-start space-x-2">
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[11px] block">
                          Applicable Penalty Clause:
                        </span>
                        <span className="text-[11px] font-medium leading-relaxed">
                          {rule.penaltyClause}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
