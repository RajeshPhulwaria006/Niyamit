'use client';

import React, { useState } from 'react';
import { RuleEvaluationResult, ComplianceStatus } from '@/types/lmpc';
import { UserRole } from '@/context/AuthContext';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface StatutoryCardProps {
  evaluation: RuleEvaluationResult;
  role: UserRole;
}

/**
 * Maps statutory legal findings into plain, simple English explanations for everyday Indian citizens.
 */
function getConsumerFriendlyDetails(v: RuleEvaluationResult): {
  friendlyTitle: string;
  whatHappened: string;
  missingOrAffectedField: string;
  whyItMatters: string;
  consumerActionTip: string;
} {
  const id = v.id.toUpperCase();

  if (id.includes('USP') || id.includes('RULE_6_11')) {
    return {
      friendlyTitle: 'Price Per Gram / Milliliter (Unit Sale Price)',
      whatHappened:
        v.status === 'PASS'
          ? 'Unit Sale Price is clearly printed and mathematically accurate.'
          : 'The package does NOT clearly show the price per single gram or milliliter.',
      missingOrAffectedField: 'Unit Sale Price (USP) Declaration',
      whyItMatters:
        'Since December 2022, Indian law requires brands to print the unit price (like ₹0.25 per gram) so you can easily compare value across small and large packets.',
      consumerActionTip:
        'Do not get misled by big boxes. Check if the price per gram is fair compared to other brands.',
    };
  }

  if (id.includes('MRP') || id.includes('RULE_6_1_E')) {
    return {
      friendlyTitle: 'Maximum Retail Price & All Taxes Included',
      whatHappened:
        v.status === 'PASS'
          ? 'MRP is properly declared with the mandatory tax inclusion notice.'
          : 'MRP is either missing or missing the phrase "inclusive of all taxes".',
      missingOrAffectedField: 'Maximum Retail Price (MRP) & Tax Clause',
      whyItMatters:
        'Sellers are strictly forbidden by Indian law from charging even one rupee above the printed MRP, and all GST taxes must be included.',
      consumerActionTip:
        'Never pay extra over MRP for cooling, bags, or service charges at any shop.',
    };
  }

  if (id.includes('NET_QTY') || id.includes('UNIT') || id.includes('RULE_12')) {
    return {
      friendlyTitle: 'Net Weight / Volume & Legal Standard Units',
      whatHappened:
        v.status === 'PASS'
          ? 'Net weight/volume is accurately printed using standard legal units (g, ml, kg).'
          : 'Package uses non-standard or illegal weight symbols (such as "gms", "kilos", or "ltr").',
      missingOrAffectedField: 'Net Quantity Standard SI Symbol',
      whyItMatters:
        'Under Rule 12, only official SI units (g, ml, kg, L) are allowed to ensure zero ambiguity in the actual quantity inside.',
      consumerActionTip:
        'Verify the net quantity on the front label matches what you are paying for.',
    };
  }

  if (id.includes('MFG') || id.includes('ADDRESS') || id.includes('RULE_6_1_A')) {
    return {
      friendlyTitle: 'Manufacturer Name & Physical Address',
      whatHappened:
        v.status === 'PASS'
          ? 'Complete company name and physical factory/registered address detected.'
          : 'Manufacturer name is shown, but complete physical location/city/pin code is missing.',
      missingOrAffectedField: 'Complete Registered Physical Address',
      whyItMatters:
        'A complete postal address with pin code is mandatory so authorities and consumers can hold the manufacturer legally accountable.',
      consumerActionTip:
        'If a product has defects, you need the complete physical address to send legal consumer notices.',
    };
  }

  if (id.includes('ORIGIN') || id.includes('RULE_6_1_B')) {
    return {
      friendlyTitle: 'Country of Origin',
      whatHappened:
        v.status === 'PASS'
          ? 'Country of Origin is clearly stated.'
          : 'Country of manufacture or origin is missing from the label.',
      missingOrAffectedField: 'Country of Origin Declaration',
      whyItMatters:
        'Mandatory under Indian trade law so consumers know where goods were produced.',
      consumerActionTip:
        'Imported goods without an origin tag may be unapproved parallel imports.',
    };
  }

  if (id.includes('DATE') || id.includes('PKD') || id.includes('RULE_6_1_D')) {
    return {
      friendlyTitle: 'Date of Packing / Manufacture',
      whatHappened:
        v.status === 'PASS'
          ? 'Date of packing or manufacture is clearly declared.'
          : 'Manufacturing date or packaging date is missing or illegible.',
      missingOrAffectedField: 'Month & Year of Manufacture / PKD',
      whyItMatters:
        'Ensures the product is fresh and not sold past its shelf life or expired.',
      consumerActionTip:
        'Always check the packing date and expiry before buying packaged foods or cosmetics.',
    };
  }

  if (id.includes('FONT') || id.includes('RULE_7')) {
    return {
      friendlyTitle: 'Font Size & Readability on Label',
      whatHappened:
        v.status === 'PASS'
          ? 'Letters and numbers meet minimum legal height requirements.'
          : 'The text font is too tiny and below the minimum legal size prescribed by law.',
      missingOrAffectedField: 'Minimum Numeral Height (Rule 7 Table-I)',
      whyItMatters:
        'Companies cannot hide vital details like price or quantity in microscopic font.',
      consumerActionTip:
        'If you have to squint to read the weight or price, the company may be violating packaging rules.',
    };
  }

  if (id.includes('STICKER') || id.includes('SECTION_36') || id.includes('DUAL')) {
    return {
      friendlyTitle: 'Price Sticker Tampering / Dual Pricing',
      whatHappened:
        v.status === 'PASS'
          ? 'No sticker tampering or price alteration detected.'
          : 'A secondary sticker was pasted over the original printed price to hike the MRP!',
      missingOrAffectedField: 'Original Manufacturer Print Integrity',
      whyItMatters:
        'Pasting price stickers to hike the price is a serious offence under Section 36 of the Legal Metrology Act.',
      consumerActionTip:
        'Refuse to pay sticker-hiked prices. Report the shop to the National Consumer Helpline.',
    };
  }

  return {
    friendlyTitle: v.title,
    whatHappened: v.explanation,
    missingOrAffectedField: v.observedValue ? `Observed: ${v.observedValue}` : 'Required declaration',
    whyItMatters: 'Mandatory statutory compliance provision under Legal Metrology Rules, 2011.',
    consumerActionTip: 'Check with manufacturer or enforcement authorities.',
  };
}

export const StatutoryCard: React.FC<StatutoryCardProps> = ({ evaluation, role }) => {
  const [showLegalDetails, setShowLegalDetails] = useState<boolean>(false);
  const isPass = evaluation.status === 'PASS';
  const isWarning = evaluation.status === 'WARNING';
  const isFail = evaluation.status === 'FAIL';

  const details = getConsumerFriendlyDetails(evaluation);

  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden ${
        isPass
          ? 'bg-white border-emerald-200 shadow-2xs hover:border-emerald-300'
          : isWarning
          ? 'bg-amber-50/40 border-amber-300 shadow-xs hover:border-amber-400'
          : 'bg-rose-50/40 border-rose-300 shadow-xs hover:border-rose-400'
      }`}
    >
      {/* Top Status Header */}
      <div className="p-4 sm:p-4.5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            {isPass && (
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            )}
            {isWarning && (
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            )}
            {isFail && (
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
            )}
            <div>
              <h4 className="font-bold text-sm text-slate-900 leading-tight">
                {details.friendlyTitle}
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {evaluation.title}
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 ${
              isPass
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : isWarning
                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                : 'bg-rose-100 text-rose-900 border border-rose-200'
            }`}
          >
            {isPass ? '✓ VERIFIED' : isWarning ? '⚠️ INCOMPLETE' : '✗ VIOLATION'}
          </span>
        </div>

        {/* Structured Consumer Grid: What Happened & Missing Field */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">
              Status & Observation
            </span>
            <p className="font-medium text-slate-800 leading-snug">
              {details.whatHappened}
            </p>
          </div>

          <div
            className={`p-3 rounded-xl border shadow-2xs ${
              isPass
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/50 border-rose-200 text-rose-900'
            }`}
          >
            <span className="text-[10px] uppercase font-bold opacity-60 block mb-0.5 tracking-wider">
              {isPass ? 'Compliant Declaration' : 'Missing / Non-Compliant Field'}
            </span>
            <p className="font-bold leading-snug">
              {isPass ? (evaluation.observedValue || 'Declared according to law') : details.missingOrAffectedField}
            </p>
          </div>
        </div>

        {/* Why this matters card */}
        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Why Indian Law Mandates This:</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed pl-5">
            {details.whyItMatters}
          </p>
        </div>

        {/* Consumer Action Advice if non-compliant */}
        {!isPass && role === 'CONSUMER' && (
          <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center space-x-2">
              <span className="text-base">💡</span>
              <span className="text-[11px]">
                <strong>Consumer Tip:</strong> {details.consumerActionTip}
              </span>
            </div>
            <a
              href="https://consumerhelpline.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 transition-colors ml-2"
            >
              Report Grievance <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Collapsible Officer Statutory Section */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowLegalDetails(!showLegalDetails)}
            className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 py-1 transition-colors"
          >
            <span>{showLegalDetails ? 'Hide Legal Section Details' : 'Show Legal Sections & Penalty Clause'}</span>
            {showLegalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showLegalDetails && (
            <div className="mt-2 p-3 bg-slate-100/80 rounded-xl text-[11px] font-mono space-y-1.5 border border-slate-200">
              <div className="text-slate-700">
                <strong>Statutory Reference:</strong> {evaluation.statutoryReference}
              </div>
              {evaluation.mandatedRequirement && (
                <div className="text-slate-700">
                  <strong>Mandated Standard:</strong> {evaluation.mandatedRequirement}
                </div>
              )}
              {evaluation.observedValue && (
                <div className="text-slate-700">
                  <strong>Detected Value:</strong> {evaluation.observedValue}
                </div>
              )}
              {evaluation.penaltyClause && (
                <div className="text-rose-800 font-bold pt-1 border-t border-slate-200">
                  ⚠️ <strong>Applicable Penalty:</strong> {evaluation.penaltyClause}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
