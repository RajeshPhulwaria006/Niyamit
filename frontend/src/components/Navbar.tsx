'use client';

import React, { useState } from 'react';
import { Scale, UserCheck, Shield, ChevronDown, LogIn, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';

export const Navbar: React.FC = () => {
  const { user, role } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const getRoleBadge = () => {
    switch (role) {
      case 'CONSUMER':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            🛒 Consumer Mode (Simple English)
          </span>
        );
      case 'OFFICER':
        return (
          <span className="bg-blue-100 text-blue-900 border border-blue-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-blue-700" />
            🛡️ Officer Mode: {user?.badgeNumber || 'Inspector'}
          </span>
        );
      case 'ADMIN':
        return (
          <span className="bg-purple-100 text-purple-900 border border-purple-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            🏛️ DoCA Ministry Admin
          </span>
        );
    }
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white shadow-xs sticky top-0 z-40">
        {/* Indian Tricolor Accent Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-green-600" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Description */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <Scale className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                    e-LMPC RADAR
                  </span>
                  <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-300">
                    DoCA Official
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Automated Statutory Compliance System (Rules 2011)
                </p>
              </div>
            </div>

            {/* Role Badge & Auth Switcher Button */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block">
                {getRoleBadge()}
              </div>

              {/* User / Persona Toggle Button */}
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 shadow-2xs transition-all hover:border-slate-300"
                title="Switch role between Consumer, Inspector, and Admin"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-[10px] font-bold">
                  {role === 'CONSUMER' ? '🛒' : role === 'OFFICER' ? '🛡️' : '🏛️'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="font-bold text-[11px] leading-tight line-clamp-1">
                    {user?.fullName || 'Sign In'}
                  </div>
                  <div className="text-[9px] text-slate-500 leading-tight">
                    Change Role / Login
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auth & Role Switch Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};
