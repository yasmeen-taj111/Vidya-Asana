import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { Booking, TimeSlot } from '../../api/types';
import { BookOpen, Calendar, Filter, QrCode } from 'lucide-react';

export const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedSlotId, selectedStatus]);

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
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        <div>
          <span className="text-slate-400 block font-medium mb-1">Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 outline-none"
          />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
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
