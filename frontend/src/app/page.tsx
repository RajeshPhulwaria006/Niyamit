'use client';

import React, { useState, useEffect } from 'react';
import {
  Camera,
  Smartphone,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Shield,
  Barcode,
  RotateCcw,
  Clock,
  BookOpen,
  ArrowRight,
  Search,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { CameraUploadModal } from '@/components/CameraUploadModal';
import { PanchnamaModal } from '@/components/PanchnamaModal';
import { PhoneAccessModal } from '@/components/PhoneAccessModal';
import { Navbar } from '@/components/Navbar';
import { StatutoryCard } from '@/components/StatutoryCard';
import { useAuth } from '@/context/AuthContext';
import { SAMPLE_PACKAGES, SamplePackageTestCase } from '@/lib/engine/sampleData';
import { InspectionDossier } from '@/types/lmpc';

interface DbStats {
  totalInspected: number;
  compliantCount: number;
  nonCompliantCount: number;
  criticalViolations: number;
  complianceRatePercent: number;
}

export default function SimpleOfficerPage() {
  const { role, user } = useAuth();
  const [dossier, setDossier] = useState<InspectionDossier | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isPanchnamaOpen, setIsPanchnamaOpen] = useState<boolean>(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'HISTORY' | 'RULES'>('CONSOLE');
  const [activeDossierTab, setActiveDossierTab] = useState<'VIOLATIONS' | 'DECLARATIONS' | 'CALIBRATION'>('VIOLATIONS');
  const [evaluationFilter, setEvaluationFilter] = useState<'ALL' | 'ISSUES' | 'VERIFIED'>('ALL');
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [auditError, setAuditError] = useState<string | null>(null);

  const [historyList, setHistoryList] = useState<InspectionDossier[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const [dbStats, setDbStats] = useState<DbStats>({
    totalInspected: 0,
    compliantCount: 0,
    nonCompliantCount: 0,
    criticalViolations: 0,
    complianceRatePercent: 100,
  });

  // Fetch real PostgreSQL enforcement statistics
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setDbStats({
          totalInspected: data.total_inspected ?? data.totalInspected ?? 0,
          compliantCount: data.compliant_count ?? data.compliantCount ?? 0,
          nonCompliantCount: data.non_compliant_count ?? data.nonCompliantCount ?? 0,
          criticalViolations: data.critical_violations ?? data.criticalViolations ?? 0,
          complianceRatePercent: data.compliance_rate_percent ?? data.complianceRatePercent ?? 100,
        });
      }
    } catch {
      // Offline fallback
    }
  };

  // Fetch chronological inspection history from PostgreSQL
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Run statutory inspection
  const runInspection = async (payload: {
    sampleId?: string;
    rawText?: string;
    barcode?: string;
    imageUrl?: string;
    customCalibration?: any;
    customDeclarations?: any;
  }) => {
    setIsLoading(true);
    setAuditError(null);
    setActiveTab('CONSOLE');
    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setDossier(data);
        fetchStats();
      } else {
        setAuditError(data.detail || data.error || 'Statutory audit failed to process.');
      }
    } catch (err: any) {
      console.error('Audit failed:', err);
      setAuditError(err.message || 'Network communication error. Please check backend connection.');
    } finally {
      setIsLoading(false);
      setIsCameraModalOpen(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const isCompliant = dossier?.overallStatus === 'COMPLIANT';
  const violations = dossier?.evaluations?.filter((e) => e.status === 'FAIL') || [];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased">
      {/* Official Top Bar with Persona / Role Switcher */}
      <Navbar />

      {/* Role-Aware Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 flex space-x-1 sm:space-x-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('CONSOLE')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'CONSOLE'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{role === 'CONSUMER' ? 'Product Pricing & Legality Checker' : 'Statutory Inspection Console'}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('HISTORY');
              fetchHistory();
            }}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{role === 'CONSUMER' ? 'Past Scanned Products' : `Audit Repository (${dbStats.totalInspected})`}</span>
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'RULES'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{role === 'CONSUMER' ? 'Your Packaging Rights' : 'LMPC Rules Guide'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Error Alert Banner */}
        {auditError && (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 flex items-center justify-between text-rose-900 text-xs shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span><strong>Inspection Notice:</strong> {auditError}</span>
            </div>
            <button
              onClick={() => setAuditError(null)}
              className="text-rose-700 hover:text-rose-900 font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: INSPECTION CONSOLE */}
        {activeTab === 'CONSOLE' && (
          <div className="space-y-4">
            {/* Primary Action Card: Scan or Direct Barcode */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    Statutory Packaging Audit
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scan packaging via camera, upload a photo, or verify GTIN directly against GS1 India DataKart.
                  </p>
                </div>
                <button
                  onClick={() => setIsCameraModalOpen(true)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md shrink-0"
                >
                  <Camera className="w-4 h-4" /> Scan Package / Upload Photo
                </button>
              </div>

              {/* Direct Barcode Entry Input */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualBarcode.trim()) {
                      runInspection({ barcode: manualBarcode.trim() });
                    }
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      placeholder="Enter 13-digit EAN barcode (e.g. 8904035402011)"
                      className="w-full text-xs font-mono pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !manualBarcode.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40 shrink-0 flex items-center gap-1.5"
                  >
                    Audit Barcode
                  </button>
                </form>

                {/* 1-Tap Quick Barcode Chips - Clean Multi-line Wrap */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick Presets:</span>
                  {[
                    { name: 'Cipla Face Wash', code: '8904035402011' },
                    { name: 'Britannia Good Day', code: '8901063012011' },
                    { name: 'Amul Butter', code: '8901262010054' },
                    { name: 'Himalaya Neem', code: '8901138810013' },
                    { name: 'Dettol Soap', code: '8901396112028' },
                    { name: 'Tata Salt', code: '8901012111015' },
                    { name: 'Maggi 2-Min', code: '8901058852332' },
                  ].map((prod) => (
                    <button
                      key={prod.code}
                      type="button"
                      onClick={() => {
                        setManualBarcode(prod.code);
                        runInspection({ barcode: prod.code });
                      }}
                      className="text-[10px] bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                    >
                      {prod.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Benchmark Test Scenarios */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Statutory Test Scenarios
                </span>
                <span className="text-[10px] text-slate-400">1-Click Evaluation</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'SAMPLE_FACEWASH_CRIMP',
                    name: 'Cipla Astaberry Face Wash (100ml)',
                    desc: 'Crimp embossed date proviso & 100ml Net Qty compliance',
                    status: 'COMPLIANT'
                  },
                  {
                    id: 'SAMPLE_COMPLIANT_BISCUITS',
                    name: 'Britannia Good Day Butter (120g)',
                    desc: 'Fully compliant FMCG packaging & USP calculation',
                    status: 'COMPLIANT'
                  },
                  {
                    id: 'SAMPLE_VIOLATION_POTATO_CHIPS',
                    name: 'Spicy Crunch Potato Chips (85g)',
                    desc: 'Missing USP, illegal "gms" unit & font size deficiency',
                    status: 'NON_COMPLIANT'
                  },
                  {
                    id: 'SAMPLE_VIOLATION_STICKER_TAMPERING',
                    name: 'Sparkle Energy Drink (Dual MRP)',
                    desc: 'Price alteration & retail sticker over-pasting (Section 36)',
                    status: 'NON_COMPLIANT'
                  }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => runInspection({ sampleId: s.id })}
                    className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-start justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            s.status === 'COMPLIANT' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                          {s.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        {s.desc}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0 ml-2 mt-1" />
                  </button>
                ))}
              </div>
            </div>

            {/* Loading Spinner */}
            {isLoading && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-xs">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-600">
                  Executing Statutory Verification against LMPC Rules 2011...
                </span>
              </div>
            )}

            {/* Active Inspection Dossier */}
            {!isLoading && dossier && (
              <div className="space-y-4">
                {/* Result Header & Actions */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
                    isCompliant
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {isCompliant ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isCompliant ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                          }`}
                        >
                          {isCompliant ? 'LEGAL & COMPLIANT' : 'STATUTORY CONTRAVENTION'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          ID: {dossier.auditId}
                        </span>
                      </div>
                      <h3 className="font-bold text-base sm:text-lg mt-1 leading-snug">
                        {dossier.gs1Record?.productName || dossier.declarations.manufacturerName || 'Inspected Commodity'}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isCompliant
                          ? 'Package complies with all applicable provisions of Legal Metrology (Packaged Commodities) Rules, 2011.'
                          : `${violations.length} statutory violation(s) detected. Seizure or compounding proceedings applicable under Section 36.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => setDossier(null)}
                      className="flex-1 sm:flex-initial bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                      title="Clear current audit and scan a new product"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> New Scan
                    </button>
                    {role === 'CONSUMER' ? (
                      <a
                        href="https://consumerhelpline.gov.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Consumer Helpline (1915)
                      </a>
                    ) : (
                      <button
                        onClick={() => setIsPanchnamaOpen(true)}
                        className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" /> Form VIII Notice
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Core Consumer Packaging Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Price Per Unit (USP)
                    </span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {dossier.declarations.declaredUsp || (dossier.declarations as any).declaredUSP
                        ? `₹ ${(dossier.declarations.declaredUsp || (dossier.declarations as any).declaredUSP).toFixed(2)} / ${dossier.declarations.declaredUspUnit || (dossier.declarations as any).declaredUSPUnit || 'unit'}`
                        : '⚠️ Not Declared'}
                    </span>
                    <span className="text-[10px] text-slate-500">Rate per 1g or 1ml</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Printed MRP
                    </span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {dossier.declarations.mrp ? `₹ ${dossier.declarations.mrp.toFixed(2)}` : '⚠️ Missing'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {dossier.declarations.hasInclusiveOfTaxes ? '✓ All Taxes Included' : '⚠️ Tax clause omitted'}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Net Quantity
                    </span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {dossier.declarations.netQuantityValue
                        ? `${dossier.declarations.netQuantityValue} ${dossier.declarations.netQuantityUnit || ''}`
                        : '⚠️ Missing'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {dossier.declarations.isStandardUnitSymbol ? '✓ Legal SI Symbol' : '⚠️ Illegal Unit Symbol'}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Date of Packing
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                      {dossier.declarations.manufacturingDate || '⚠️ Not Detected'}
                    </span>
                    <span className="text-[10px] text-slate-500">Rule 6(1)(d) Mandate</span>
                  </div>
                </div>

                {/* GS1 Authenticated Match Pill */}
                {dossier.gs1Record && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-blue-950 shadow-2xs">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        <strong>GS1 India DataKart Verified:</strong> {dossier.gs1Record.productName} ({dossier.gs1Record.companyName})
                      </span>
                    </div>
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px]">
                      Master Match
                    </span>
                  </div>
                )}

                {/* Inspection Details Tabs */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 text-xs font-bold">
                    <button
                      onClick={() => setActiveDossierTab('VIOLATIONS')}
                      className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                        activeDossierTab === 'VIOLATIONS'
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {role === 'CONSUMER' ? 'Packaging Checkpoints' : 'Rule Checkpoints'} ({dossier.evaluations?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveDossierTab('DECLARATIONS')}
                      className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                        activeDossierTab === 'DECLARATIONS'
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Packaging Declarations
                    </button>
                    {role !== 'CONSUMER' && (
                      <button
                        onClick={() => setActiveDossierTab('CALIBRATION')}
                        className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                          activeDossierTab === 'CALIBRATION'
                            ? 'border-blue-600 text-blue-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Rule 7 Font Metrics
                      </button>
                    )}
                  </div>

                  {/* Sub-tab 1: Violations & Checklist */}
                  {activeDossierTab === 'VIOLATIONS' && (
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Filter Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500">Filter View:</span>
                          <button
                            onClick={() => setEvaluationFilter('ALL')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              evaluationFilter === 'ALL'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            All ({dossier.evaluations?.length || 0})
                          </button>
                          <button
                            onClick={() => setEvaluationFilter('ISSUES')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              evaluationFilter === 'ISSUES'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                            }`}
                          >
                            Issues & Warnings ({dossier.evaluations?.filter((e) => e.status !== 'PASS').length || 0})
                          </button>
                          <button
                            onClick={() => setEvaluationFilter('VERIFIED')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              evaluationFilter === 'VERIFIED'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            Verified Legal ({dossier.evaluations?.filter((e) => e.status === 'PASS').length || 0})
                          </button>
                        </div>

                        {violations.length > 0 && (
                          <span className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                            ⚠️ {violations.length} mandatory rule(s) failed
                          </span>
                        )}
                      </div>

                      {/* Cards List with plain English details */}
                      <div className="space-y-3">
                        {dossier.evaluations
                          ?.filter((v) => {
                            if (evaluationFilter === 'ISSUES') return v.status !== 'PASS';
                            if (evaluationFilter === 'VERIFIED') return v.status === 'PASS';
                            return true;
                          })
                          .map((v) => (
                            <StatutoryCard key={v.id} evaluation={v} role={role} />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 2: Declarations */}
                  {activeDossierTab === 'DECLARATIONS' && (
                    <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">MRP (Retail Price)</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                          {dossier.declarations.mrp ? `₹ ${dossier.declarations.mrp.toFixed(2)}` : 'Omitted'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {dossier.declarations.hasInclusiveOfTaxes ? '✓ Incl. of all taxes' : '✗ Tax clause missing'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Net Quantity</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                          {dossier.declarations.netQuantityValue ? `${dossier.declarations.netQuantityValue} ${dossier.declarations.netQuantityUnit || ''}` : 'Omitted'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {dossier.declarations.isStandardUnitSymbol ? '✓ Standard SI (Rule 12)' : '✗ Non-standard symbol'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Unit Sale Price (USP)</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                          {dossier.declarations.declaredUSP ? `₹ ${dossier.declarations.declaredUSP} ${dossier.declarations.declaredUSPUnit || ''}` : 'Not declared'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Calculated: ₹ {dossier.declarations.calculatedUSP || '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Country of Origin</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block truncate">
                          {dossier.declarations.countryOfOrigin || 'Missing'}
                        </span>
                        <span className="text-[10px] text-slate-500">Rule 6(1)(b) mandate</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Packaging / Mfg Date</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block truncate">
                          {dossier.declarations.manufacturingDate || 'Missing'}
                        </span>
                        <span className="text-[10px] text-slate-500">Rule 6(1)(d)</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Redressal</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block truncate">
                          {dossier.declarations.consumerCarePhone || dossier.declarations.consumerCareEmail || 'Missing'}
                        </span>
                        <span className="text-[10px] text-slate-500">Rule 6(1)(f) helpline</span>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 3: Calibration */}
                  {activeDossierTab === 'CALIBRATION' && dossier.calibration && (
                    <div className="p-4 sm:p-5 space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Optical Scale Factor</span>
                          <strong className="text-sm font-mono">{dossier.calibration.mmPerPixel} mm/px</strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">PDP Area</span>
                          <strong className="text-sm font-mono">{dossier.calibration.pdpAreaCm2} cm²</strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Mandated Min Height</span>
                          <strong className="text-sm font-mono text-indigo-700">≥ {dossier.calibration.mandatedMinHeightMm} mm</strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Measured Numeral</span>
                          <strong className={`text-sm font-mono ${dossier.calibration.isFontHeightCompliant ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {dossier.calibration.measuredNumeralHeightMm} mm
                          </strong>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        Optical scale calibrated automatically via GS1 EAN-13 nominal 37.29 mm fiducial dimension per Rule 7 Table-I standards.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUDIT REPOSITORY / HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Enforcement Audit Repository
                </h2>
                <p className="text-xs text-slate-500">
                  Chronological records stored securely in PostgreSQL database for court proceedings.
                </p>
              </div>
              <button
                onClick={fetchHistory}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-500">Loading audit dossiers from PostgreSQL...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No past audits recorded yet. Run an inspection to record a dossier.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historyList.map((item) => {
                  const itemCompliant = item.overallStatus === 'COMPLIANT';
                  return (
                    <div
                      key={item.auditId}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        {itemCompliant ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {item.declarations?.manufacturerName || item.gs1Record?.productName || 'Package Specimen'}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                itemCompliant ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.overallStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            ID: {item.auditId} • {new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDossier(item);
                          setActiveTab('CONSOLE');
                        }}
                        className="self-end sm:self-center text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2.5 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        View Dossier <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LMPC RULES GUIDE */}
        {activeTab === 'RULES' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-xs">
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Statutory Provisions Reference (LMPC Rules, 2011)
              </h2>
              <p className="text-slate-500 text-[11px]">
                Gazette notification requirements enforced by the Department of Consumer Affairs (DoCA).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Rule 6(1)(a) — Manufacturer & Packer Identity</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Name and complete registered address of the manufacturer, packer, or importer must be clearly declared on the principal display panel.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Rule 6(1)(b) — Country of Origin</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Mandatory declaration of the Country of Origin on all imported, domestic, and e-commerce commodities under the 2026 amendment.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Rule 6(1)(c) & Rule 12 — Standard SI Net Quantity</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Net quantity must use official SI symbols (g, kg, ml, l). Prohibited units such as 'gms', 'gm', 'kilos', 'ltr' constitute a compoundable offence.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Rule 6(1)(d) — Manufacturing Date & Crimp Seal</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Month and year of manufacture or packaging. On squeeze tubes and pouches, embossed crimp seal stamp is legally recognized under the statutory proviso.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Rule 6(1)(e) — MRP & Statutory Tax Clause</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Maximum Retail Price in Indian Rupees with explicit phrase &quot;Inclusive of all taxes&quot; (or &quot;incl. of all taxes&quot;).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Rule 6(11) — Unit Sale Price (USP)</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Mandatory declaration of Unit Sale Price (₹ per g / ₹ per ml) on all packages containing more than 100g/100ml to protect consumers against shrinkflation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Rule 7 Table-I — Minimum Numeral Font Height</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Mandates minimum numeral font height in millimeters based on Principal Display Panel area (e.g. ≥1.5mm for area ≤100cm², ≥2.0mm for ≤500cm²).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Section 36 — Price Alteration & Sticker Tampering</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Strict criminal prohibition against pasting stickers or altering the original manufacturer printed MRP. Fines up to ₹50,000 or imprisonment.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <CameraUploadModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSubmitAudit={runInspection}
        isLoading={isLoading}
      />

      {dossier && (
        <PanchnamaModal
          dossier={dossier}
          isOpen={isPanchnamaOpen}
          onClose={() => setIsPanchnamaOpen(false)}
        />
      )}

      <PhoneAccessModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        localIp="192.168.29.82"
        port={3000}
      />
    </div>
  );
}
