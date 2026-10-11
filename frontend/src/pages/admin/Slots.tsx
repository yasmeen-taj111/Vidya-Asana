import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { UnbookableInterval } from '../../api/types';
import { useUiStore } from '../../store/uiStore';
import { Clock, Plus, Trash2, Calendar, AlertTriangle, ShieldAlert, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export const Slots: React.FC = () => {
  const [intervals, setIntervals] = useState<UnbookableInterval[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [isRecurring, setIsRecurring] = useState(true);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('14:00');
  const [reason, setReason] = useState('Daily Sanitization & Staff Lunch');
  const [submitting, setSubmitting] = useState(false);

  const { addToast } = useUiStore();

  const loadIntervals = async () => {
    try {
      const data = await adminApi.getIntervals();
      setIntervals(data);
    } catch (err) {
      console.error('[Admin Slots] Failed to load intervals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntervals();
  }, []);

  const formatMinutesTo12 = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const handleAddInterval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || !reason.trim()) {
      addToast({
        type: 'warning',
        title: 'Validation Error',
        message: 'Please fill out start time, end time, and closure reason.',
      });
      return;
    }

    if (startTime >= endTime) {
      addToast({
        type: 'warning',
        title: 'Invalid Time Window',
        message: 'Start time must be earlier than end time.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createInterval({
        date: isRecurring ? null : date,
        startTime,
        endTime,
        reason: reason.trim(),
      });

      addToast({
        type: 'success',
        title: 'Closure Added',
        message: `Library will be marked closed from ${formatMinutesTo12(startTime)} to ${formatMinutesTo12(endTime)} for ${reason}.`,
      });

      setShowAddModal(false);
      setReason('');
      loadIntervals();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Add Interval',
        message: err.message || 'Could not save closure interval.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInterval = async (id: string, reasonLabel: string) => {
    if (!window.confirm(`Are you sure you want to remove the closure: "${reasonLabel}"?`)) {
      return;
    }

    try {
      await adminApi.deleteInterval(id);
      setIntervals((prev) => prev.filter((i) => i.id !== id));
      addToast({
        type: 'success',
        title: 'Closure Removed',
        message: `Re-opened time window: ${reasonLabel}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Remove Closure',
        message: err.message || 'Could not delete closure interval.',
      });
    }
  };

  const REASON_PRESETS = [
    'Daily Sanitization & Staff Lunch',
    'Deep Cleaning & Air Purifier Filter Reset',
    'Electrical & Power Line Maintenance',
    'Internal Staff Meeting & Training',
    'Holiday / Event Closure',
    'Emergency Maintenance',
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Closures & Unbookable Intervals
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure times when the library is closed. These intervals are rendered as blackout zones on the student slider and block bookings.
          </p>
        </div>

        <button
          onClick={() => {
            setIsRecurring(true);
            setStartTime('13:00');
            setEndTime('14:00');
            setReason('Daily Sanitization & Staff Lunch');
            setShowAddModal(true);
          }}
          className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Unbookable Interval</span>
        </button>
      </div>

      {/* Feature Explainer Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-indigo-50/40 to-slate-50 p-5 rounded-3xl border border-sky-100 shadow-xs flex items-start gap-3.5">
        <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
            Slider-Based Dynamic Booking System
          </h4>
          <p className="text-xs text-sky-900/80 leading-relaxed">
            Predefined static slots (Morning/Evening) have been replaced with <strong>continuous 30-minute slider booking (minimum 1 hour)</strong>. You no longer need to manage static slot blocks. Whenever the library needs to close for sanitization, power repairs, or staff breaks, simply add an interval below and students will see it locked out on their timeline.
          </p>
        </div>
      </div>

      {/* Closures Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">
            Active Closures ({intervals.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Real-time synchronization with user slider
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading scheduled library closures...
          </div>
        ) : intervals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">No Closures Scheduled</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                The library is fully open during operating hours without interruptions.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold text-primary hover:underline pt-2"
            >
              + Add a lunch or maintenance closure
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-5">Scope / Date</th>
                  <th className="py-3 px-5">Time Window</th>
                  <th className="py-3 px-5">Reason</th>
                  <th className="py-3 px-5">Slider Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {intervals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      {item.date ? (
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>{item.date}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                          Every Day (Recurring)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-black text-slate-900 font-mono">
                      {formatMinutesTo12(item.startTime)} – {formatMinutesTo12(item.endTime)}
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-800">{item.reason}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                        <ShieldAlert className="w-3 h-3" />
                        Blackout Zone
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleDeleteInterval(item.id, item.reason)}
                        aria-label={`Delete closure ${item.reason}`}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Unbookable Interval Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Library Closure</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Block an interval on the user slider with an optional reason.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddInterval} className="space-y-4">
              {/* Recurrence Scope */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Closure Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecurring(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      isRecurring
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Every Day (Daily)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecurring(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      !isRecurring
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Specific Date Only
                  </button>
                </div>
              </div>

              {/* Specific Date input if not recurring */}
              {!isRecurring && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Closure Date</label>
                  <input
                    type="date"
                    value={date}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-primary"
                  />
                </div>
              )}

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Start Time</label>
                  <input
                    type="time"
                    step="1800"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">End Time</label>
                  <input
                    type="time"
                    step="1800"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-primary"
                  />
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Closure Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch Break, Sanitization, Power Maintenance"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  maxLength={120}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-primary"
                />
              </div>

              {/* Preset Reason Quick Pills */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Reason Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {REASON_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReason(p)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-lg transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving Closure...' : 'Save Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
