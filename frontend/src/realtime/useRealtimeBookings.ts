import { useEffect, useRef } from 'react';
import { getSocket } from './socket';

export function useRealtimeBookings(onUpdate?: () => void, libraryId?: string) {
  const callbackRef = useRef(onUpdate);
  useEffect(() => {
    callbackRef.current = onUpdate;
  });

  useEffect(() => {
    const socket = getSocket();

    if (libraryId) {
      socket.emit('library:join', { libraryId });
    }

    const handleUpdate = () => {
      if (callbackRef.current) {
        callbackRef.current();
      }
    };

    socket.on('booking:updated', handleUpdate);
    socket.on('booking:checked-in', handleUpdate);
    socket.on('booking:released', handleUpdate);
    socket.on('seat:updated', handleUpdate);
    socket.on('notification:new', handleUpdate);

    return () => {
      if (libraryId) {
        socket.emit('library:leave', { libraryId });
      }
      socket.off('booking:updated', handleUpdate);
      socket.off('booking:checked-in', handleUpdate);
      socket.off('booking:released', handleUpdate);
      socket.off('seat:updated', handleUpdate);
      socket.off('notification:new', handleUpdate);
    };
  }, [libraryId]);
}
