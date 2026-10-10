import React, { useState, useMemo } from 'react';
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
  CartesianGrid,
} from 'recharts';
import { AnalyticsSummary, AnalyticsTimeseriesPoint } from '../../api/types';
import { ChevronDown } from 'lucide-react';

interface AnalyticsChartsProps {
  summary: AnalyticsSummary;
  timeseries: AnalyticsTimeseriesPoint[];
  selectedPeriod?: 'Today' | 'This Week' | 'This Month';
  onPeriodChange?: (period: 'Today' | 'This Week' | 'This Month') => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  summary,
  timeseries,
  selectedPeriod: controlledPeriod,
  onPeriodChange,
}) => {
  const [internalPeriod, setInternalPeriod] = useState<'Today' | 'This Week' | 'This Month'>('Today');
  const selectedPeriod = controlledPeriod ?? internalPeriod;

  const handlePeriodToggle = () => {
    const next: 'Today' | 'This Week' | 'This Month' =
      selectedPeriod === 'Today' ? 'This Week' : selectedPeriod === 'This Week' ? 'This Month' : 'Today';
    if (onPeriodChange) {
      onPeriodChange(next);
    } else {
      setInternalPeriod(next);
    }
  };

  const pieData = [
    { name: 'Booked Seats', value: summary.bookedSeats, color: '#2B5BE0' },
    { name: 'Available Seats', value: summary.availableSeats, color: '#E2E8F0' },
  ];

  // Map timeseries data into stacked chart data (booked + available = capacity)
  const chartData = useMemo(() => {
    return timeseries.map((pt) => {
      const booked = pt.booked || 0;
      const capacity = pt.capacity || summary.totalSeats || booked;
      const available = Math.max(0, capacity - booked);
      return {
        label: pt.label,
        booked,
        available,
        capacity,
        percent: pt.percent ?? (capacity > 0 ? Math.round((booked / capacity) * 100) : 0),
      };
    });
  }, [timeseries, summary.totalSeats]);

  // Find peak slot
  const peakSlot = useMemo(() => {
    if (!timeseries || timeseries.length === 0) return 'Afternoon';
    const top = timeseries.reduce(
      (max, curr) => (curr.booked > max.booked ? curr : max),
      timeseries[0]
    );
    const match = top.label.match(/\(([^)]+)\)/);
    if (match) return match[1];
    return top.label.split(' ')[0] || 'Afternoon';
  }, [timeseries]);

  // Format X-axis tick labels
  const formatXAxisLabel = (label: string) => {
    if (!label) return '';
    const match = label.match(/\(([^)]+)\)/);
    if (match) return match[1];
    const firstWord = label.split(' ')[0];
    if (firstWord && isNaN(Number(firstWord))) {
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
    return label;
  };

  // Custom Tooltip matching ChartTooltipContent
  const ChartTooltipContent = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3.5 rounded-xl shadow-xl border border-slate-100 min-w-[200px] text-xs space-y-2 pointer-events-none animate-scale-up">
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">
            {data.label}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" />
                Booked Seats
              </span>
              <span className="font-bold text-slate-900">{data.booked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#CBD5E1]" />
                Available Seats
              </span>
              <span className="font-bold text-slate-900">{data.available}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
              <span className="text-slate-500">Occupancy</span>
              <span className="font-bold text-blue-600">{data.percent}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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

      {/* Stacked Bar Chart Card */}
      <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2">
          <div>
            <h4 className="font-bold text-slate-900 text-base">Slot Utilization Breakdown</h4>
            <p className="text-xs text-slate-500 mt-0.5">Seat reservations per time window</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-light text-teal-dark">
              Peak: {peakSlot}
            </span>
            <button
              type="button"
              onClick={handlePeriodToggle}
              className="px-3.5 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="h-60 my-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={formatXAxisLabel}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} />
              <Bar
                dataKey="booked"
                name="Booked"
                stackId="a"
                fill="#2563EB"
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="available"
                name="Available"
                stackId="a"
                fill="#CBD5E1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" />
              Booked Seats
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#CBD5E1]" />
              Available Capacity
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>Capacity: {summary.totalSeats} seats total</span>
            <span className="font-semibold text-slate-700">
              Revenue: ₹{(summary.revenuePaise / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
