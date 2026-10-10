import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../middleware/auth';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
        (socket as any).user = decoded;
      } catch (err) {
        // Continue unauthenticated for public viewers or grid watchers
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user: AuthUser | undefined = (socket as any).user;
    if (user) {
      socket.join(`user:${user.id}`);
      if (user.libraryId) {
        socket.join(`admin:library:${user.libraryId}`);
      }
    }

    socket.on('library:join', ({ libraryId }: { libraryId: string }) => {
      if (libraryId) {
        socket.join(`library:${libraryId}`);
      }
    });

    socket.on('library:leave', ({ libraryId }: { libraryId: string }) => {
      if (libraryId) {
        socket.leave(`library:${libraryId}`);
      }
    });

    socket.on('disconnect', () => {
      // Cleaned up automatically by socket.io
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitSeatUpdated(
  libraryId: string,
  seatId: string,
  slotId: string,
  date: string,
  status: string
) {
  if (!io) return;
  io.to(`library:${libraryId}`).emit('seat:updated', {
    libraryId,
    seatId,
    slotId,
    date,
    status,
  });
}

export function emitBookingReminder(
  userId: string,
  data: { bookingId: string; message: string; graceUntil: string }
) {
  if (!io) return;
  io.to(`user:${userId}`).emit('booking:reminder', data);
}

export function emitBookingReleased(
  userId: string,
  data: { bookingId: string; reason: 'NO_SHOW' | 'CANCELLED_BY_ADMIN' }
) {
  if (!io) return;
  io.to(`user:${userId}`).emit('booking:released', data);
}

export function emitWaitlistAvailable(
  userId: string,
  data: { waitlistId: string; seat: any; claimExpiresAt: string }
) {
  if (!io) return;
  io.to(`user:${userId}`).emit('waitlist:available', data);
}

export function emitBookingCheckedIn(libraryId: string, booking: any) {
  if (!io) return;
  io.to(`admin:library:${libraryId}`).emit('booking:checked-in', { booking });
}

export function emitNotification(userId: string, notification: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
}
