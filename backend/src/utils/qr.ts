import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../config/env';

export interface QrPayload {
  bookingId: string;
  libraryId: string;
  slotId: string;
  date: string;
  exp: number; // unix seconds
}

export function generateQrToken(payload: QrPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.QR_SECRET)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

export function verifyQrToken(token: string): QrPayload | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', env.QR_SECRET)
      .update(data)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as QrPayload;
    return payload;
  } catch (err) {
    return null;
  }
}

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 250,
    margin: 2,
    color: {
      dark: '#17306A',
      light: '#FFFFFF',
    },
  });
}
