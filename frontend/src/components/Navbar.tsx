import React from 'react';
import { ShieldCheck, Scale, AlertTriangle, UserCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
    return (
        <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
            {/* Tricolor accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-green-600" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Brand & Emblem */}
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-inner">
                            <Scale className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-lg text-slate-900 tracking-tight">
                                    e-LMPC RADAR
                                </span>
                                <span className="bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded-full font-semibold border border-amber-300">
                                    DoCA Official
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 hidden sm:block">
                                Legal Metrology (Packaged Commodities) Rules, 2011 Automated Audit System
                            </p>
                        </div>
                    </div>

                    {/* Officer Credentials & Status */}
                    <div className="flex items-center space-x-3 text-xs sm:text-sm">
                        <div className="hidden md:flex flex-col text-right">
                            <span className="font-semibold text-slate-800 flex items-center justify-end gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Inspector Badge: DL-402
                            </span>
                            <span className="text-slate-400 text-xs">Delhi Central Enforcement Division</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md flex items-center space-x-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Offline Ready (₹0 Cloud Cost)</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
