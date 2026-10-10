import React, { useState, useEffect } from 'react';
import { waitlistApi } from '../../api/waitlist';
import { WaitlistEntry } from '../../api/types';
import { useUiStore } from '../../store/uiStore';
import { useNavigate } from 'react-router-dom';
import { Clock, Sparkles, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';

export const Waitlist: React.FC = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(600); // 10 min claim countdown

  const { addToast } = useUiStore();
  const navigate = useNavigate();

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await waitlistApi.getMyWaitlist();
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  // Countdown timer for NOTIFIED claim status
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClaim = async (id: string) => {
    try {
      const booking = await waitlistApi.claimWaitlist(id);
      addToast({
        type: 'success',
        title: 'Seat Claimed!',
        message: `Successfully claimed seat ${booking.seat.label} from waitlist!`,
      });
      navigate('/app/bookings');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Claim Failed',
        message: err.message || 'Claim window expired.',
      });
    }
  };

  const handleLeave = async (id: string) => {
    try {
      await waitlistApi.leaveWaitlist(id);
      addToast({ type: 'info', title: 'Removed', message: 'You have left the waitlist.' });
      loadEntries();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Could not leave waitlist.' });
    }
  };

  const notifiedEntry = entries.find((e) => e.status === 'NOTIFIED');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Waitlist Queue & Notifications
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          FIFO waitlist recovers cancelled or no-show seats with a 10-minute prioritized claim window.
        </p>
      </div>

      {/* Claim Window Notification Banner */}
      {notifiedEntry && (
        <div className="p-6 bg-gradient-to-r from-amber-500 to-accent text-white rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce-subtle">
          <div className="space-y-1 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Seat Available for Claim!
            </span>
            <h3 className="text-xl font-black">
              Seat {notifiedEntry.seat.label} at {notifiedEntry.libraryName} has been freed!
            </h3>
            <p className="text-xs text-white/90">
              Claim window expires in:{' '}
              <span className="font-mono font-extrabold text-sm underline">
                {Math.floor(countdownSeconds / 60)}:
                {(countdownSeconds % 60).toString().padStart(2, '0')}
              </span>
            </p>
          </div>

          <button
            onClick={() => handleClaim(notifiedEntry.id)}
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs shadow-lg transition-all"
          >
            Claim Seat Now
          </button>
        </div>
      )}

      {/* Waitlist Entries List */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-100 shadow-sm">
            You are not currently in any seat waitlists.
          </div>
        ) : (
          entries.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md flex items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">
                    Seat: {item.seat.label} ({item.seat.seatType})
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.status === 'NOTIFIED'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : item.status === 'WAITING'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status} (Position #{item.position})
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{item.libraryName}</p>
                <p className="text-[11px] text-slate-400">
                  {item.date} • {item.slot.name} ({item.slot.startTime} – {item.slot.endTime})
                </p>
              </div>

              <div className="flex items-center gap-2">
                {item.status === 'NOTIFIED' ? (
                  <button
                    onClick={() => handleClaim(item.id)}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm"
                  >
                    Claim Seat
                  </button>
                ) : (
                  <button
                    onClick={() => handleLeave(item.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Leave waitlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
