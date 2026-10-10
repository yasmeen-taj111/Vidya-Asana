import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Handle AppError
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.status, err.details);
  }

  // Handle MySQL duplicate key entry (e.g. active_key collision on booking)
  if (err.code === 'ER_DUP_ENTRY') {
    if (err.message && err.message.includes('uk_booking_active_key')) {
      return sendError(
        res,
        'SEAT_UNAVAILABLE',
        'This seat was just reserved by another student.',
        409
      );
    }
    if (err.message && err.message.includes('email')) {
      return sendError(res, 'EMAIL_TAKEN', 'An account with this email address already exists.', 409);
    }
  }

  console.error('[Unhandled Internal Error]', err);

  return sendError(
    res,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' ? 'An internal error occurred' : err.message || 'Internal server error',
    500
  );
}
