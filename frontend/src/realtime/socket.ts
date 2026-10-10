import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { SeatStatus } from '../api/types';

type Listener = (...args: unknown[]) => void;

class MockSocket {
  private listeners: Map<string, Set<Listener>> = new Map();
  private joinedRooms: Set<string> = new Set();

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return this;
  }

  off(event: string, callback?: Listener) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(callback);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    if (event === 'library:join') {
      const payload = args[0] as { libraryId: string };
      this.joinedRooms.add(`library:${payload.libraryId}`);
    } else if (event === 'library:leave') {
      const payload = args[0] as { libraryId: string };
      this.joinedRooms.delete(`library:${payload.libraryId}`);
    }
    return this;
  }

  // Internal trigger to simulate server pushes
  simulateEvent(event: string, payload: unknown) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.forEach((cb) => cb(payload));
    }
  }

  simulateSeatUpdate(libraryId: string, seatId: string, status: SeatStatus, date: string, slotId: string) {
    this.simulateEvent('seat:updated', {
      libraryId,
      seatId,
      slotId,
      date,
      status,
    });
  }

  simulateBookingUpdate(booking: any) {
    this.simulateEvent('booking:updated', { booking });
  }

  simulateCheckedIn(booking: any) {
    this.simulateEvent('booking:checked-in', { booking });
  }

  simulateReminder(bookingId: string) {
    const graceUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    this.simulateEvent('booking:reminder', {
      bookingId,
      message: 'Your slot has started! Are you coming to your seat?',
      graceUntil,
    });
    useUiStore.getState().setReminder({
      bookingId,
      message: 'Your slot has started! Are you coming to your seat?',
      graceUntil,
    });
  }
}

export const mockSocketInstance = new MockSocket();

let realSocket: Socket | null = null;

export function getSocket(): Socket | MockSocket {
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
  if (useMocks) {
    return mockSocketInstance;
  }

  if (!realSocket) {
    const token = useAuthStore.getState().accessToken;
    realSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });

    realSocket.on('booking:reminder', (data: { bookingId: string; message: string; graceUntil: string }) => {
      useUiStore.getState().setReminder(data);
    });

    useAuthStore.subscribe((state) => {
      if (realSocket) {
        (realSocket as any).auth = { token: state.accessToken };
        if (state.accessToken && !realSocket.connected) {
          realSocket.connect();
        }
      }
    });
  }

  return realSocket;
}
