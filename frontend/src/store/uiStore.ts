import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

interface UiState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  alwaysFailNext: boolean;
  setAlwaysFailNext: (val: boolean) => void;
  reminderModalOpen: boolean;
  activeReminder: { bookingId: string; message: string; graceUntil: string } | null;
  setReminder: (reminder: { bookingId: string; message: string; graceUntil: string } | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  alwaysFailNext: false,
  setAlwaysFailNext: (val) => set({ alwaysFailNext: val }),
  reminderModalOpen: false,
  activeReminder: null,
  setReminder: (reminder) =>
    set({
      activeReminder: reminder,
      reminderModalOpen: !!reminder,
    }),
}));
