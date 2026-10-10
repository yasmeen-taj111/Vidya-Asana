import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adminApi } from '../api/admin';
import { Library } from '../api/types';
import {
  LayoutDashboard,
  Grid,
  Clock,
  BookOpen,
  QrCode,
  UserPlus,
  BarChart2,
  Building,
  LogOut,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { ToastContainer } from '../components/ui/ToastContainer';
import { DevPanel } from '../components/DevPanel';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getLibrary()
      .then((data) => setLibrary(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Seats & Grid', path: '/admin/seats', icon: Grid },
    { label: 'Time Slots', path: '/admin/slots', icon: Clock },
    { label: 'Bookings', path: '/admin/bookings', icon: BookOpen },
    { label: 'Scan QR', path: '/admin/scan', icon: QrCode },
    { label: 'Walk-In', path: '/admin/walk-in', icon: UserPlus },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
    { label: 'Profile', path: '/admin/profile', icon: Building },
  ];

  const isPending = library?.status === 'PENDING' || user?.email?.includes('pending');
  const isRejected = library?.status === 'REJECTED';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-navy text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2.5 font-bold text-lg text-white">
              <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center text-white">
                <Building className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline">{library?.name || 'Library Admin'}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal/20 text-teal-light font-semibold">
                Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-tight">{user?.name}</p>
              <p className="text-[11px] text-slate-300 font-mono">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-slate-200 hover:text-white transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation if Approved */}
        {!isPending && !isRejected && (
          <div className="bg-navy-dark border-t border-white/10 px-4 sm:px-8 overflow-x-auto">
            <div className="max-w-7xl mx-auto flex items-center gap-1 py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      active
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isPending ? (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-amber-200 shadow-xl text-center mt-8">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Pending Approval</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Your library registration for <span className="font-semibold text-slate-900">{library?.name || 'Your Library'}</span> has been submitted to the platform owner.
              You will receive an automated confirmation once reviewed.
            </p>
            <div className="p-4 bg-amber-50 rounded-2xl text-xs text-amber-800 border border-amber-100 text-left mb-6">
              <p className="font-semibold mb-1">Current Status: PENDING</p>
              <p>While awaiting approval, you can inspect your profile or reach out to support.</p>
            </div>
            <Link
              to="/admin/profile"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
            >
              <Building className="w-4 h-4" />
              View Library Profile
            </Link>
          </div>
        ) : isRejected ? (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center mt-8">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Rejected</h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              The platform owner could not approve your listing at this time.
            </p>
            {library?.rejectionReason && (
              <div className="p-4 bg-rose-50 rounded-2xl text-xs text-rose-800 border border-rose-100 text-left mb-6">
                <p className="font-semibold mb-1">Reason for Rejection:</p>
                <p>{library.rejectionReason}</p>
              </div>
            )}
            <Link
              to="/admin/profile"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
            >
              <Building className="w-4 h-4" />
              Review & Update Profile
            </Link>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <ToastContainer />
      <DevPanel />
    </div>
  );
};
