import React, { useState, useEffect } from 'react';
import { studyApi } from '../../api/study';
import { StudyReport } from '../../api/types';
import {
  BarChart2,
  Calendar,
  Flame,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const Reports: React.FC = () => {
  const [report, setReport] = useState<StudyReport | null>(null);
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studyApi
      .getReports(range)
      .then((data) => setReport(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [range]);

  const chartData = report
    ? report.daily.map((d) => ({
        date: d.date,
        hours: parseFloat((d.focusSeconds / 3600).toFixed(1)),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Study Analytics & Consistency
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quantify your deep work habit and weekly retention metrics.
          </p>
        </div>

        <div className="bg-slate-100 p-1 rounded-xl flex text-xs">
          <button
            onClick={() => setRange('week')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              range === 'week' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setRange('month')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              range === 'month' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            Past 30 Days
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" /> Total Focus Time
            </span>
            <p className="text-2xl font-black text-slate-900">
              {(report.totalFocusSeconds / 3600).toFixed(1)} hrs
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal" /> Active Study Days
            </span>
            <p className="text-2xl font-black text-slate-900">{report.activeDays} Days</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Consistency Score
            </span>
            <p className="text-2xl font-black text-emerald-700">{report.consistencyPercent}%</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-amber-200/80 bg-amber-50/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Current Streak
            </span>
            <p className="text-2xl font-black text-amber-700">{report.streakDays} Days</p>
          </div>
        </div>
      )}

      {/* Daily Hours Bar Chart */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Daily Focus Hours Progression</h3>
          <p className="text-xs text-slate-500">Tracked via Pomodoro and study sessions</p>
        </div>

        <div className="h-64 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                formatter={(val: number) => [`${val} hrs`, 'Focus Time']}
                contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }}
              />
              <Bar dataKey="hours" fill="#2B5BE0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
