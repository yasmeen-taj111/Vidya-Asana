import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { bookingsApi } from '../api/bookings';
import { getSocket, mockSocketInstance } from '../realtime/socket';
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

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const checkActiveSlots = async () => {
      try {
        const response = await bookingsApi.getMyBookings();
        const list: any[] = (response as any).bookings || (response as any).data || (Array.isArray(response) ? response : []);
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const curH = String(now.getHours()).padStart(2, '0');
        const curM = String(now.getMinutes()).padStart(2, '0');
        const curTimeStr = `${curH}:${curM}`;
        const nowMs = now.getTime();

        for (const b of list) {
          const bDate = typeof b.date === 'string' ? b.date.substring(0, 10) : '';
          const [startH, startM] = (b.slot?.startTime || '00:00').split(':').map(Number);
          
          let slotStartMs = 0;
          if (bDate) {
            const [yr, mo, dy] = bDate.split('-').map(Number);
            slotStartMs = new Date(yr, mo - 1, dy, startH, startM, 0, 0).getTime();
          }
          const defaultBufferExpiryMs = slotStartMs > 0 ? slotStartMs + 15 * 60 * 1000 : 0;
          const graceMs = b.graceUntil ? new Date(b.graceUntil).getTime() : defaultBufferExpiryMs;

          // Check if active reminder is open for this booking but it is now NO_SHOW or CANCELLED
          const curReminder = useUiStore.getState().activeReminder;
          if (curReminder?.bookingId === b.id && (b.status === 'NO_SHOW' || b.status === 'CANCELLED')) {
            useUiStore.getState().setReminder(null);
            useUiStore.getState().addToast({
              type: 'error',
              title: 'Slot Cancelled',
              message: `Your reservation for seat ${b.seat?.label || 'your seat'} at ${b.libraryName} was automatically cancelled because the 15-minute buffer expired.`,
            });
          }

          if (b.status === 'CONFIRMED' && !b.checkedInAt) {
            const hasStarted = slotStartMs > 0 && nowMs >= slotStartMs;
            if (hasStarted) {
              const bufferExpired = b.arrivalConfirmed
                ? (graceMs > 0 && nowMs >= graceMs)
                : (nowMs >= Math.max(defaultBufferExpiryMs, graceMs));

              if (bufferExpired) {
                // 15-minute buffer expired! Auto cancel and trigger release notification
                try {
                  await bookingsApi.cancelBooking(b.id);
                } catch {}
                const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
                if (useMocks) {
                  mockSocketInstance.simulateBookingReleased(
                    b.id,
                    'NO_SHOW',
                    `Your reservation for seat ${b.seat?.label || 'your seat'} at ${b.libraryName} was automatically cancelled because the 15-minute buffer expired.`
                  );
                }
              } else if (!b.arrivalConfirmed && !useUiStore.getState().activeReminder) {
                // Within 15-minute buffer -> immediately open reminder popup modal
                useUiStore.getState().setReminder({
                  bookingId: b.id,
                  message: `Your study slot at ${b.libraryName} (${b.seat?.label || 'Seat'}) has started. Are you coming or not for the slot?`,
                  graceUntil: b.graceUntil || new Date(defaultBufferExpiryMs).toISOString(),
                });
                break;
              }
            }
          }
        }
      } catch {
        // Ignore background polling errors
      }
    };

    checkActiveSlots();
    const interval = setInterval(checkActiveSlots, 5000);

    const handleReleased = (data: { bookingId: string; reason: string; message?: string }) => {
      const curReminder = useUiStore.getState().activeReminder;
      if (curReminder?.bookingId === data.bookingId) {
        useUiStore.getState().setReminder(null);
      }
      useUiStore.getState().addToast({
        type: 'error',
        title: 'Slot Cancelled',
        message:
          data.message ||
          'Your seat reservation was cancelled automatically because the 15-minute buffer expired.',
      });
    };

    const handleReminder = (data: { bookingId: string; message: string; graceUntil: string }) => {
      useUiStore.getState().setReminder(data);
    };

    socket.on('booking:released', handleReleased as (...args: unknown[]) => void);
    socket.on('booking:reminder', handleReminder as (...args: unknown[]) => void);

    return () => {
      clearInterval(interval);
      socket.off('booking:released', handleReleased as (...args: unknown[]) => void);
      socket.off('booking:reminder', handleReminder as (...args: unknown[]) => void);
    };
  }, [user, location.pathname]);

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
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 pb-16 md:pb-0">
      {/* Bolder, Curved Full-Round Floating Top Navbar */}
      <header className="sticky top-3.5 z-40 px-2 sm:px-4 w-full max-w-[98vw] 2xl:max-w-[1550px] mx-auto transition-all">
        <div className="bg-white/95 backdrop-blur-md border-2 border-slate-200 shadow-md shadow-slate-900/5 rounded-full px-4 sm:px-5 xl:px-6 py-2 flex items-center justify-between gap-2 lg:gap-4 xl:gap-6">
          {/* Left: Logo */}
          <Link to="/app" className="flex items-center gap-2.5 tracking-tight group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-[22px] xl:text-[23px] text-navy">
              Vidya<span className="text-accent font-black">Asana</span>
            </span>
          </Link>

          {/* Center: Navigation Buttons */}
          <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 flex-1 mx-2">
            {navLinks.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 xl:px-4 py-1.5 rounded-full text-[14px] xl:text-[15px] font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'text-slate-700 hover:text-navy hover:bg-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: User Profile & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 xl:gap-3.5 shrink-0">
            <NotificationBell />

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden sm:block text-right whitespace-nowrap max-w-[150px] xl:max-w-none">
              <p className="text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight truncate">{user?.name || 'Student'}</p>
              <p className="text-[11px] text-slate-500 font-mono font-medium leading-none pt-0.5 truncate">{user?.email}</p>
            </div>

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
