import React, { useState } from 'react';
import { useUiStore } from '../store/uiStore';
import { bookingsApi } from '../api/bookings';
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ApiError } from '../api/client';

export const ReminderModal: React.FC = () => {
  const { reminderModalOpen, activeReminder, setReminder, addToast } = useUiStore();
  const [loading, setLoading] = useState(false);

  if (!reminderModalOpen || !activeReminder) return null;

  const handleConfirm = async (coming: boolean) => {
    setLoading(true);
    try {
      await bookingsApi.confirmArrival(activeReminder.bookingId, coming);
      if (coming) {
        addToast({
          type: 'success',
          title: '15-Minute Buffer Granted',
          message: 'You have 15 minutes buffer wait time to arrive and scan your QR code.',
        });
      } else {
        addToast({
          type: 'info',
          title: 'Slot Cancelled & Seat Released',
          message: 'Your booking has been cancelled and the seat released for waitlisted students.',
        });
      }
      setReminder(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'BAD_REQUEST') {
        addToast({
          type: 'warning',
          title: 'Buffer Already Active',
          message: 'A 15-minute buffer has already been granted for this booking.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Action Failed',
          message: 'Could not update arrival status. Please try again.',
        });
      }
      setReminder(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center animate-scale-up">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Clock className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Are you coming or not for the slot?
        </h3>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Your study slot has started. Please confirm if you are on your way. You will get a 15-minute buffer wait time to arrive and check in.
        </p>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 mb-6 text-xs text-amber-800 flex items-center gap-2 justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>If you do not check in within 15 minutes, the slot will be cancelled automatically.</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            disabled={loading}
            onClick={() => handleConfirm(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-md hover:shadow-primary/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Yes, I'm coming (+15m)
          </button>

          <button
            disabled={loading}
            onClick={() => handleConfirm(false)}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            No, cancel slot
          </button>
        </div>
      </div>
    </div>
  );
};
