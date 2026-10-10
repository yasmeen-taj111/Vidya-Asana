import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { Booking, TimeSlot } from '../../api/types';
import { BookOpen, Calendar, Filter, QrCode, RefreshCw, LogOut, XCircle, Check, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useSeatUpdates } from '../../realtime/useSeatUpdates';

export const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { addToast } = useUiStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      setLoading(true);
      const [bData, sData] = await Promise.all([
        adminApi.getBookings({
          date: selectedDate || undefined,
          slotId: selectedSlotId || undefined,
          status: selectedStatus || undefined,
        }),
        adminApi.getSlots(),
      ]);
      setBookings(bData.bookings);
      setSlots(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    bookingId: string,
    status: 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  ) => {
    try {
      setUpdatingId(bookingId);
      await adminApi.updateBookingStatus(bookingId, status);
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Booking has been marked as ${status}.`,
      });
      await loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not alter booking status.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedSlotId, selectedStatus]);

  // Real-time updates: refresh table when new reservations occur
  useSeatUpdates(user?.libraryId, () => {
    loadData();
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Seat Reservation Logs
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Real-time record of confirmed passes, active check-ins, and walk-ins.
        </p>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-slate-400 block font-medium mb-1">Date:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 outline-none text-slate-800 font-semibold"
              />
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className={`px-3 py-2 rounded-xl font-bold transition-all ${
                  !selectedDate
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-2 rounded-xl font-bold transition-all ${
                  selectedDate === todayStr
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Today
              </button>
            </div>
          </div>

        <div>
          <span className="text-slate-400 block font-medium mb-1">Time Slot:</span>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 outline-none"
          >
            <option value="">All Slots</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startTime} - {s.endTime})
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="text-slate-400 block font-medium mb-1">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </div>
      </div>
    </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-4 px-6">Pass Code</th>
                <th className="py-4 px-6">Seat & Floor</th>
                <th className="py-4 px-6">Date & Slot</th>
                <th className="py-4 px-6">Student / Guest</th>
                <th className="py-4 px-6">Source</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No reservations matching selected criteria.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-mono font-black text-navy">{b.code}</td>
                    <td className="py-4 px-6">
                      <span className="font-extrabold text-slate-900">{b.seat.label}</span>
                      <span className="block text-[11px] text-slate-400">{b.floorLabel}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-800">{b.date}</span>
                      <span className="block text-[11px] text-slate-400">
                        {b.slot.name} ({b.slot.startTime} – {b.slot.endTime})
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-800 font-medium">{b.guestName || 'Aarav Patel'}</td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {b.source}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      ₹{(b.pricePaise / 100).toFixed(0)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === 'CHECKED_IN'
                            ? 'bg-blue-100 text-blue-800'
                            : b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'NO_SHOW'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'CHECKED_IN' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1"
                              title="Check out user early and release desk"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Check Out</span>
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-colors"
                              title="Cancel reservation"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {b.status === 'CONFIRMED' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'CHECKED_IN')}
                              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] border border-primary/20 transition-colors flex items-center gap-1"
                              title="Check in student arrival"
                            >
                              <Check className="w-3 h-3" />
                              <span>Check In</span>
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'NO_SHOW')}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200 transition-colors"
                              title="Mark as No-Show and release seat"
                            >
                              No-Show
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-colors"
                              title="Cancel reservation"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'NO_SHOW') && (
                          <button
                            type="button"
                            disabled={updatingId === b.id}
                            onClick={() => handleUpdateStatus(b.id, 'CHECKED_IN')}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[10px] transition-colors flex items-center gap-1"
                            title="Re-open and check in"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Re-Check In</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
