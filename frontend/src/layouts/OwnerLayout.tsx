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
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 pb-16 md:pb-0">
      {/* Curved Full-Round Floating Top Navbar (Owner / Platform Admin) */}
      <header className="sticky top-3.5 z-40 px-2 sm:px-4 w-full max-w-[98vw] 2xl:max-w-[1550px] mx-auto transition-all">
        <div className="bg-white/95 backdrop-blur-md border-2 border-slate-200 shadow-md shadow-slate-900/5 rounded-full px-4 sm:px-5 xl:px-6 py-2 flex items-center justify-between gap-2 lg:gap-4 xl:gap-6">
          {/* Left: Logo */}
          <Link to="/owner" className="flex items-center gap-2.5 tracking-tight group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-[22px] xl:text-[23px] text-navy">
              Vidya<span className="text-accent font-black">Asana</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider hidden sm:inline-block">
              Platform Admin
            </span>
          </Link>

          {/* Right: Owner Profile & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 xl:gap-3.5 shrink-0">
            <div className="hidden sm:block text-right whitespace-nowrap max-w-[160px] xl:max-w-none">
              <p className="text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight truncate">{user?.name || 'Platform Director'}</p>
              <p className="text-[11px] text-slate-500 font-mono font-medium leading-none pt-0.5 truncate">{user?.email}</p>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4 stroke-[2.25]" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <ToastContainer />
      <DevPanel />
    </div>
  );
};

