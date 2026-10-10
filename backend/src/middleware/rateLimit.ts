import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response';

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    sendError(res, 'RATE_LIMITED', 'Too many requests, please slow down.', 429);
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    sendError(res, 'RATE_LIMITED', 'Too many authentication attempts.', 429);
  },
});

export const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) => req.user?.id || req.ip || 'anon',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    sendError(res, 'RATE_LIMITED', 'Too many booking attempts. Please wait a moment before trying again.', 429);
  },
});

export const walkInRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req: Request) => req.user?.id || req.ip || 'anon',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    sendError(res, 'RATE_LIMITED', 'Too many walk-in allocation requests. Please slow down.', 429);
  },
});

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req: Request) => req.user?.id || req.ip || 'anon',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    sendError(res, 'RATE_LIMITED', 'Too many chat messages. Please wait a moment.', 429);
  },
});

export const globalLimiter = globalRateLimiter;
export const authLimiter = authRateLimiter;
export const bookingLimiter = bookingRateLimiter;
export const seatReservationLimiter = bookingRateLimiter;
export const walkInLimiter = walkInRateLimiter;
export const chatLimiter = chatRateLimiter;

