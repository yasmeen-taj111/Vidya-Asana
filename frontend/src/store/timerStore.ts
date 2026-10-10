import { create } from 'zustand';
import { StudySessionType } from '../api/types';

interface TimerState {
  mode: StudySessionType;
  isRunning: boolean;
  isPaused: boolean;
  targetSeconds: number; // For pomodoro / custom
  remainingSeconds: number;
  elapsedSeconds: number; // For stopwatch
  startedAt: string | null;
  targetEndTime: number | null; // epoch ms
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  isBreak: boolean;
  bookingId?: string;

  setMode: (mode: StudySessionType) => void;
  setBookingId: (id?: string) => void;
  setPomodoroSettings: (work: number, breakMins: number) => void;
  setCustomTarget: (seconds: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
}

const STORAGE_KEY = 'va_study_timer';

const loadSaved = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
};

const saved = loadSaved();

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: saved?.mode || 'POMODORO',
  isRunning: false,
  isPaused: false,
  targetSeconds: saved?.targetSeconds || 25 * 60,
  remainingSeconds: saved?.remainingSeconds || 25 * 60,
  elapsedSeconds: saved?.elapsedSeconds || 0,
  startedAt: null,
  targetEndTime: null,
  pomodoroWorkMinutes: saved?.pomodoroWorkMinutes || 25,
  pomodoroBreakMinutes: saved?.pomodoroBreakMinutes || 5,
  isBreak: false,
  bookingId: undefined,

  setMode: (mode) => {
    let target = 25 * 60;
    if (mode === 'POMODORO') {
      target = get().pomodoroWorkMinutes * 60;
    } else if (mode === 'CUSTOM') {
      target = 30 * 60;
    }
    set({
      mode,
      isRunning: false,
      isPaused: false,
      targetSeconds: target,
      remainingSeconds: target,
      elapsedSeconds: 0,
      startedAt: null,
      targetEndTime: null,
      isBreak: false,
    });
  },

  setBookingId: (id) => set({ bookingId: id }),

  setPomodoroSettings: (work, breakMins) => {
    set({
      pomodoroWorkMinutes: work,
      pomodoroBreakMinutes: breakMins,
      targetSeconds: work * 60,
      remainingSeconds: work * 60,
    });
  },

  setCustomTarget: (seconds) => {
    set({
      targetSeconds: seconds,
      remainingSeconds: seconds,
    });
  },

  start: () => {
    const now = Date.now();
    const state = get();
    const duration = state.isBreak ? state.pomodoroBreakMinutes * 60 : state.remainingSeconds;
    const targetEndTime = now + duration * 1000;
    set({
      isRunning: true,
      isPaused: false,
      startedAt: state.startedAt || new Date().toISOString(),
      targetEndTime,
    });
  },

  pause: () => {
    set({
      isRunning: false,
      isPaused: true,
      targetEndTime: null,
    });
  },

  resume: () => {
    const now = Date.now();
    const targetEndTime = now + get().remainingSeconds * 1000;
    set({
      isRunning: true,
      isPaused: false,
      targetEndTime,
    });
  },

  reset: () => {
    const state = get();
    let target = 25 * 60;
    if (state.mode === 'POMODORO') {
      target = (state.isBreak ? state.pomodoroBreakMinutes : state.pomodoroWorkMinutes) * 60;
    } else if (state.mode === 'CUSTOM') {
      target = state.targetSeconds;
    }
    set({
      isRunning: false,
      isPaused: false,
      startedAt: null,
      targetEndTime: null,
      remainingSeconds: target,
      elapsedSeconds: 0,
    });
  },

  tick: () => {
    const state = get();
    if (!state.isRunning) return;

    if (state.mode === 'STOPWATCH') {
      set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
      return;
    }

    if (state.targetEndTime) {
      const now = Date.now();
      const diff = Math.max(0, Math.round((state.targetEndTime - now) / 1000));
      if (diff <= 0) {
        // finished
        set({
          remainingSeconds: 0,
          isRunning: false,
          isPaused: false,
          targetEndTime: null,
        });
      } else {
        set({ remainingSeconds: diff });
      }
    }
  },
}));
