import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
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
  RotateCw,
  ArrowLeft,
} from 'lucide-react';
import { ToastContainer } from '../components/ui/ToastContainer';
import { DevPanel } from '../components/DevPanel';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { addToast } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchLibrary = async (showFeedback = false) => {
    try {
      const data = await adminApi.getLibrary();
      setLibrary(data);
      if (showFeedback) {
        if (data.status === 'APPROVED') {
          addToast({
            type: 'success',
            title: 'Library Approved! 🎉',
            message: 'Your library registration has been verified and approved. Dashboard unlocked!',
          });
        } else if (data.status === 'REJECTED') {
          addToast({
            type: 'error',
            title: 'Registration Rejected',
            message: data.rejectionReason || 'The platform owner could not approve this library listing.',
          });
        } else {
          addToast({
            type: 'info',
            title: 'Status Checked',
            message: 'Registration is currently PENDING review by the platform owner.',
          });
        }
      }
      return data;
    } catch (err: any) {
      console.error(err);
      if (showFeedback) {
        addToast({
          type: 'warning',
          title: 'Status Check',
          message: err.message || 'Could not verify status. Please try again.',
        });
      }
      return null;
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [location.pathname]);

  const handleCheckStatus = async () => {
    setChecking(true);
    await fetchLibrary(true);
  };

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

  const pendingNavItems = [
    { label: 'Approval Status', path: '/admin', icon: Clock },
    { label: 'Library Profile', path: '/admin/profile', icon: Building },
  ];

  const isPending = library ? library.status === 'PENDING' : (user?.email?.toLowerCase().includes('pending') ?? false);
  const isRejected = library?.status === 'REJECTED';
  const isProfilePage = location.pathname === '/admin/profile';

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

        {/* Tab Navigation */}
        {!isRejected && (
          <div className="bg-navy-dark border-t border-white/10 px-4 sm:px-8 overflow-x-auto">
            <div className="max-w-7xl mx-auto flex items-center gap-1 py-1">
              {(isPending ? pendingNavItems : navItems).map((item) => {
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
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-9 h-9 border-4 border-primary/25 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading library details...</p>
          </div>
        ) : isPending && !isProfilePage ? (
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
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-75 shadow-md shadow-primary/20 transition-all cursor-pointer"
              >
                <RotateCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking Status...' : 'Check Approval Status'}
              </button>
              <Link
                to="/admin/profile"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
              >
                <Building className="w-4 h-4" />
                View Library Profile
              </Link>
            </div>
          </div>
        ) : isPending && isProfilePage ? (
          <div>
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between flex-wrap gap-3 max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Registration Pending Approval</p>
                  <p className="text-[11px] text-amber-700">You can review and update your library profile while awaiting verification.</p>
                </div>
              </div>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200 hover:bg-slate-50 shadow-sm transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Approval Status
              </Link>
            </div>
            <Outlet />
          </div>
        ) : isRejected && !isProfilePage ? (
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
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking Status...' : 'Check Approval Status'}
              </button>
              <Link
                to="/admin/profile"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-md"
              >
                <Building className="w-4 h-4" />
                Review & Update Profile
              </Link>
            </div>
          </div>
        ) : (
          <>
            {isRejected && isProfilePage && (
              <div className="mb-6 max-w-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border bg-rose-50 border-rose-200 text-rose-900 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-rose-100 text-rose-700">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">
                      Library Registration Rejected
                    </p>
                    <p className="text-[11px] opacity-80">
                      You can inspect and update your library profile details here.
                    </p>
                  </div>
                </div>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Status
                </Link>
              </div>
            )}
            <Outlet />
          </>
        )}
      </main>

      <ToastContainer />
      <DevPanel />
    </div>
  );
};
