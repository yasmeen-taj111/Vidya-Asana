import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-accent" />
          <span>Intelligent Seat Allocation Platform for Modern Libraries</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-navy tracking-tight max-w-4xl mx-auto leading-tight">
          Find your perfect study space, <span className="text-primary underline decoration-accent decoration-wavy">reserve in seconds</span>.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Vidya Asana connects students with quiet library desks, personalizes seating by study preference, prevents double bookings, and reclaims idle no-show seats.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
          >
            <span>Book a Seat Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/app/discover"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
          >
            <Compass className="w-4 h-4 text-accent" />
            <span>Explore Library Map</span>
          </Link>
          <Link
            to="/register-library"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-navy font-bold text-sm border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Building className="w-4 h-4 text-accent" />
            <span>List Your Library</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 max-w-5xl mx-auto text-left">
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Smart Seat Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Match with desks suited to your study style: window sunshine, quiet zones, laptop power outlets, or computer workstations.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Instant QR Check-In</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Arrive at the library and flash your encrypted pass. Quick contactless check-ins prevent ghost bookings and save valuable time.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal/10 text-teal flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">No-Show Recovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated grace-window reminders confirm student arrival. Unclaimed seats are automatically freed and reassigned to waitlisted learners.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Partner Libraries Section (Free & Paid Admissions) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Free Admission & Flexible Paid Passes Available</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-navy">
              Explore Featured Partner Libraries
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Choose from 100% free community study halls or premium air-conditioned quiet hubs across Bengaluru.
            </p>
          </div>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
          >
            <span>Explore All in Discover</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Free Library */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-slate-900 text-base">State Central Library</h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Free Admission
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Premier public state reading sanctuary offering free community admission, serene natural lighting, and peaceful study halls.
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Cubbon Park, Bengaluru</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">40 Desks</span>
                <span>•</span>
                <span className="font-bold text-emerald-700">₹0 Free</span>
              </div>
            </div>
            <Link
              to="/register"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs text-center transition-colors block"
            >
              Reserve Free Desk →
            </Link>
          </div>

          {/* Card 2: Paid Premium Hub */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-slate-900 text-base">Central Study Hub</h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  Paid Passes
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Premier air-conditioned library with high-speed fiber internet and ergonomic seating across two dedicated study floors.
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>MG Road, Bengaluru</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">32 Desks</span>
                <span>•</span>
                <span className="font-bold text-blue-700">From ₹40–₹60/slot</span>
              </div>
            </div>
            <Link
              to="/register"
              className="w-full py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs text-center transition-colors block"
            >
              Book Premium Seat →
            </Link>
          </div>

          {/* Card 3: Paid Lounge */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-slate-900 text-base">Indiranagar Tech Lounge</h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  Paid Passes
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Modern co-study space equipped with standing desks, monitor-equipped workstations and silent research pods.
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>100ft Road, Bengaluru</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">44 Desks</span>
                <span>•</span>
                <span className="font-bold text-blue-700">From ₹50/slot</span>
              </div>
            </div>
            <Link
              to="/register"
              className="w-full py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs text-center transition-colors block"
            >
              Book Desk →
            </Link>
          </div>
        </div>
      </section>

      {/* Role Preview Strip */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black">Tailored for the Entire Ecosystem</h2>
            <p className="text-sm text-slate-300">Dedicated dashboards for Students, Library Owners, and Platform Administrators</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-accent uppercase tracking-wider">Students</span>
              <h4 className="text-lg font-bold">Focus & Achieve</h4>
              <p className="text-xs text-slate-300">
                Personalized desk discovery, interactive floor maps, Pomodoro study timers, streak counters, and AI study companion.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-teal-light uppercase tracking-wider">Library Admins</span>
              <h4 className="text-lg font-bold">Maximize Utilization</h4>
              <p className="text-xs text-slate-300">
                Drag-and-drop floor builder, automated capacity generation, walk-in ticketing, QR validation, and downloadable utilization reports.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-primary-light uppercase tracking-wider">Platform Owners</span>
              <h4 className="text-lg font-bold">Quality Governance</h4>
              <p className="text-xs text-slate-300">
                Single-click library verification workflow, automated email decisions, and platform-wide ecosystem analytics.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
