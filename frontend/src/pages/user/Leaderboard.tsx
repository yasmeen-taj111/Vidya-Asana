import React, { useState, useEffect } from 'react';
import { studyApi } from '../../api/study';
import { LeaderboardEntry } from '../../api/types';
import { Trophy, Medal, Crown, Flame, Clock } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [scope, setScope] = useState<'library' | 'global'>('global');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studyApi
      .getLeaderboard({ scope, period })
      .then((data) => setEntries(data.entries))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [scope, period]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="font-mono font-bold text-slate-400">#{rank}</span>;
  };

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-8 py-2">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Focus Hours Leaderboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Recognizing dedicated students building daily study consistency.
          </p>
        </div>

        {/* Scope and Period Switchers */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
          <div className="bg-slate-100/90 p-1.5 rounded-full flex border border-slate-200/70 shadow-inner font-bold">
            <button
              onClick={() => setScope('global')}
              className={`px-4 sm:px-5 py-1.5 rounded-full transition-all ${
                scope === 'global' ? 'bg-white shadow text-primary font-extrabold' : 'text-slate-600 hover:text-navy'
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setScope('library')}
              className={`px-4 sm:px-5 py-1.5 rounded-full transition-all ${
                scope === 'library' ? 'bg-white shadow text-primary font-extrabold' : 'text-slate-600 hover:text-navy'
              }`}
            >
              My Library
            </button>
          </div>

          <div className="bg-slate-100/90 p-1.5 rounded-full flex border border-slate-200/70 shadow-inner font-bold">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 sm:px-5 py-1.5 rounded-full transition-all ${
                period === 'week' ? 'bg-white shadow text-primary font-extrabold' : 'text-slate-600 hover:text-navy'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 sm:px-5 py-1.5 rounded-full transition-all ${
                period === 'month' ? 'bg-white shadow text-primary font-extrabold' : 'text-slate-600 hover:text-navy'
              }`}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards (when at least 3 entries exist) */}
      {!loading && entries.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2 items-end">
          {/* Rank 2 (Silver) */}
          <div className="bg-gradient-to-b from-white to-slate-50 p-6 rounded-3xl border border-slate-200/80 shadow-md text-center space-y-3 order-2 md:order-1">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200 shadow-xs">
              <Medal className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-base flex items-center justify-center gap-1.5">
                <span>{entries[1].name}</span>
                {entries[1].isMe && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase">
                    You
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">2nd Place</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-2xl font-black text-navy font-mono">
                {(entries[1].focusSeconds / 3600).toFixed(1)} <span className="text-xs text-slate-500 font-sans font-bold">hrs</span>
              </span>
            </div>
          </div>

          {/* Rank 1 (Gold / Crown) */}
          <div className="bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 p-7 sm:p-8 rounded-3xl sm:rounded-[32px] border-2 border-amber-300 shadow-xl shadow-amber-500/10 text-center space-y-3.5 order-1 md:order-2 md:-translate-y-2 relative overflow-hidden">
            <div className="absolute top-2 right-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-600 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                Leader
              </span>
            </div>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-300 text-white flex items-center justify-center font-bold shadow-md shadow-amber-400/30">
              <Crown className="w-7 h-7 fill-white text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg flex items-center justify-center gap-1.5">
                <span>{entries[0].name}</span>
                {entries[0].isMe && (
                  <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase">
                    You
                  </span>
                )}
              </p>
              <p className="text-xs text-amber-700 font-bold">1st Place Champion</p>
            </div>
            <div className="pt-2 border-t border-amber-100">
              <span className="text-3xl font-black text-navy font-mono">
                {(entries[0].focusSeconds / 3600).toFixed(1)} <span className="text-xs text-slate-500 font-sans font-bold">hrs</span>
              </span>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="bg-gradient-to-b from-white to-slate-50 p-6 rounded-3xl border border-slate-200/80 shadow-md text-center space-y-3 order-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-lg border border-amber-200 shadow-xs">
              <Medal className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-base flex items-center justify-center gap-1.5">
                <span>{entries[2].name}</span>
                {entries[2].isMe && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase">
                    You
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">3rd Place</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-2xl font-black text-navy font-mono">
                {(entries[2].focusSeconds / 3600).toFixed(1)} <span className="text-xs text-slate-500 font-sans font-bold">hrs</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Rankings Card */}
      <div className="bg-white rounded-3xl sm:rounded-[32px] border-2 border-primary/15 shadow-2xl shadow-primary/5 overflow-hidden divide-y divide-slate-100 ring-1 ring-slate-900/5">
        <div className="p-4 sm:p-5 bg-slate-50/70 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-6 sm:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="w-8 text-center">Rank</span>
            <span>Student</span>
          </div>
          <span>Total Focus Hours</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading leaderboard rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <p className="text-sm font-bold text-slate-700">No study sessions recorded for this period yet.</p>
            <p className="text-xs">Start a Pomodoro or deep focus timer in Study Tools to claim the #1 rank!</p>
          </div>
        ) : (
          entries.map((item) => (
            <div
              key={item.userId}
              className={`p-5 sm:p-6 px-6 sm:px-8 flex items-center justify-between transition-colors ${
                item.isMe
                  ? 'bg-primary/5 font-semibold ring-1 ring-inset ring-primary/20'
                  : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-8 flex items-center justify-center text-sm font-bold">
                  {getRankBadge(item.rank)}
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{item.name}</span>
                    {item.isMe && (
                      <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase">
                        You
                      </span>
                    )}
                  </p>
                  <span className="text-xs text-slate-400">
                    {Math.round(item.focusSeconds / 3600)} recorded sessions
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg sm:text-xl font-black text-navy font-mono">
                  {(item.focusSeconds / 3600).toFixed(1)} <span className="text-xs text-slate-500 font-sans font-bold">hrs</span>
                </span>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                  Deep Work
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
