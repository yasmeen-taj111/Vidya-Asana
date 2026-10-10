import React, { useEffect } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { studyApi } from '../../api/study';
import { useUiStore } from '../../store/uiStore';
import { StudySessionType } from '../../api/types';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Sliders,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const Study: React.FC = () => {
  const {
    mode,
    isRunning,
    isPaused,
    remainingSeconds,
    elapsedSeconds,
    startedAt,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    isBreak,
    setMode,
    setPomodoroSettings,
    setCustomTarget,
    start,
    pause,
    resume,
    reset,
    tick,
  } = useTimerStore();

  const { addToast } = useUiStore();

  // Tick interval for active timer
  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // Check completion
  useEffect(() => {
    if (startedAt && !isRunning && remainingSeconds === 0 && mode !== 'STOPWATCH') {
      // Completed session
      studyApi
        .recordSession({
          type: mode,
          startedAt,
          endedAt: new Date().toISOString(),
          focusSeconds: (isBreak ? pomodoroBreakMinutes : pomodoroWorkMinutes) * 60,
        })
        .then(() => {
          addToast({
            type: 'success',
            title: isBreak ? 'Break Complete!' : 'Focus Block Complete!',
            message: 'Session recorded in your study reports and leaderboard streak.',
          });
        })
        .catch((e) => console.error(e));
    }
  }, [remainingSeconds, isRunning]);

  const formatDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentSeconds = mode === 'STOPWATCH' ? elapsedSeconds : remainingSeconds;

  const customPresets = [15, 25, 30, 45, 60, 90];

  return (
    <div className="max-w-xl mx-auto space-y-5 py-2">
      {/* Page Heading */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Study Focus Tools
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Integrated deep work timer with persistent streak and leaderboard logging.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-full text-xs font-bold border border-slate-200/70 shadow-inner">
          {(['POMODORO', 'CUSTOM', 'STOPWATCH'] as StudySessionType[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 sm:px-6 py-1.5 rounded-full transition-all capitalize ${
                  active
                    ? 'bg-white shadow-md text-primary font-extrabold'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                {m.toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main High-Impact Timer Card */}
      <div className="bg-gradient-to-b from-white via-white to-slate-50/70 rounded-3xl p-6 sm:p-8 border-2 border-primary/20 shadow-xl shadow-primary/10 text-center space-y-5 relative overflow-hidden ring-1 ring-slate-900/5">
        {/* Ambient Glow Backdrop */}
        <div
          className={`absolute -top-32 -left-32 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            isRunning
              ? isBreak
                ? 'bg-emerald-400/25'
                : 'bg-primary/25 animate-pulse'
              : 'bg-primary/10'
          }`}
        />
        <div
          className={`absolute -bottom-32 -right-32 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            isRunning
              ? isBreak
                ? 'bg-teal/20'
                : 'bg-accent/20 animate-pulse'
              : 'bg-accent/10'
          }`}
        />

        {/* State Tag */}
        <div className="relative z-10 space-y-2">
          <div className="inline-block">
            <span
              className={`inline-flex items-center px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${
                isBreak
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : isRunning
                  ? 'bg-primary text-white shadow-md shadow-primary/30 animate-pulse'
                  : 'bg-primary/10 text-primary border border-primary/15'
              }`}
            >
              {mode === 'POMODORO' ? (isBreak ? 'Short Break' : 'Deep Focus Block') : mode}
            </span>
          </div>

          {/* Prominent digits */}
          <div className="text-6xl sm:text-7xl font-mono font-black text-navy tracking-tight py-1 select-none">
            {formatDisplay(currentSeconds)}
          </div>
        </div>

        {/* Custom Presets Quick Selector */}
        {mode === 'CUSTOM' && !isRunning && !isPaused && (
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 pt-0.5">
            {customPresets.map((mins) => {
              const active = remainingSeconds === mins * 60;
              return (
                <button
                  key={mins}
                  onClick={() => setCustomTarget(mins * 60)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? 'bg-navy text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {mins} min
                </button>
              );
            })}
          </div>
        )}

        {/* Action Controls */}
        <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4 pt-1">
          {!isRunning && !isPaused ? (
            <button
              onClick={start}
              className="px-8 sm:px-10 py-3 sm:py-3.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-white font-black text-sm sm:text-base shadow-lg shadow-primary/25 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>Start Focus</span>
            </button>
          ) : isRunning ? (
            <button
              onClick={pause}
              className="px-8 sm:px-10 py-3 sm:py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-sm sm:text-base shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={resume}
              className="px-8 sm:px-10 py-3 sm:py-3.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-white font-black text-sm sm:text-base shadow-lg shadow-primary/25 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>Resume</span>
            </button>
          )}

          <button
            onClick={reset}
            className="p-3 sm:p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shadow-sm active:scale-95 cursor-pointer"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Pomodoro Settings */}
      {mode === 'POMODORO' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 text-xs">
          <span className="font-bold text-slate-900 text-xs sm:text-sm block">
            Session Interval Configuration
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-slate-600 font-semibold block mb-1">Focus Work Duration (minutes):</span>
              <input
                type="number"
                min={5}
                max={90}
                value={pomodoroWorkMinutes}
                onChange={(e) =>
                  setPomodoroSettings(parseInt(e.target.value) || 25, pomodoroBreakMinutes)
                }
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono font-bold text-xs sm:text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <span className="text-slate-600 font-semibold block mb-1">Short Break Duration (minutes):</span>
              <input
                type="number"
                min={1}
                max={30}
                value={pomodoroBreakMinutes}
                onChange={(e) =>
                  setPomodoroSettings(pomodoroWorkMinutes, parseInt(e.target.value) || 5)
                }
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono font-bold text-xs sm:text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
