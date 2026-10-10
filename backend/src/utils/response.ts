import { Response } from 'express';
import { ApiErrorCode } from './errors';

export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
  status = 200
) {
  return res.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(
  res: Response,
  code: ApiErrorCode,
  message: string,
  status = 400,
  details?: Record<string, unknown>
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
