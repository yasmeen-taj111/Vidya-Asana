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

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <Timer className="w-5 h-5 text-primary" /> Study Focus Tools
        </h2>
        <p className="text-xs text-slate-500">
          Integrated deep work timer with persistent streak and leaderboard logging.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-semibold">
        {(['POMODORO', 'CUSTOM', 'STOPWATCH'] as StudySessionType[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-xl transition-all capitalize ${
              mode === m ? 'bg-white shadow text-primary font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {m.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Main Timer Display Dial */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-xl text-center space-y-6 relative overflow-hidden">
        {/* Glow backdrop indicator */}
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isBreak ? 'bg-teal' : 'bg-primary'
          }`}
        />

        <div className="space-y-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              isBreak ? 'bg-teal-light text-teal-dark' : 'bg-primary/10 text-primary'
            }`}
          >
            {isBreak ? <Coffee className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
            {mode === 'POMODORO' ? (isBreak ? 'Short Break' : 'Deep Focus Block') : mode}
          </span>

          <div className="text-6xl sm:text-7xl font-mono font-black text-navy tracking-tight my-4">
            {formatDisplay(currentSeconds)}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRunning && !isPaused ? (
            <button
              onClick={start}
              className="px-8 py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm shadow-xl shadow-primary/25 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> Start Focus
            </button>
          ) : isRunning ? (
            <button
              onClick={pause}
              className="px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center gap-2"
            >
              <Pause className="w-5 h-5 fill-current" /> Pause
            </button>
          ) : (
            <button
              onClick={resume}
              className="px-8 py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm shadow-xl shadow-primary/25 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> Resume
            </button>
          )}

          <button
            onClick={reset}
            className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Reset timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pomodoro Settings */}
      {mode === 'POMODORO' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3 text-xs">
          <span className="font-bold text-slate-900 block flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-primary" /> Session Interval Configuration
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block mb-1">Focus Work (minutes):</span>
              <input
                type="number"
                min={5}
                max={90}
                value={pomodoroWorkMinutes}
                onChange={(e) =>
                  setPomodoroSettings(parseInt(e.target.value) || 25, pomodoroBreakMinutes)
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Short Break (minutes):</span>
              <input
                type="number"
                min={1}
                max={30}
                value={pomodoroBreakMinutes}
                onChange={(e) =>
                  setPomodoroSettings(pomodoroWorkMinutes, parseInt(e.target.value) || 5)
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
