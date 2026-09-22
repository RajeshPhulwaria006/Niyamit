'use client';

import React, { useState } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Shield, User, Lock, Building, CheckCircle2, AlertCircle, X, ChevronRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, loginAsDemo, role, user, logout } = useAuth();
  const [tab, setTab] = useState<'LOGIN' | 'DEMO' | 'REGISTER'>('DEMO');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('CONSUMER');
  const [organization, setOrganization] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      onClose();
    } else {
      setError('Invalid email or password. You can also use the 1-Click Demo accounts below.');
    }
  };

  const handleDemoSelect = async (demoRole: UserRole) => {
    setLoading(true);
    await loginAsDemo(demoRole);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>e-LMPC Access Portal</span>
          </div>
          <h2 className="text-lg font-bold">Authentication & Role Switch</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Log in or test different stakeholder views (Consumer vs Officer).
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => { setTab('DEMO'); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              tab === 'DEMO' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            ⚡ 1-Click Test Roles
          </button>
          <button
            onClick={() => { setTab('LOGIN'); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              tab === 'LOGIN' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            Sign In
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: 1-Click Demo Profiles */}
          {tab === 'DEMO' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose a stakeholder persona to experience the platform from their perspective:
              </p>

              {/* Citizen Consumer Card */}
              <button
                type="button"
                onClick={() => handleDemoSelect('CONSUMER')}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between hover:shadow-md ${
                  role === 'CONSUMER'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🛒</span>
                    <span className="font-bold text-xs text-slate-900">Indian Consumer (Citizen)</span>
                    {role === 'CONSUMER' && (
                      <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Simple, friendly interface. Scans products, checks fair prices, and understands packaging rights without legal jargon.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>

              {/* Legal Metrology Officer Card */}
              <button
                type="button"
                onClick={() => handleDemoSelect('OFFICER')}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between hover:shadow-md ${
                  role === 'OFFICER'
                    ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🛡️</span>
                    <span className="font-bold text-xs text-slate-900">Enforcement Officer (Inspector)</span>
                    {role === 'OFFICER' && (
                      <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Full statutory inspection tools: optical millimeter calibration, Rule 7 font gauge, override powers, and Form VIII Panchnama seizure orders.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>

              {/* Ministry Admin Card */}
              <button
                type="button"
                onClick={() => handleDemoSelect('ADMIN')}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between hover:shadow-md ${
                  role === 'ADMIN'
                    ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-400/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🏛️</span>
                    <span className="font-bold text-xs text-slate-900">Department Admin (DoCA Ministry)</span>
                    {role === 'ADMIN' && (
                      <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    National packaging compliance analytics, state-wise contraventions, and GS1 India DataKart synchronization.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            </div>
          )}

          {/* TAB 2: Standard Sign In */}
          {tab === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. officer.delhi@lmpc.gov.in"
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                {loading ? 'Authenticating...' : 'Sign In with Credentials'}
              </button>
            </form>
          )}

          {/* Current Profile Summary & Logout */}
          {user && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Logged In As:</span>
                <span className="font-bold text-slate-800">{user.fullName}</span>
              </div>
              <button
                type="button"
                onClick={() => { logout(); onClose(); }}
                className="text-rose-600 hover:text-rose-800 font-semibold text-xs px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
