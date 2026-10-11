import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { AnalyticsSummary, AnalyticsTimeseriesPoint } from '../../api/types';
import { AnalyticsCharts } from '../../components/charts/AnalyticsCharts';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtimeBookings } from '../../realtime/useRealtimeBookings';
import { format, subDays, startOfMonth } from 'date-fns';
import { BarChart2, Download, FileText, LayoutGrid, Layers, ArrowRight } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { user } = useAuthStore();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeseries, setTimeseries] = useState<AnalyticsTimeseriesPoint[]>([]);
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [groupBy, setGroupBy] = useState<'day' | 'slot' | 'seatType'>('slot');
  const [selectedPeriod, setSelectedPeriod] = useState<'Today' | 'This Week' | 'This Month'>('Today');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const { addToast } = useUiStore();

  const handlePeriodChange = (period: 'Today' | 'This Week' | 'This Month') => {
    setSelectedPeriod(period);
    const now = new Date();
    if (period === 'Today') {
      const todayFormatted = format(now, 'yyyy-MM-dd');
      setFromDate(todayFormatted);
      setToDate(todayFormatted);
    } else if (period === 'This Week') {
      setFromDate(format(subDays(now, 6), 'yyyy-MM-dd'));
      setToDate(format(now, 'yyyy-MM-dd'));
    } else if (period === 'This Month') {
      setFromDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setToDate(format(now, 'yyyy-MM-dd'));
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const floorParam = selectedFloorId !== 'all' ? selectedFloorId : undefined;
      const [sData, tData] = await Promise.all([
        adminApi.getAnalyticsSummary({ from: fromDate, to: toDate, floorId: floorParam }),
        adminApi.getAnalyticsTimeseries({ from: fromDate, to: toDate, groupBy, floorId: floorParam }),
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
  }, [fromDate, toDate, groupBy, selectedFloorId]);

  useRealtimeBookings(loadData, user?.libraryId);

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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Facility Utilization Intelligence
          </h2>
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

      {/* Date Range, Floor Selector & Group By Controls */}
      <div className="space-y-3">
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

        {/* Floor Filter Pills matching Interactive Floor & Seat Grid Builder */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedFloorId('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs ${
              selectedFloorId === 'all'
                ? 'bg-navy text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All Floors</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              selectedFloorId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {summary?.totalSeats || 0} Desks
            </span>
          </button>

          {summary?.floors?.map((fl) => (
            <button
              key={fl.id}
              type="button"
              onClick={() => setSelectedFloorId(fl.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs ${
                selectedFloorId === fl.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>{fl.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                selectedFloorId === fl.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {fl.totalSeats} Desks
              </span>
              {fl.occupancyPercent > 0 && (
                <span
                  className="w-2 h-2 rounded-full bg-emerald-400 inline-block ml-0.5"
                  title={`${fl.occupancyPercent}% Occupied`}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Charts */}
      {summary && timeseries.length > 0 && (
        <AnalyticsCharts
          summary={summary}
          timeseries={timeseries}
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />
      )}

      {/* Interactive Floor & Seat Grid Utilization Breakdown */}
      {summary?.floors && summary.floors.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Interactive Floor & Seat Grid Utilization
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time breakdown of all floors and desks configured in your Interactive Floor & Seat Grid Builder.
              </p>
            </div>
            <a
              href="/admin/seats"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <span>Open Grid Builder</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.floors.map((fl) => {
              const isSelected = selectedFloorId === fl.id;
              return (
                <div
                  key={fl.id}
                  onClick={() => setSelectedFloorId(isSelected ? 'all' : fl.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{fl.label}</h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        Floor {fl.floorNumber} • {fl.rows} × {fl.cols} Layout
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        fl.occupancyPercent > 50
                          ? 'bg-rose-100 text-rose-700'
                          : fl.occupancyPercent > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {fl.occupancyPercent}% Occupied
                    </span>
                  </div>

                  {/* Occupancy Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, fl.occupancyPercent)}%` }}
                    />
                  </div>

                  {/* Floor Stats Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-white rounded-xl border border-slate-100 mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Total</span>
                      <span className="font-extrabold text-slate-800">{fl.totalSeats}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-500 block uppercase font-medium">Occupied</span>
                      <span className="font-extrabold text-blue-600">{fl.bookedSeats}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 block uppercase font-medium">Available</span>
                      <span className="font-extrabold text-emerald-700">{fl.availableSeats}</span>
                    </div>
                  </div>

                  {/* Seat Categories configured in the Grid */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {Object.entries(fl.seatTypes || {}).map(([type, count]) => (
                      <span key={type} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        {type}: <strong className="text-slate-800">{count}</strong>
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{isSelected ? 'Currently filtered' : 'Click to filter analytics'}</span>
                    <span className="font-bold text-primary">{isSelected ? '✓ Active' : 'Filter →'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
