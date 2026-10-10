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
    <div className="space-y-8">
      {/* Quick Stat Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Capacity</span>
            <p className="text-2xl font-black text-slate-900">{summary.totalSeats} Desks</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Checked In</span>
            <p className="text-2xl font-black text-emerald-700">{summary.checkedIn}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-rose-200/80 bg-rose-50/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">No-Shows Reclaimed</span>
            <p className="text-2xl font-black text-rose-700">{summary.noShows}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-teal uppercase tracking-wider">Today's Revenue</span>
            <p className="text-2xl font-black text-teal">₹{(summary.revenuePaise / 100).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Donut + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Donut */}
        {summary && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Today's Seat Occupancy</h3>
              <p className="text-xs text-slate-500 mt-0.5">Live booked percentage vs idle capacity</p>
            </div>

            <div className="h-56 relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={65}
                    outerRadius={85}
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
                <span className="text-3xl font-black text-navy">{summary.bookedPercent}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Booked
                </span>
              </div>
            </div>

            <div className="flex justify-around text-xs pt-3 border-t border-slate-100 text-slate-600">
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
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Front Desk Operations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Rapid access to student verification and desk allocation</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/admin/scan"
              className="p-5 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-all text-center group space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-slate-900">Scan Entry QR</h4>
              <p className="text-[11px] text-slate-500">Camera or code scan</p>
            </Link>

            <Link
              to="/admin/walk-in"
              className="p-5 rounded-2xl bg-teal-light hover:bg-teal/20 border border-teal/20 transition-all text-center group space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-teal text-white flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-slate-900">Walk-In Booking</h4>
              <p className="text-[11px] text-slate-500">Assign on-the-spot seats</p>
            </Link>

            <Link
              to="/admin/seats"
              className="p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-center group space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition-transform">
                <Grid className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-slate-900">Edit Floor Layout</h4>
              <p className="text-[11px] text-slate-500">Interactive grid builder</p>
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need detailed trends?</span>
            <Link to="/admin/analytics" className="font-bold text-primary hover:underline flex items-center gap-1">
              View Analytics & Download Reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Bookings Feed */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Today's Active Reservations</h3>
          <Link to="/admin/bookings" className="text-xs font-semibold text-primary hover:underline">
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Pass Code</th>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-navy">{b.code}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{b.seat.label}</td>
                  <td className="py-3 px-4 text-slate-600">{b.slot.name} ({b.slot.startTime} - {b.slot.endTime})</td>
                  <td className="py-3 px-4 text-slate-800">{b.guestName || 'Aarav Patel'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'CHECKED_IN'
                          ? 'bg-blue-100 text-blue-800'
                          : b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
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
