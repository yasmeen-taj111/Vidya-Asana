import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { AnalyticsSummary, Booking } from '../../api/types';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  QrCode,
  UserPlus,
  Grid,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export const Overview: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getAnalyticsSummary(), adminApi.getBookings({ page: 1 })])
      .then(([sData, bData]) => {
        setSummary(sData);
        setRecentBookings(bData.bookings.slice(0, 5));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const pieData = summary
    ? [
        { name: 'Booked', value: summary.bookedSeats, color: '#2B5BE0' },
        { name: 'Available', value: summary.availableSeats, color: '#E2E8F0' },
      ]
    : [];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Quick Stat Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white py-3 px-4 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Capacity</span>
            <p className="text-2xl font-black text-slate-900">{summary.totalSeats} Desks</p>
          </div>
          <div className="bg-white py-3 px-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Checked In</span>
            <p className="text-2xl font-black text-emerald-700">{summary.checkedIn}</p>
          </div>
          <div className="bg-white py-3 px-4 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-sm space-y-0.5">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">No-Shows Reclaimed</span>
            <p className="text-2xl font-black text-rose-700">{summary.noShows}</p>
          </div>
          <div className="bg-white py-3 px-4 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
            <span className="text-[11px] font-bold text-teal uppercase tracking-wider">Today's Revenue</span>
            <p className="text-2xl font-black text-teal">₹{(summary.revenuePaise / 100).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Donut + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Utilization Donut */}
        {summary && (
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-primary/15 shadow-lg shadow-primary/5 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">Today's Seat Occupancy</h3>
            </div>

            <div className="h-36 sm:h-40 relative flex items-center justify-center my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-black text-navy font-mono">{summary.bookedPercent}%</span>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                  Booked
                </span>
              </div>
            </div>

            <div className="flex justify-around text-xs pt-2 border-t border-slate-100 font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Booked: {summary.bookedSeats}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Free: {summary.availableSeats}
              </span>
            </div>
          </div>
        )}

        {/* Quick Action Station */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl border border-primary/15 shadow-lg shadow-primary/5 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">Front Desk Operations</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/admin/scan"
              className="p-3.5 sm:p-4 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 transition-all text-center group space-y-1.5 shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary text-white flex items-center justify-center mx-auto shadow-sm shadow-primary/25 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">Scan Entry QR</h4>
              <p className="text-xs text-slate-500">Camera or code scan</p>
            </Link>

            <Link
              to="/admin/walk-in"
              className="p-3.5 sm:p-4 rounded-xl bg-teal-light hover:bg-teal/20 border border-teal/20 hover:border-teal/40 transition-all text-center group space-y-1.5 shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal text-white flex items-center justify-center mx-auto shadow-sm shadow-teal/25 group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">Walk-In Booking</h4>
              <p className="text-xs text-slate-500">Assign on-the-spot seats</p>
            </Link>

            <Link
              to="/admin/seats"
              className="p-3.5 sm:p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all text-center group space-y-1.5 shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-navy text-white flex items-center justify-center mx-auto shadow-sm shadow-navy/25 group-hover:scale-105 transition-transform">
                <Grid className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">Edit Floor Layout</h4>
              <p className="text-xs text-slate-500">Interactive grid builder</p>
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">Need detailed analytical insights?</span>
            <Link to="/admin/analytics" className="font-extrabold text-primary hover:text-primary-hover flex items-center gap-1.5 transition-colors">
              <span>View Analytics & Download Reports</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Bookings Feed */}
      <div className="bg-white rounded-2xl border border-primary/15 shadow-lg shadow-primary/5 overflow-hidden p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">Today's Active Reservations</h3>
          </div>
          <Link
            to="/admin/bookings"
            className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs transition-all shadow-xs hover:shadow-md"
          >
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Pass Code</th>
                <th className="py-2.5 px-4">Seat</th>
                <th className="py-2.5 px-4">Slot Timing</th>
                <th className="py-2.5 px-4">Student</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-black text-navy text-xs sm:text-sm">{b.code}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{b.seat.label}</td>
                  <td className="py-2.5 px-4 text-slate-600 font-medium">{b.slot.name} ({b.slot.startTime} - {b.slot.endTime})</td>
                  <td className="py-2.5 px-4 text-slate-800 font-semibold">{b.guestName || 'Aarav Patel'}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider inline-block ${
                        b.status === 'CHECKED_IN'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
