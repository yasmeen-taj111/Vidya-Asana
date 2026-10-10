import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-in ${
            t.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
              : t.type === 'error'
              ? 'bg-rose-50/95 border-rose-200 text-rose-900'
              : t.type === 'warning'
              ? 'bg-amber-50/95 border-amber-200 text-amber-900'
              : 'bg-blue-50/95 border-blue-200 text-blue-900'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
          </div>
          <div className="flex-1 text-sm">
            {t.title && <p className="font-semibold">{t.title}</p>}
            <p className="text-slate-700 leading-relaxed">{t.message}</p>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
