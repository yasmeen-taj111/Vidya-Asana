import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { AnalyticsSummary, AnalyticsTimeseriesPoint } from '../../api/types';

interface AnalyticsChartsProps {
  summary: AnalyticsSummary;
  timeseries: AnalyticsTimeseriesPoint[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ summary, timeseries }) => {
  const pieData = [
    { name: 'Booked Seats', value: summary.bookedSeats, color: '#2B5BE0' },
    { name: 'Available Seats', value: summary.availableSeats, color: '#E2E8F0' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Booked vs Available Donut Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Real-Time Capacity Utilization</h4>
          <p className="text-xs text-slate-500 mt-0.5">Booked vs Available study desks</p>
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
              Occupied
            </span>
          </div>
        </div>

        <div className="flex justify-around text-xs pt-3 border-t border-slate-100 text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <span>Booked ({summary.bookedSeats})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-200" />
            <span>Available ({summary.availableSeats})</span>
          </div>
        </div>
      </div>

      {/* Timeseries Bar Chart */}
      <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Slot Utilization Breakdown</h4>
            <p className="text-xs text-slate-500 mt-0.5">Seat reservations per time window</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-light text-teal-dark">
            Peak: Afternoon
          </span>
        </div>

        <div className="h-56 my-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                formatter={(val: number) => [`${val} seats`, 'Reserved']}
                contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }}
              />
              <Bar dataKey="booked" fill="#2B5BE0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span>Capacity: {summary.totalSeats} seats total</span>
          <span>Revenue: ₹{(summary.revenuePaise / 100).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
