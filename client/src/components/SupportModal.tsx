import React, { useState } from 'react';
import { X, HelpCircle, Phone, MessageSquare, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Academics');
  const [ticketDescription, setTicketDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTicketSubject('');
      setTicketDescription('');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold leading-tight truncate">Academic Portal Helpdesk</h3>
              <p className="text-[10px] sm:text-xs text-primary-100 truncate">Student & Faculty ERP Support Services</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-surface-900">Support Ticket Raised</h4>
              <p className="text-xs text-surface-500 max-w-xs mx-auto">
                Your ticket has been logged with reference #TKT-{Math.floor(100000 + Math.random() * 900000)}. The academic coordinator will respond shortly.
              </p>
            </div>
          ) : (
            <>
              {/* Quick Contact & Status Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="p-3 rounded-xl bg-surface-50 border border-surface-200 flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-surface-400 font-medium">ERP Helpdesk</p>
                    <p className="text-xs font-semibold text-surface-800 truncate">+91 20 2550 7000</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-emerald-600 font-medium">System Telemetry</p>
                    <p className="text-xs font-semibold text-emerald-800">● Online & Monitored</p>
                  </div>
                </div>
              </div>

              {/* Raise Ticket Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary-600" />
                  Submit an Inquiry / Issue
                </h4>

                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                  >
                    <option value="Academics">Academics & Curriculum</option>
                    <option value="Attendance">Attendance Discrepancy</option>
                    <option value="Quiz">Quiz & Assessments</option>
                    <option value="Timetable">Timetable & Schedule</option>
                    <option value="Technical">Portal Access / Technical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief description of the query..."
                    className="w-full text-xs px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Details (Optional)</label>
                  <textarea
                    rows={3}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide additional context or error codes if applicable..."
                    className="w-full text-xs px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
