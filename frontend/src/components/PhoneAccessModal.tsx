import React, { useState } from 'react';
import { Smartphone, Wifi, X, Check, Copy } from 'lucide-react';

interface PhoneAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  localIp: string;
  port: number;
}

export const PhoneAccessModal: React.FC<PhoneAccessModalProps> = ({
  isOpen,
  onClose,
  localIp,
  port,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const url = `http://${localIp}:${port}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-center p-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Open on Your Mobile Phone
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Connect your phone to the same Wi-Fi network and open this URL in your mobile browser:
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between font-mono text-sm text-slate-800 mb-4">
          <span className="font-bold text-blue-700">{url}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md transition-colors"
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="text-left text-xs text-slate-600 bg-amber-50/80 border border-amber-200 rounded-xl p-3 mb-4 space-y-1">
          <div className="font-bold text-amber-900 flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5" /> Dev Mode Instructions:
          </div>
          <div>1. Make sure your phone is connected to your current Wi-Fi.</div>
          <div>2. Open Chrome/Safari on your phone and type <strong>{url}</strong>.</div>
          <div>3. Tap <strong>"Scan Package"</strong> to take live photos with your camera.</div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
