import React, { useState, useEffect } from 'react';
import { bookingsApi } from '../../api/bookings';
import { Booking } from '../../api/types';
import { QRCard } from '../../components/QRCard';
import { useUiStore } from '../../store/uiStore';
import { useRealtimeBookings } from '../../realtime/useRealtimeBookings';
import {
  CalendarCheck,
  QrCode,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  X,
  AlertTriangle,
} from 'lucide-react';

export const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<'UPCOMING' | 'PAST' | 'CANCELLED'>('UPCOMING');
  const [selectedQRBooking, setSelectedQRBooking] = useState<{
    booking: Booking;
    qrDataUrl: string;
  } | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { addToast } = useUiStore();

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingsApi.getMyBookings();
      setBookings(res.bookings);
      if (selectedQRBooking) {
        const matching = res.bookings.find((b) => b.id === selectedQRBooking.booking.id);
        if (matching) {
          setSelectedQRBooking((prev) => (prev ? { ...prev, booking: matching } : null));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useRealtimeBookings(loadBookings);

  const handleShowQR = async (b: Booking) => {
    try {
      const qrData = await bookingsApi.getBookingQR(b.id);
      setSelectedQRBooking({ booking: b, qrDataUrl: qrData.qrDataUrl });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await bookingsApi.cancelBooking(id);
      addToast({
        type: 'info',
        title: 'Booking Cancelled',
        message: 'Your reservation was cancelled and the seat has been freed.',
      });
      setCancellingBookingId(null);
      loadBookings();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Cancel Failed',
        message: err.message || 'Could not cancel booking.',
      });
    }
  };

  const filtered = bookings.filter((b) => {
    if (tab === 'UPCOMING') return b.status === 'CONFIRMED' || b.status === 'CHECKED_IN';
    if (tab === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'NO_SHOW';
    return b.status === 'COMPLETED';
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" /> My Seat Reservations
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review upcoming entry passes, view QR badges, or manage past study sessions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit text-xs">
        <button
          onClick={() => setTab('UPCOMING')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            tab === 'UPCOMING' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab('PAST')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            tab === 'PAST' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Past Sessions
        </button>
        <button
          onClick={() => setTab('CANCELLED')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            tab === 'CANCELLED' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Cancelled / No-Shows
        </button>
      </div>

      {/* Bookings List Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-100 shadow-sm">
            No bookings found under this tab.
          </div>
        ) : (
          filtered.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-navy text-sm">{b.code}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      b.status === 'CHECKED_IN'
                        ? 'bg-blue-100 text-blue-800'
                        : b.status === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'NO_SHOW'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{b.libraryName}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="font-semibold text-primary">
                    Seat: {b.seat.label} ({b.seat.seatType})
                  </span>
                  <span>•</span>
                  <span>{b.floorLabel}</span>
                  <span>•</span>
                  <span>
                    {b.date} • {b.slot.name} ({b.slot.startTime} – {b.slot.endTime})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                {(b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && (
                  <>
                    <button
                      onClick={() => handleShowQR(b)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4" /> QR Pass
                    </button>
                    {b.status === 'CONFIRMED' && (
                      <button
                        onClick={() => setCancellingBookingId(b.id)}
                        className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-medium transition-colors"
                        title="Cancel reservation"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Code Presentation Modal */}
      {selectedQRBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="relative">
            <button
              onClick={() => setSelectedQRBooking(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 shadow-lg z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <QRCard
              booking={selectedQRBooking.booking}
              qrDataUrl={selectedQRBooking.qrDataUrl}
            />
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Cancel Reservation?</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your seat will be immediately released and allocated to the next student waiting in queue.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleCancel(cancellingBookingId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Yes, Cancel
              </button>
              <button
                onClick={() => setCancellingBookingId(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Keep Seat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
