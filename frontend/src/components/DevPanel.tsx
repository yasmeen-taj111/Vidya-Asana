import React, { useState } from 'react';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { mockSocketInstance } from '../realtime/socket';
import { getStoredUsers, clearMemoryStore } from '../mocks/storage';
import { mockUsers as initialMockUsers } from '../mocks/db';
import { Wrench, ChevronUp, ChevronDown, BellRing, UserCheck, RotateCcw } from 'lucide-react';

export const DevPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const { alwaysFailNext, setAlwaysFailNext, addToast } = useUiStore();
  const { user, setAuth } = useAuthStore();

  const allUsers = getStoredUsers();
  const customUsers = allUsers.filter(
    (u) =>
      u.email.toLowerCase() !== 'owner@vidyaasana.test' &&
      u.email.toLowerCase() !== 'admin@vidyaasana.test' &&
      u.email.toLowerCase() !== 'pending@vidyaasana.test' &&
      u.email.toLowerCase() !== 'student@vidyaasana.test'
  );

  const handleSwitchAccount = (email: string) => {
    const target = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (target) {
      setAuth(target, `dev-token-${target.id}-${Date.now()}`);
      addToast({
        type: 'info',
        title: 'Switched Role',
        message: `Active user changed to ${target.name} (${target.role})`,
      });
      const dest =
        target.role === 'SITE_OWNER'
          ? '/owner'
          : target.role === 'LIBRARY_ADMIN'
          ? '/admin'
          : '/app';
      window.location.href = dest;
    }
  };

  const handleResetData = () => {
    localStorage.removeItem('va_mock_users');
    localStorage.removeItem('va_mock_bookings');
    localStorage.removeItem('va_mock_study_sessions');
    localStorage.removeItem('va_mock_notifications');
    localStorage.removeItem('va_mock_waitlist');
    localStorage.removeItem('va_mock_preferences');
    localStorage.removeItem('va_user');
    localStorage.removeItem('va_token');
    clearMemoryStore();

    // Auto-select demo student on clean reset so app is immediately usable
    const demoStudent = initialMockUsers.find((u) => u.id === 'usr-4') || initialMockUsers[3];
    if (demoStudent) {
      setAuth(demoStudent, `dev-token-${demoStudent.id}-${Date.now()}`);
    }

    addToast({
      type: 'warning',
      title: 'Mock Data Reset',
      message: 'Demo state restored to defaults.',
    });
    window.location.href = '/app';
  };

  const triggerTestReminder = () => {
    mockSocketInstance.simulateReminder('bk-101');
    addToast({
      type: 'warning',
      title: 'Demo Reminder Emitted',
      message: 'Triggered simulated socket "booking:reminder" event.',
    });
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden text-xs max-w-xs transition-all">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full px-4 py-2.5 flex items-center justify-between font-mono font-medium hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-accent" />
            <span>Dev / Demo Panel</span>
          </div>
          {collapsed ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {!collapsed && (
          <div className="p-4 space-y-3.5 border-t border-slate-800 bg-slate-900/90 backdrop-blur-sm max-h-[80vh] overflow-y-auto">
            {/* Conflict toggle */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Trigger Seat Conflict (409)</span>
                <input
                  type="checkbox"
                  checked={alwaysFailNext}
                  onChange={(e) => {
                    setAlwaysFailNext(e.target.checked);
                    addToast({
                      type: e.target.checked ? 'warning' : 'info',
                      title: 'Conflict Mode',
                      message: e.target.checked
                        ? 'Next booking attempt will simulate SEAT_UNAVAILABLE with alternatives.'
                        : 'Normal booking mode restored.',
                    });
                  }}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Fails next booking to showcase alternatives modal.
              </p>
            </div>

            {/* Simulated Reminder */}
            <div>
              <button
                onClick={triggerTestReminder}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate No-Show Prompt</span>
              </button>
            </div>

            {/* Quick role switcher */}
            <div>
              <div className="text-slate-400 font-mono text-[11px] mb-1.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-primary" />
                <span>Role Switcher (Active: {user?.name || 'Guest'})</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleSwitchAccount('owner@vidyaasana.test')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-left rounded text-[11px] text-slate-200 truncate"
                >
                  👑 Site Owner
                </button>
                <button
                  onClick={() => handleSwitchAccount('admin@vidyaasana.test')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-left rounded text-[11px] text-slate-200 truncate"
                >
                  🏛 Lib Admin (Appr)
                </button>
                <button
                  onClick={() => handleSwitchAccount('pending@vidyaasana.test')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-left rounded text-[11px] text-slate-200 truncate"
                >
                  ⏳ Lib Admin (Pend)
                </button>
                <button
                  onClick={() => handleSwitchAccount('student@vidyaasana.test')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-left rounded text-[11px] text-slate-200 truncate"
                >
                  👤 Demo Student
                </button>
              </div>

              {customUsers.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <div className="text-slate-400 text-[10px] mb-1 font-mono">Custom Registered Accounts:</div>
                  <div className="space-y-1">
                    {customUsers.map((cu) => (
                      <button
                        key={cu.id}
                        onClick={() => handleSwitchAccount(cu.email)}
                        className={`w-full p-1.5 text-left rounded text-[11px] truncate flex items-center justify-between ${
                          user?.email === cu.email ? 'bg-primary/20 text-accent font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="truncate">{cu.name}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({cu.role})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reset button */}
            <div className="pt-1">
              <button
                onClick={handleResetData}
                className="w-full py-1.5 px-2 bg-slate-800/60 hover:bg-red-950/40 text-slate-400 hover:text-red-300 rounded text-[10px] flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Local Mock Data</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
