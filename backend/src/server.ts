import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './realtime/socket';
import { startNoShowCron } from './jobs/noShowCron';

// Route modules
import { authRouter } from './modules/auth/routes';
import { ownerRouter } from './modules/owner/routes';
import { adminRouter } from './modules/library/admin.routes';
import { discoveryRouter } from './modules/discovery/routes';
import { bookingsRouter } from './modules/bookings/routes';
import { waitlistRouter } from './modules/waitlist/routes';
import { usersRouter } from './modules/users/routes';
import { studyRouter } from './modules/study/routes';
import { notificationsRouter } from './modules/notifications/routes';
import { chatRouter } from './modules/chat/routes';

export const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Security & utility middlewares
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Health check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API v1 Routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/owner', ownerRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/waitlist', waitlistRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/study', studyRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/chat', chatRouter);
// Discovery routes mount at root of /api/v1 (/libraries, /recommendations/libraries, etc.)
app.use('/api/v1', discoveryRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// Error handling middleware
app.use(errorHandler);

// Start background workers and server
if (process.env.NODE_ENV !== 'test') {
  startNoShowCron();

  httpServer.listen(env.PORT, () => {
    console.log(`[Server] Vidya Asana Backend running on http://localhost:${env.PORT}`);
    console.log(`[Server] API v1 base: http://localhost:${env.PORT}/api/v1`);
    console.log(`[Server] Realtime Socket.IO listening on port ${env.PORT}`);
  });
}
