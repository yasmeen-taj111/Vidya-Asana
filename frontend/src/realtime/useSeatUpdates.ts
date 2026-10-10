import { useEffect } from 'react';
import { getSocket } from './socket';
import { SeatStatus } from '../api/types';

export interface SeatUpdatedPayload {
  libraryId: string;
  seatId: string;
  slotId: string;
  date: string;
  status: SeatStatus;
}

export function useSeatUpdates(
  libraryId?: string,
  onSeatUpdate?: (update: SeatUpdatedPayload) => void
) {
  useEffect(() => {
    if (!libraryId) return;

    const socket = getSocket();
    socket.emit('library:join', { libraryId });

    const handleUpdate = (data: SeatUpdatedPayload) => {
      if (data.libraryId === libraryId && onSeatUpdate) {
        onSeatUpdate(data);
      }
    };

    socket.on('seat:updated', handleUpdate as (...args: unknown[]) => void);

    return () => {
      socket.emit('library:leave', { libraryId });
      socket.off('seat:updated', handleUpdate as (...args: unknown[]) => void);
    };
  }, [libraryId, onSeatUpdate]);
}
