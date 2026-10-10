import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useUiStore } from '../../store/uiStore';
import { getStoredUsers } from '../../mocks/storage';
import { BookOpen, LogIn, Key, Mail, Sparkles, Shield, Building, User, Clock } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SITE_OWNER') {
        navigate('/owner', { replace: true });
      } else if (user.role === 'LIBRARY_ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const targetEmail = customEmail || email;
    const targetPassword = customPass || password;

    if (!targetEmail || !targetPassword) {
      addToast({ type: 'warning', title: 'Input required', message: 'Please enter your email and password.' });
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.login({ email: targetEmail, password: targetPassword });
      setAuth(data.user, data.accessToken);
      addToast({
        type: 'success',
        title: `Welcome back, ${data.user.name}!`,
        message: 'Successfully authenticated.',
      });

      if (data.user.role === 'SITE_OWNER') {
        navigate('/owner');
      } else if (data.user.role === 'LIBRARY_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      // Instant demo login fallback if local or mock user exists
      const allUsers = getStoredUsers();
      const demoUser = allUsers.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());
      if (demoUser) {
        setAuth(demoUser, `mock-token-${demoUser.id}-${Date.now()}`);
        addToast({
          type: 'success',
          title: `Welcome back, ${demoUser.name}!`,
          message: 'Authenticated demo profile.',
        });
        if (demoUser.role === 'SITE_OWNER') navigate('/owner');
        else if (demoUser.role === 'LIBRARY_ADMIN') navigate('/admin');
        else navigate('/app');
        return;
      }

      addToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message || 'Invalid email or password.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(undefined, demoEmail, demoPass);
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 sm:px-0">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Sign in to Vidya Asana</h2>
          <p className="text-xs text-slate-500">Access your study bookings or library management console</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-all shadow-md shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo One-Click Login Options */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
            Instant Demo Logins (Seed Accounts)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('student@vidyaasana.test', 'Student@1234')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-primary/10 hover:text-primary text-slate-700 border border-slate-200 text-left transition-all text-xs font-medium flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Student (User)</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@vidyaasana.test', 'Admin@1234')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal/10 hover:text-teal text-slate-700 border border-slate-200 text-left transition-all text-xs font-medium flex items-center gap-2"
            >
              <Building className="w-3.5 h-3.5 text-teal" />
              <span>Library Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('owner@vidyaasana.test', 'Owner@1234')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-accent/10 hover:text-accent text-slate-700 border border-slate-200 text-left transition-all text-xs font-medium flex items-center gap-2"
            >
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span>Site Owner</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('pending@vidyaasana.test', 'Admin@1234')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-100 hover:text-amber-800 text-slate-700 border border-slate-200 text-left transition-all text-xs font-medium flex items-center gap-2"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Admin</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
