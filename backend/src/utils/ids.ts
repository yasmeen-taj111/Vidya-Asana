import crypto from 'crypto';

export function generateUUID(): string {
  return crypto.randomUUID();
}

export const generateId = generateUUID;

export function generateBookingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'VA-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
