import React, { useState } from 'react';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { mockSocketInstance } from '../realtime/socket';
import { mockUsers } from '../mocks/db';
import { Wrench, ChevronUp, ChevronDown, BellRing, RefreshCw, UserCheck } from 'lucide-react';

export const DevPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const { alwaysFailNext, setAlwaysFailNext, addToast } = useUiStore();
  const { user, setAuth } = useAuthStore();

  const handleSwitchAccount = (email: string) => {
    const target = mockUsers.find((u) => u.email === email);
    if (target) {
      setAuth(target, `dev-token-${target.id}`);
      addToast({
        type: 'info',
        title: 'Switched Role',
        message: `Active user changed to ${target.name} (${target.role})`,
      });
      // reload or redirect
      window.location.reload();
    }
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
          <div className="p-4 space-y-3.5 border-t border-slate-800 bg-slate-900/90 backdrop-blur-sm">
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
                <span>Quick Role Switcher (Current: {user?.role || 'Guest'})</span>
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
                  👤 Student
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
