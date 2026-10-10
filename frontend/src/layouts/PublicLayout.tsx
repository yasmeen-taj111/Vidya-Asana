import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpen, User, Building, LogIn, Sparkles } from 'lucide-react';
import { ToastContainer } from '../components/ui/ToastContainer';
import { DevPanel } from '../components/DevPanel';

export const PublicLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-navy tracking-tight">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>Vidya<span className="text-accent font-extrabold">Asana</span></span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${
                location.pathname === '/login'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white transition-all shadow-sm shadow-primary/25"
            >
              Student Sign Up
            </Link>
            <Link
              to="/register-library"
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-navy hover:bg-navy-dark text-white transition-all hidden sm:flex items-center gap-1.5"
            >
              <Building className="w-4 h-4 text-accent" />
              List Library
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-navy text-slate-300 py-12 border-t border-navy-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-lg text-white">
            <BookOpen className="w-5 h-5 text-accent" />
            <span>Vidya Asana</span>
          </div>
          <p className="text-sm text-slate-400">
            Intelligent library seat allocation & study environment management. CBC 2.0 Team CB049.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/register-library" className="hover:text-white transition-colors">Register Library</Link>
          </div>
        </div>
      </footer>

      <ToastContainer />
      <DevPanel />
    </div>
  );
};
