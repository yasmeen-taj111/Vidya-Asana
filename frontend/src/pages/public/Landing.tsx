import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  QrCode,
  ArrowRight,
  Clock,
  Building,
  Sparkles,
} from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="space-y-32 py-12 overflow-hidden bg-white">
      {/* Hero Section with Library Highlight Background */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 pt-4">
        {/* Library Highlight Image Backdrop */}
        <div className="absolute inset-0 top-0 max-w-5xl mx-auto h-[520px] rounded-3xl overflow-hidden pointer-events-none z-0 select-none shadow-sm">
          <img
            src="/hero-library.jpg"
            alt="Library Study Space"
            className="w-full h-full object-cover object-center opacity-75 filter brightness-95 contrast-105 scale-100"
          />
          {/* Subtle edge fades for seamless blending into the white background */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-white/60"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-transparent to-white/80"></div>
        </div>

        <div className="relative z-10 space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-primary/30 text-primary text-xs font-semibold uppercase tracking-widest shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Intelligent Seat Allocation Platform</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif font-bold text-navy tracking-tight max-w-5xl mx-auto leading-[1.12] drop-shadow-[0_2px_12px_rgba(255,255,255,0.9)]">
            Find your perfect study space, <br className="hidden sm:inline" />
            <span className="text-accent italic font-normal">reserve in seconds.</span>
          </h1>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl py-2 px-4 inline-block max-w-2xl mx-auto shadow-sm">
            <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-sans font-medium">
              Vidya Asana connects students with quiet library desks, personalizes seating by study preference, prevents double bookings, and reclaims idle no-show seats in real time.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-accent hover:bg-[#d04a1e] active:bg-[#b03a12] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/30 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer select-none"
          >
            <span>Book a Seat Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/register-library"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-navy hover:text-white text-navy font-bold text-xs uppercase tracking-widest border-2 border-navy shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Building className="w-4 h-4 text-accent" />
            <span>List Your Library</span>
          </Link>
        </div>

        {/* Editorial Stat / Metric Boxes Aligned with Brand Royal Blue & Orange */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto pt-8">
          <div className="p-6 border-2 border-primary/30 bg-primary/5 rounded-xl text-center space-y-1 shadow-sm">
            <span className="text-3xl font-serif font-black text-primary">100%</span>
            <p className="text-xs font-bold uppercase tracking-wider text-navy">Real-Time Sync</p>
            <p className="text-[11px] text-slate-600">Live interactive floor grids</p>
          </div>

          <div className="p-6 border-2 border-accent/30 bg-accent/5 rounded-xl text-center space-y-1 shadow-sm">
            <span className="text-3xl font-serif font-black text-accent">0</span>
            <p className="text-xs font-bold uppercase tracking-wider text-navy">Ghost Bookings</p>
            <p className="text-[11px] text-slate-600">Automated 30m grace release</p>
          </div>

          <div className="p-6 border-2 border-primary/30 bg-primary/5 rounded-xl text-center space-y-1 shadow-sm">
            <span className="text-3xl font-serif font-black text-primary">QR</span>
            <p className="text-xs font-bold uppercase tracking-wider text-navy">Instant Pass</p>
            <p className="text-[11px] text-slate-600">Encrypted check-in tokens</p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid with Royal Blue Accents and Orange Badges */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-accent uppercase tracking-widest">[ Built for quiet study & high efficiency ]</span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-navy">How Vidya Asana Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          {/* Feature 1 */}
          <div className="relative p-8 rounded-2xl bg-white border-2 border-slate-100 shadow-lg shadow-slate-100 space-y-5 hover:border-primary/50 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-serif font-black text-primary group-hover:text-accent transition-colors">
                01
              </span>
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
            </div>
            <div className="w-12 h-1 bg-primary/30 rounded"></div>
            <h3 className="font-serif font-bold text-navy text-2xl">Smart Seat Matching</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-light">
              Filter by natural light, quiet zones, laptop power outlets, or computer workstations. Our algorithm surfaces your optimal desk in milliseconds.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="relative p-8 rounded-2xl bg-white border-2 border-slate-100 shadow-lg shadow-slate-100 space-y-5 hover:border-primary/50 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-serif font-black text-primary group-hover:text-accent transition-colors">
                02
              </span>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
            </div>
            <div className="w-12 h-1 bg-primary/30 rounded"></div>
            <h3 className="font-serif font-bold text-navy text-2xl">Instant QR Check-In</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-light">
              Arrive at the library and flash your encrypted pass. Contactless verification checks you in seamlessly and marks your seat occupied.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="relative p-8 rounded-2xl bg-white border-2 border-slate-100 shadow-lg shadow-slate-100 space-y-5 hover:border-primary/50 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-serif font-black text-primary group-hover:text-accent transition-colors">
                03
              </span>
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <div className="w-12 h-1 bg-primary/30 rounded"></div>
            <h3 className="font-serif font-bold text-navy text-2xl">No-Show Recovery</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-light">
              Automatic grace reminders prevent abandoned desks. If a student doesn't show within 30 minutes, the seat is released to the waitlist.
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Section: Work. Live. Study. */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-slate-200 pb-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-accent uppercase tracking-widest">[ Tailored for all roles ]</span>
            <h2 className="text-4xl sm:text-6xl font-serif font-bold text-navy">
              Work. Live. <span className="text-accent italic">Study.</span>
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md font-sans font-light">
            Vidya Asana powers the complete ecosystem with tailored interfaces for students, library admins, and platform owners.
          </p>
        </div>

        {/* Role Cards with Giant Royal Blue Letter Monograms */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Role 1: Students */}
          <div className="relative p-8 rounded-2xl bg-white border-2 border-slate-100 overflow-hidden shadow-md space-y-6">
            <div className="absolute -top-10 -right-4 text-[11rem] font-serif font-black text-primary/10 pointer-events-none select-none leading-none">
              S
            </div>
            <div className="relative z-10 space-y-4">
              <div className="inline-block px-3 py-1 rounded bg-accent text-white text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-accent/20">
                Learners
              </div>
              <h4 className="text-2xl font-serif font-bold text-navy">Students & Researchers</h4>
              <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
                Discover library hubs near you, filter quiet desk attributes, reserve specific time slots, track study streaks, and manage QR passes with ease.
              </p>
            </div>
          </div>

          {/* Role 2: Library Admins */}
          <div className="relative p-8 rounded-2xl bg-white border-2 border-slate-100 overflow-hidden shadow-md space-y-6">
            <div className="absolute -top-10 -right-4 text-[11rem] font-serif font-black text-primary/10 pointer-events-none select-none leading-none">
              A
            </div>
            <div className="relative z-10 space-y-4">
              <div className="inline-block px-3 py-1 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-primary/20">
                Management
              </div>
              <h4 className="text-2xl font-serif font-bold text-navy">Library Administrators</h4>
              <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
                Design custom floor layouts, manage shift time slots, issue instant walk-in tickets, scan attendee QR passes, and view live occupancy grids.
              </p>
            </div>
          </div>

          {/* Role 3: Platform Owners */}
          <div className="relative p-8 rounded-2xl bg-white border-2 border-slate-100 overflow-hidden shadow-md space-y-6">
            <div className="absolute -top-10 -right-4 text-[11rem] font-serif font-black text-primary/10 pointer-events-none select-none leading-none">
              O
            </div>
            <div className="relative z-10 space-y-4">
              <div className="inline-block px-3 py-1 rounded bg-navy text-white text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-navy/20">
                Governance
              </div>
              <h4 className="text-2xl font-serif font-bold text-navy">Platform Owners</h4>
              <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
                Review library registration applications, verify physical study spaces, view network-wide utilization metrics, and ensure platform quality.
              </p>
            </div>
          </div>
        </div>

        {/* Vibrant Orange-Red CTA Banner with High Contrast */}
        <div className="relative rounded-3xl bg-gradient-to-br from-accent to-[#d04a1e] text-white p-8 sm:p-14 overflow-hidden shadow-2xl">
          {/* Subtle royal blue background shape */}
          <div className="absolute -bottom-16 -right-16 w-96 h-96 rounded-full bg-primary/20 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm border border-white/30">
              Ready to study without distractions?
            </span>
            <h3 className="text-3xl sm:text-5xl font-serif font-bold leading-tight text-white drop-shadow-sm">
              Join thousands of learners reserving quiet study desks daily.
            </h3>
            <p className="text-sm sm:text-base text-white/90 font-light max-w-lg">
              Unlock access to verified libraries, instant check-in passes, and guaranteed study spaces across your city.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-xl bg-white text-accent font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg active:scale-[0.98]"
              >
                Create Free Student Account
              </Link>
              <Link
                to="/login"
                className="px-8 py-3.5 rounded-xl bg-transparent border-2 border-white text-white font-bold text-xs uppercase tracking-widest hover:bg-white/15 transition-all active:scale-[0.98]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
