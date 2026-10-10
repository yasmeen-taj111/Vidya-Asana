import { ApiErrorCode } from '../api/types';

export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'The request could not be processed. Please check your inputs.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  LIBRARY_NOT_APPROVED: 'This library registration is still pending site owner approval.',
  NOT_FOUND: 'The requested resource was not found.',
  SEAT_UNAVAILABLE: 'This seat is already booked for the selected date and time slot.',
  OVERLAPPING_BOOKING: 'You already have another active booking that overlaps with this time slot.',
  SEAT_HELD_FOR_WAITLIST: 'This seat is temporarily held for a waitlisted student.',
  ALREADY_ON_WAITLIST: 'You are already in the waitlist for this seat and slot.',
  EMAIL_TAKEN: 'An account with this email address already exists.',
  BOOKING_EXPIRED: 'This booking or check-in window has already expired.',
  VALIDATION_ERROR: 'Please correct the highlighted errors in the form.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  INTERNAL_ERROR: 'An unexpected system error occurred. Please try again shortly.',
};

export function getErrorMessage(code?: string, fallback = 'An unexpected error occurred.'): string {
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ApiErrorCode];
  }
  return fallback;
}
