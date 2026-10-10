import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { AnalyticsSummary, AnalyticsTimeseriesPoint } from '../../api/types';
import { AnalyticsCharts } from '../../components/charts/AnalyticsCharts';
import { useUiStore } from '../../store/uiStore';
import { BarChart2, Download, Calendar, FileText } from 'lucide-react';

export const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeseries, setTimeseries] = useState<AnalyticsTimeseriesPoint[]>([]);
  const [fromDate, setFromDate] = useState('2026-10-01');
  const [toDate, setToDate] = useState('2026-10-10');
  const [groupBy, setGroupBy] = useState<'day' | 'slot' | 'seatType'>('slot');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const { addToast } = useUiStore();

  const loadData = async () => {
    try {
      setLoading(true);
      const [sData, tData] = await Promise.all([
        adminApi.getAnalyticsSummary(),
        adminApi.getAnalyticsTimeseries({ from: fromDate, to: toDate, groupBy }),
      ]);
      setSummary(sData);
      setTimeseries(tData.points);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, groupBy]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const blob = await adminApi.exportReport(format, fromDate, toDate);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vidya-asana-report-${fromDate}-${toDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        type: 'success',
        title: 'Report Exported',
        message: `Successfully downloaded ${format.toUpperCase()} utilization report.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not export analytics.',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Facility Utilization Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Historical occupancy metrics, peak study hours, and exportable administrative audit records.
          </p>
        </div>

        {/* Download CSV / PDF Buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={exporting}
            onClick={() => handleExport('csv')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
          <button
            disabled={exporting}
            onClick={() => handleExport('pdf')}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-white" /> Export PDF
          </button>
        </div>
      </div>

      {/* Date Range & Group By Selector */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <span className="text-slate-400 font-bold uppercase text-[10px] px-2">Group By:</span>
          {(['slot', 'day', 'seatType'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all capitalize ${
                groupBy === g ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Charts */}
      {summary && timeseries.length > 0 && (
        <AnalyticsCharts summary={summary} timeseries={timeseries} />
      )}
    </div>
  );
};
