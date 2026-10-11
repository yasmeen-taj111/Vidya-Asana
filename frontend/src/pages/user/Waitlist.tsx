import React, { useState, useEffect } from 'react';
import { waitlistApi } from '../../api/waitlist';
import { WaitlistEntry } from '../../api/types';
import { useUiStore } from '../../store/uiStore';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  Trash2,
  AlertCircle,
  ArrowRight,
  Sun,
  Zap,
  VolumeX,
  Compass,
} from 'lucide-react';
import { getSocket } from '../../realtime/socket';

export const Waitlist: React.FC = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
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

    const socket = getSocket();
    const handleRefresh = () => {
      loadEntries();
    };

    socket.on('waitlist:available', handleRefresh as any);
    socket.on('seat:updated', handleRefresh as any);

    return () => {
      socket.off('waitlist:available', handleRefresh as any);
      socket.off('seat:updated', handleRefresh as any);
    };
  }, []);

  const notifiedEntry = entries.find((e) => e.status === 'NOTIFIED');

  // Dynamic countdown timer for NOTIFIED claim status
  useEffect(() => {
    if (!notifiedEntry) return;

    const updateCountdown = () => {
      if (notifiedEntry.claimExpiresAt) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(notifiedEntry.claimExpiresAt).getTime() - Date.now()) / 1000)
        );
        setCountdownSeconds(remaining);
      } else {
        setCountdownSeconds((s) => Math.max(0, s - 1));
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [notifiedEntry?.id, notifiedEntry?.claimExpiresAt]);

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      const booking = await waitlistApi.claimWaitlist(id);
      addToast({
        type: 'success',
        title: 'Seat Claimed Successfully!',
        message: `Reserved desk ${booking.seat.label} at ${booking.libraryName}. Your check-in pass is ready!`,
      });
      navigate('/app/bookings');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Claim Failed',
        message: err.message || 'The claim window has expired.',
      });
      loadEntries();
    } finally {
      setClaimingId(null);
    }
  };

  const handleLeave = async (id: string) => {
    setLeavingId(id);
    try {
      await waitlistApi.leaveWaitlist(id);
      addToast({
        type: 'info',
        title: 'Left Waitlist',
        message: 'You have been removed from the waitlist queue.',
      });
      loadEntries();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Could not leave waitlist.',
      });
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Waitlist Queue & Notifications
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          FIFO waitlist recovers cancelled or no-show seats with an exclusive 10-minute prioritized claim window.
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
            disabled={claimingId === notifiedEntry.id}
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-75"
          >
            <span>{claimingId === notifiedEntry.id ? 'Claiming Seat...' : 'Claim Seat Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Waitlist Entries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-100 shadow-sm">
            Loading your waitlist entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-100 shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">
                No Active Waitlist Queues
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                When popular study desks or slots are fully booked, you can join their waitlist directly from the interactive floor map. If a student cancels or misses check-in, you will receive an instant 10-minute pass to claim the desk!
              </p>
            </div>
            <button
              onClick={() => navigate('/app/discover')}
              className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/20 transition-all inline-flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Libraries & Seats</span>
            </button>
          </div>
        ) : (
          entries.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-3xl p-6 border shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.status === 'NOTIFIED'
                  ? 'border-amber-300 ring-2 ring-amber-200/50 shadow-md bg-amber-50/20'
                  : 'border-slate-100 hover:shadow-md'
              }`}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-base">
                    Seat: {item.seat.label} ({item.seat.seatType})
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.status === 'NOTIFIED'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : item.status === 'WAITING'
                        ? 'bg-blue-100 text-blue-800'
                        : item.status === 'CLAIMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status === 'NOTIFIED'
                      ? 'Seat Freed • Ready to Claim!'
                      : item.status === 'WAITING'
                      ? `In Queue (Position #${item.position})`
                      : item.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-semibold">{item.libraryName}</p>

                <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{item.date} • {item.slot.name} ({item.slot.startTime} – {item.slot.endTime})</span>
                </p>

                {/* Seat Attributes */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-slate-600">
                  {item.seat.attributes.window && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-medium">
                      <Sun className="w-3 h-3" /> Window Desk
                    </span>
                  )}
                  {item.seat.attributes.powerOutlet && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                      <Zap className="w-3 h-3" /> Power Outlet
                    </span>
                  )}
                  {item.seat.attributes.quietZone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-light text-teal-dark font-medium">
                      <VolumeX className="w-3 h-3" /> Silent Zone
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {item.status === 'NOTIFIED' ? (
                  <button
                    onClick={() => handleClaim(item.id)}
                    disabled={claimingId === item.id}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{claimingId === item.id ? 'Claiming...' : 'Claim Desk'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleLeave(item.id)}
                    disabled={leavingId === item.id}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    title="Leave waitlist"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Leave Queue</span>
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
