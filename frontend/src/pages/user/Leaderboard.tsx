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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Focus Hours Leaderboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Recognizing dedicated students building daily study consistency.
          </p>
        </div>

        {/* Scope and Period Switchers */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-100 p-1 rounded-xl flex">
            <button
              onClick={() => setScope('global')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                scope === 'global' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setScope('library')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                scope === 'library' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              My Library
            </button>
          </div>

          <div className="bg-slate-100 p-1 rounded-xl flex">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === 'week' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === 'month' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Rankings List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden divide-y divide-slate-100">
        {entries.map((item) => (
          <div
            key={item.userId}
            className={`p-4 sm:p-5 flex items-center justify-between transition-colors ${
              item.isMe ? 'bg-primary/5 font-semibold ring-1 ring-inset ring-primary/20' : 'hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 flex items-center justify-center">
                {getRankBadge(item.rank)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{item.name}</span>
                  {item.isMe && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-extrabold uppercase">
                      You
                    </span>
                  )}
                </p>
                <span className="text-[11px] text-slate-400">
                  {Math.round(item.focusSeconds / 3600)} recorded study sessions
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-black text-navy font-mono">
                {(item.focusSeconds / 3600).toFixed(1)} hrs
              </span>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                Focus Time
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
