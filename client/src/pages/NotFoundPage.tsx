import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 bg-amber-50 dark:bg-amber-950/40 rounded-3xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shadow-lg animate-pulse">
            <AlertTriangle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            404
          </h1>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            Page Not Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            The page you are looking for doesn't exist or has been moved within the College ERP system.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button variant="primary" onClick={() => navigate('/login')} className="w-full sm:w-auto">
            <Home className="w-4 h-4 mr-2" />
            Return to Login
          </Button>
        </div>

        <div className="text-xs text-slate-400 dark:text-slate-600 pt-8 border-t border-slate-200 dark:border-slate-800">
          College ERP • SOC CoPilot Test Client v1.0
        </div>
      </div>
    </div>
  );
};
