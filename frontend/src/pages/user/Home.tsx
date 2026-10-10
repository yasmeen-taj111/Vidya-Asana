import React, { useState, useEffect } from 'react';
import { studyApi } from '../../api/study';
import { DashboardStats, Booking } from '../../api/types';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import { QRCard } from '../../components/QRCard';
import { useRealtimeBookings } from '../../realtime/useRealtimeBookings';
import {
  Compass,
  Flame,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  BookOpen,
  QrCode,
  Heart,
  Timer,
  X,
} from 'lucide-react';

export const Home: React.FC = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const loadDashboard = () => {
    studyApi
      .getDashboard()
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useRealtimeBookings(loadDashboard);

  return (
    <div className="space-y-8">
      {/* Personalized Greeting Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-navy to-navy-dark text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-accent text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for focused deep work</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome back, {user?.name || 'Aarav'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Your study streak is on fire. Find an ergonomic seat or resume your focused study session today.
          </p>
        </div>

        <Link
          to="/app/discover"
          className="relative z-10 px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-lg shadow-primary/30 transition-all flex items-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span>Find & Reserve a Seat</span>
        </Link>
      </div>

      {/* Streak and Study Stats Grid */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-amber-200/80 bg-amber-50/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Study Streak
            </span>
            <p className="text-2xl font-black text-amber-700">{data.stats.currentStreakDays} Days</p>
            <span className="text-[10px] text-slate-400">Best: {data.stats.longestStreakDays} days</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Focus Hours
            </span>
            <p className="text-2xl font-black text-primary">{data.stats.totalFocusHours} hrs</p>
            <span className="text-[10px] text-slate-400">Recorded sessions</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-teal uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Completed Bookings
            </span>
            <p className="text-2xl font-black text-teal">{data.stats.totalBookings}</p>
            <span className="text-[10px] text-slate-400">Lifetime reservations</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" /> Pomodoro Timer
            </span>
            <Link
              to="/app/study"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Start Session →
            </Link>
          </div>
        </div>
      )}

      {/* Main Focus: Upcoming Booking & Preferred Seat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Booking Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Active / Upcoming Reservation
            </h3>
            {data?.upcomingBooking && (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                {data.upcomingBooking.status}
              </span>
            )}
          </div>

          {data?.upcomingBooking ? (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Library:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {data.upcomingBooking.libraryName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Allocated Desk:</span>
                  <span className="font-black text-primary text-sm">
                    {data.upcomingBooking.seat.label} ({data.upcomingBooking.seat.seatType})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Date & Slot:</span>
                  <span className="font-semibold text-slate-800">
                    {data.upcomingBooking.date} • {data.upcomingBooking.slot.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Slot Timing:</span>
                  <span className="font-semibold text-slate-800">
                    {data.upcomingBooking.slot.startTime} – {data.upcomingBooking.slot.endTime}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" /> View Entry QR Pass
                </button>
                <Link
                  to="/app/study"
                  className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold text-center transition-colors"
                >
                  Open Study Tools
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No active reservation for today</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Ready to study? Discover nearby air-conditioned desks and secure your spot.
              </p>
              <Link
                to="/app/discover"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors shadow-sm"
              >
                <span>Find Desks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Preferred Seat Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Heart className="w-5 h-5 text-accent" /> Preferred Seat
            </h3>
            <p className="text-xs text-slate-500 mt-1">Your most frequently booked study corner</p>
          </div>

          {data?.preferredSeat ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-navy">{data.preferredSeat.seat.label}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-extrabold text-[11px]">
                  Booked {data.preferredSeat.timesBooked} times
                </span>
              </div>
              <p className="text-slate-600 font-medium">{data.preferredSeat.libraryName}</p>
              <div className="flex gap-2 text-[11px] text-slate-500">
                <span>{data.preferredSeat.seat.seatType}</span>
                <span>•</span>
                <span>Facing {data.preferredSeat.seat.facing}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              Complete a few reservations to highlight your favorite desk.
            </div>
          )}

          <Link
            to="/app/preferences"
            className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold text-center transition-colors block"
          >
            Customize Preferences
          </Link>
        </div>
      </div>

      {/* QR Code Pass Modal */}
      {showQRModal && data?.upcomingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="relative">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 shadow-lg z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <QRCard booking={data.upcomingBooking} />
          </div>
        </div>
      )}
    </div>
  );
};
