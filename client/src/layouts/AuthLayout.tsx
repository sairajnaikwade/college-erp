import React, { useState } from 'react';
import { SupportModal } from '../components/SupportModal';
import { HelpCircle } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Main Center Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-surface-200/80 overflow-hidden">
          {children}
        </div>
      </div>

      {/* Floating Support Button at bottom-left */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-emerald-200" />
          <span>Support</span>
        </button>
      </div>

      {/* Global Support Modal */}
      <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}
