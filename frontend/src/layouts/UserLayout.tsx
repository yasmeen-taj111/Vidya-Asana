import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Compass,
  CalendarCheck,
  Timer,
  Trophy,
  Sliders,
  LogOut,
  BookOpen,
  LayoutGrid,
  Clock,
  BarChart2,
} from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';
import { ChatWidget } from '../components/ChatWidget';
import { ReminderModal } from '../components/ReminderModal';
import { ToastContainer } from '../components/ui/ToastContainer';
import { DevPanel } from '../components/DevPanel';

export const UserLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Home', path: '/app', icon: LayoutGrid },
    { label: 'Discover', path: '/app/discover', icon: Compass },
    { label: 'My Bookings', path: '/app/bookings', icon: CalendarCheck },
    { label: 'Waitlist', path: '/app/waitlist', icon: Clock },
    { label: 'Study Tools', path: '/app/study', icon: Timer },
    { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
    { label: 'Reports', path: '/app/reports', icon: BarChart2 },
    { label: 'Preferences', path: '/app/preferences', icon: Sliders },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16 md:pb-0">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/app" className="flex items-center gap-2.5 font-bold text-xl text-navy">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <span>Vidya<span className="text-accent font-extrabold">Asana</span></span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name || 'Student'}</p>
              <p className="text-[10px] text-slate-500 font-mono">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navLinks.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
                active ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Floating Widgets */}
      <ChatWidget />
      <ReminderModal />
      <ToastContainer />
      <DevPanel />
    </div>
  );
};
