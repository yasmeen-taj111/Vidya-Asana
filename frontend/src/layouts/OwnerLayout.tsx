import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck, LogOut, Building, BarChart3, BookOpen } from 'lucide-react';
import { ToastContainer } from '../components/ui/ToastContainer';
import { DevPanel } from '../components/DevPanel';

export const OwnerLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-navy text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/owner" className="flex items-center gap-2.5 font-bold text-xl text-white">
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span>Vidya Asana <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-accent font-semibold ml-1">Platform Admin</span></span>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/owner"
                className="text-sm font-medium px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <Building className="w-4 h-4 text-accent" />
                Library Approvals
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{user?.name || 'Site Owner'}</p>
              <p className="text-xs text-slate-300 font-mono">{user?.email}</p>
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
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <ToastContainer />
      <DevPanel />
    </div>
  );
};

