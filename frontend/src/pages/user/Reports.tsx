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
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-8 py-2">
      {/* Header & Range Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Study Analytics & Consistency
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Quantify your deep work habit and weekly retention metrics.
          </p>
        </div>

        <div className="bg-slate-100/90 p-1.5 rounded-full flex border border-slate-200/70 shadow-inner font-bold text-xs sm:text-sm">
          <button
            onClick={() => setRange('week')}
            className={`px-4 sm:px-5 py-1.5 rounded-full transition-all ${
              range === 'week' ? 'bg-white shadow text-primary font-extrabold' : 'text-slate-600 hover:text-navy'
            }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setRange('month')}
            className={`px-4 sm:px-5 py-1.5 rounded-full transition-all ${
              range === 'month' ? 'bg-white shadow text-primary font-extrabold' : 'text-slate-600 hover:text-navy'
            }`}
          >
            Past 30 Days
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-gradient-to-b from-white to-primary/5 p-6 sm:p-7 rounded-3xl sm:rounded-[28px] border-2 border-primary/20 shadow-xl shadow-primary/5 space-y-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">
              Total Focus Time
            </span>
            <p className="text-3xl sm:text-4xl font-black text-navy font-mono">
              {(report.totalFocusSeconds / 3600).toFixed(1)} <span className="text-xs text-slate-500 font-sans font-bold">hrs</span>
            </p>
            <p className="text-[11px] text-slate-400">Total deep work logged</p>
          </div>

          <div className="bg-gradient-to-b from-white to-teal/5 p-6 sm:p-7 rounded-3xl sm:rounded-[28px] border-2 border-teal/20 shadow-xl shadow-teal/5 space-y-2">
            <span className="text-xs font-bold text-teal-dark uppercase tracking-wider block">
              Active Study Days
            </span>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
              {report.activeDays} <span className="text-xs text-slate-500 font-sans font-bold">days</span>
            </p>
            <p className="text-[11px] text-slate-400">Days with focus blocks</p>
          </div>

          <div className="bg-gradient-to-b from-white to-emerald-50/40 p-6 sm:p-7 rounded-3xl sm:rounded-[28px] border-2 border-emerald-200 shadow-xl shadow-emerald-500/5 space-y-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
              Consistency Score
            </span>
            <p className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono">
              {report.consistencyPercent}%
            </p>
            <p className="text-[11px] text-slate-400">Target frequency goal</p>
          </div>

          <div className="bg-gradient-to-b from-white to-amber-50/40 p-6 sm:p-7 rounded-3xl sm:rounded-[28px] border-2 border-amber-200 shadow-xl shadow-amber-500/5 space-y-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
              Current Streak
            </span>
            <p className="text-3xl sm:text-4xl font-black text-amber-700 font-mono">
              {report.streakDays} <span className="text-xs text-slate-500 font-sans font-bold">days</span>
            </p>
            <p className="text-[11px] text-slate-400">Consecutive study days</p>
          </div>
        </div>
      )}

      {/* Daily Hours Bar Chart */}
      <div className="bg-white p-7 sm:p-10 rounded-3xl sm:rounded-[32px] border-2 border-primary/15 shadow-2xl shadow-primary/5 space-y-6 ring-1 ring-slate-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
              Daily Focus Hours Progression
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Verified sessions logged via Pomodoro, stopwatch, and custom study focus blocks
            </p>
          </div>
          {report && (
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Period Average</span>
              <span className="text-base font-black text-primary font-mono">
                {report.activeDays > 0 ? (report.totalFocusSeconds / 3600 / report.activeDays).toFixed(1) : '0.0'} hrs/day
              </span>
            </div>
          )}
        </div>

        <div className="h-72 sm:h-96 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
              <Tooltip
                formatter={(val: number) => [`${val} hrs`, 'Focus Duration']}
                contentStyle={{
                  borderRadius: '1rem',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  borderColor: '#cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar dataKey="hours" fill="#2B5BE0" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
