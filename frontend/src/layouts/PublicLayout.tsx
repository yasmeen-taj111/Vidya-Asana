import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BookOpen, User, Building, LogIn, Sparkles, LayoutDashboard } from 'lucide-react';
import { ToastContainer } from '../components/ui/ToastContainer';
import { DevPanel } from '../components/DevPanel';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans">
      <header className="sticky top-4 z-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-slate-900/5 rounded-2xl sm:rounded-full px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 tracking-tight group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-xl sm:text-2xl text-navy">
              Vidya<span className="text-accent italic font-normal">Asana</span>
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated && user ? (
              <Link
                to={user.role === 'SITE_OWNER' ? '/owner' : user.role === 'LIBRARY_ADMIN' ? '/admin' : '/app'}
                className="text-xs uppercase tracking-widest font-bold px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/20 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`text-xs uppercase tracking-widest font-bold px-3 py-2 rounded-full transition-all ${
                    location.pathname === '/login'
                      ? 'text-navy font-black'
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs uppercase tracking-widest font-bold px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover active:bg-[#1d44b8] text-white transition-all shadow-md shadow-primary/20 transform hover:-translate-y-0.5"
                >
                  Student Sign Up
                </Link>
                <Link
                  to="/register-library"
                  className="text-xs uppercase tracking-widest font-bold px-5 py-2.5 rounded-full bg-navy hover:bg-navy-dark text-white transition-all hidden sm:flex items-center gap-1.5 shadow-sm transform hover:-translate-y-0.5"
                >
                  <Building className="w-3.5 h-3.5 text-accent" />
                  <span>List Library</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-navy text-slate-300 py-3 sm:py-4 border-t border-navy-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <BookOpen className="w-4 h-4 text-accent" />
            <span>Vidya Asana</span>
          </div>
          <p className="text-slate-400 text-center sm:text-left">
            Intelligent library seat allocation & study space management • Team CB049
          </p>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <span>•</span>
            <Link to="/register-library" className="hover:text-white transition-colors">Register Library</Link>
          </div>
        </div>
      </footer>

      <ToastContainer />
      <DevPanel />
    </div>
  );
};
