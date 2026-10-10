export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'LIBRARY_NOT_APPROVED'
  | 'NOT_FOUND'
  | 'SEAT_UNAVAILABLE'
  | 'OVERLAPPING_BOOKING'
  | 'SEAT_HELD_FOR_WAITLIST'
  | 'ALREADY_ON_WAITLIST'
  | 'EMAIL_TAKEN'
  | 'BOOKING_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ApiErrorCode, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
