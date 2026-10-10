import { useEffect, useRef } from 'react';
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
  const callbackRef = useRef(onSeatUpdate);
  useEffect(() => {
    callbackRef.current = onSeatUpdate;
  });

  useEffect(() => {
    if (!libraryId) return;

    const socket = getSocket();
    socket.emit('library:join', { libraryId });

    const handleUpdate = (data: SeatUpdatedPayload) => {
      if (data.libraryId === libraryId && callbackRef.current) {
        callbackRef.current(data);
      }
    };

    const handleBookingUpdate = (payload: any) => {
      if (callbackRef.current) {
        callbackRef.current({
          libraryId,
          seatId: payload?.booking?.seatId || payload?.booking?.seat?.id || '',
          slotId: payload?.booking?.slotId || payload?.booking?.slot?.id || '',
          date: payload?.booking?.date || payload?.booking?.booking_date || '',
          status: (payload?.booking?.status === 'CHECKED_IN' ? 'OCCUPIED' : 'BOOKED') as SeatStatus,
        });
      }
    };

    socket.on('seat:updated', handleUpdate as (...args: unknown[]) => void);
    socket.on('booking:updated', handleBookingUpdate as (...args: unknown[]) => void);
    socket.on('booking:checked-in', handleBookingUpdate as (...args: unknown[]) => void);

    return () => {
      socket.emit('library:leave', { libraryId });
      socket.off('seat:updated', handleUpdate as (...args: unknown[]) => void);
      socket.off('booking:updated', handleBookingUpdate as (...args: unknown[]) => void);
      socket.off('booking:checked-in', handleBookingUpdate as (...args: unknown[]) => void);
    };
  }, [libraryId]);
}
