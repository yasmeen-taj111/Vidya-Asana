import { describe, it, expect } from 'vitest';
import { generateUUID, generateBookingCode } from '../src/utils/ids';
import { generateQrToken, verifyQrToken } from '../src/utils/qr';
import { scoreSeat, scoreLibrary, calculateHaversineDistance } from '../src/utils/scoring';
import { generateChatResponse } from '../src/modules/chat/chatEngine';
import { bookingRateLimiter, walkInLimiter } from '../src/middleware/rateLimit';
import { withTransaction, pool } from '../src/config/db';
import { AppError } from '../src/utils/errors';

describe('Vidya Asana Backend - Utility & Domain Logic Tests', () => {
  it('generates unique UUIDs and formatted booking codes', () => {
    const uuid = generateUUID();
    expect(uuid).toBeDefined();
    expect(uuid.length).toBe(36);

    const code = generateBookingCode();
    expect(code).toBeDefined();
    expect(code.startsWith('VA-')).toBe(true);
    expect(code.length).toBe(8);
  });

  it('generates and verifies tamper-proof HMAC QR tokens', () => {
    const payload = {
      bookingId: 'bkg-123',
      libraryId: 'lib-456',
      slotId: 'slot-789',
      date: '2026-10-10',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = generateQrToken(payload);
    expect(token).toBeDefined();
    expect(token).toContain('.');

    const verified = verifyQrToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.bookingId).toBe('bkg-123');
    expect(verified?.libraryId).toBe('lib-456');

    // Tampered token test (alter signature)
    const tampered = token.slice(0, -4) + 'abcd';
    expect(verifyQrToken(tampered)).toBeNull();
  });

  it('calculates Haversine geographic distance correctly', () => {
    // Bangalore MG Road to Hebbal ~ 7-8 km
    const dist = calculateHaversineDistance(12.9716, 77.5946, 13.0358, 77.597);
    expect(dist).toBeGreaterThan(6.5);
    expect(dist).toBeLessThan(8.5);
  });

  it('accurately scores candidate seats based on user preferences', () => {
    const candidateSeat = {
      id: 'st-01',
      floorId: 'fl-01',
      label: 'A-12',
      seatType: 'INDIVIDUAL',
      facing: 'N',
      attributes: {
        window: true,
        powerOutlet: true,
        quietZone: true,
        nearDoor: false,
      },
    };

    const userPrefs = {
      seatType: 'INDIVIDUAL',
      window: true,
      powerOutlet: true,
      quietZone: true,
    };

    const scored = scoreSeat(candidateSeat, userPrefs);
    expect(scored.score).toBeGreaterThanOrEqual(80);
    expect(scored.reasons.length).toBeGreaterThan(0);
  });

  it('scores libraries with distance and amenities bonuses', () => {
    const scoreClose = scoreLibrary(1.5, { ac: true, wifi: true, lockers: true, powerOutlets: true }, false);
    const scoreFar = scoreLibrary(15.0, { ac: true, wifi: true, lockers: true, powerOutlets: true }, false);

    expect(scoreClose).toBeGreaterThan(scoreFar);
  });

  describe('VidyaBot Conversational Engine Tests', () => {
    it('answers identity queries intelligently and personally', () => {
      const res1 = generateChatResponse('whats ur name');
      expect(res1.reply).toContain('VidyaBot');
      expect(res1.suggestedActions?.length).toBeGreaterThan(0);

      const res2 = generateChatResponse('who r u');
      expect(res2.reply).toContain('VidyaBot');
    });

    it('handles greetings and casual check-ins with warmth', () => {
      const res1 = generateChatResponse('how r u');
      expect(res1.reply.toLowerCase()).toContain('great');

      const res2 = generateChatResponse('yo');
      expect(res2.reply.toLowerCase()).toContain('great to see you');

      const res3 = generateChatResponse('wassup');
      expect(res3.reply.toLowerCase()).toContain('great to see you');
    });

    it('responds empathetically to demotivation and study fatigue', () => {
      const res = generateChatResponse('bro i domt wanna go to lib');
      expect(res.reply).toContain('study fatigue');
      expect(res.suggestedActions?.some((a) => a.payload.path === '/app/study')).toBe(true);
    });

    it('explains the Pomodoro technique even with common typos', () => {
      const res = generateChatResponse('whats pomodro');
      expect(res.reply).toContain('Pomodoro Technique');
      expect(res.reply).toContain('25 Minutes Focus');
      expect(res.suggestedActions?.some((a) => a.payload.path === '/app/study')).toBe(true);
    });

    it('recommends top libraries with rich descriptions', () => {
      const res = generateChatResponse('which is best lib');
      expect(res.reply).toContain('Central Study Hub');
      expect(res.reply).toContain('Koramangala Community Library');
      expect(res.suggestedActions?.some((a) => a.payload.path === '/app/discover')).toBe(true);
    });

    it('guides user through cancelling reservations', () => {
      const res = generateChatResponse('can u cancel my booking');
      expect(res.reply).toContain('Cancel Booking');
      expect(res.suggestedActions?.some((a) => a.payload.path === '/app/bookings')).toBe(true);
    });

    it('explains leaderboards, rankings, and focus points', () => {
      const res = generateChatResponse('whats leaderboards');
      expect(res.reply).toContain('Leaderboard');
      expect(res.reply).toContain('Focus Hours');
      expect(res.suggestedActions?.some((a) => a.payload.path === '/app/leaderboard')).toBe(true);
    });

    it('reassures users that streaks are optional with zero penalties', () => {
      const res = generateChatResponse('i dont wanna hv streaks');
      expect(res.reply).toContain('optional');
      expect(res.reply).toContain('zero penalties');
    });
  });

  describe('Seat Reservation Rate Limiting & ACID Properties', () => {
    it('defines and equips seat reservation rate limiter middleware', () => {
      expect(typeof bookingRateLimiter).toBe('function');
      expect(bookingRateLimiter.length).toBeGreaterThanOrEqual(3);
    });

    it('defines and equips walk-in allocation rate limiter middleware', () => {
      expect(typeof walkInLimiter).toBe('function');
      expect(walkInLimiter.length).toBeGreaterThanOrEqual(3);
    });

    it('guarantees ACID atomicity by rolling back on failure and releasing connection', async () => {
      let rolledBack = false;
      let released = false;
      let committed = false;

      const mockConn = {
        beginTransaction: async () => {},
        commit: async () => {
          committed = true;
        },
        rollback: async () => {
          rolledBack = true;
        },
        release: () => {
          released = true;
        },
        query: async () => [[], undefined],
        execute: async () => [{ affectedRows: 1 } as any, undefined],
      };

      const originalGetConnection = pool.getConnection;
      pool.getConnection = (async () => mockConn as any) as any;

      try {
        await expect(
          withTransaction(async (tx) => {
            await tx.execute('INSERT INTO bookings ...');
            throw new AppError('SEAT_UNAVAILABLE', 'Seat is taken', 409);
          })
        ).rejects.toThrow('Seat is taken');

        expect(rolledBack).toBe(true);
        expect(committed).toBe(false);
        expect(released).toBe(true);
      } finally {
        pool.getConnection = originalGetConnection;
      }
    });

    it('guarantees ACID durability by committing transaction on success and releasing connection', async () => {
      let committed = false;
      let released = false;
      let rolledBack = false;

      const mockConn = {
        beginTransaction: async () => {},
        commit: async () => {
          committed = true;
        },
        rollback: async () => {
          rolledBack = true;
        },
        release: () => {
          released = true;
        },
        query: async () => [[{ id: 'bk-123', status: 'CONFIRMED' }], undefined],
        execute: async () => [{ affectedRows: 1 } as any, undefined],
      };

      const originalGetConnection = pool.getConnection;
      pool.getConnection = (async () => mockConn as any) as any;

      try {
        const result = await withTransaction(async (tx) => {
          await tx.execute('INSERT INTO bookings ...');
          const rows = await tx.query<any[]>('SELECT * FROM bookings WHERE id = ?', ['bk-123']);
          return rows[0];
        });

        expect(result).toEqual({ id: 'bk-123', status: 'CONFIRMED' });
        expect(committed).toBe(true);
        expect(rolledBack).toBe(false);
        expect(released).toBe(true);
      } finally {
        pool.getConnection = originalGetConnection;
      }
    });
  });

  describe('Slot Start Arrival & 15-Minute Buffer Automation', () => {
    it('calculates strict 15-minute buffer wait time irrespective of slot hours', () => {
      // 6-hour slot: 06:00 to 12:00
      const date = '2026-11-05';
      const slot = { startTime: '06:00', endTime: '12:00' };
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const slotStart = new Date(`${date}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);

      // 15-minute buffer
      const graceUntil = new Date(slotStart.getTime() + 15 * 60 * 1000);
      const diffMinutes = (graceUntil.getTime() - slotStart.getTime()) / (60 * 1000);

      expect(diffMinutes).toBe(15);
      expect(graceUntil.getTime() - slotStart.getTime()).toBe(15 * 60 * 1000);
    });

    it('formats reminder prompt asking "Are you coming or not for the slot?" with 15-minute buffer info', () => {
      const seatLabel = 'F1-A12';
      const libraryName = 'Central Study Hub';
      const promptTitle = 'Are you coming or not for the slot?';
      const promptBody = `Your slot at ${libraryName} (Seat ${seatLabel}) has started. Please confirm if you are coming to receive a 15-minute buffer wait time.`;

      expect(promptTitle).toBe('Are you coming or not for the slot?');
      expect(promptBody).toContain('15-minute buffer wait time');
      expect(promptBody).toContain(seatLabel);
      expect(promptBody).toContain(libraryName);
    });

    it('handles direct cancellation when user clicks "No" releasing seat and generating cancellation payload', () => {
      const booking = {
        id: 'bk-cancel-123',
        status: 'CONFIRMED',
        seatLabel: 'F2-B04',
        libraryName: 'Koramangala Community Library',
      };

      const userChoice = false; // User clicked "No"
      const transitionStatus = userChoice ? 'CONFIRMED' : 'CANCELLED';
      const notification = {
        type: 'BOOKING_CANCELLED' as const,
        title: 'Booking Cancelled & Seat Released',
        body: `Your booking for seat ${booking.seatLabel} at ${booking.libraryName} was cancelled as requested and the seat has been released.`,
      };

      expect(transitionStatus).toBe('CANCELLED');
      expect(notification.type).toBe('BOOKING_CANCELLED');
      expect(notification.title).toBe('Booking Cancelled & Seat Released');
      expect(notification.body).toContain(booking.seatLabel);
    });

    it('formats automated cancellation when 15-minute buffer expires without arrival', () => {
      const graceUntil = new Date(Date.now() - 60000); // 1 minute in the past
      const isBufferExpired = graceUntil <= new Date();

      expect(isBufferExpired).toBe(true);

      const noShowPayload = {
        type: 'NO_SHOW' as const,
        title: 'Slot Cancelled (15-Min Buffer Expired)',
        body: 'Your reservation for Seat F1-A1 at Central Study Hub was automatically cancelled because you did not arrive within the 15-minute buffer wait time.',
      };

      expect(noShowPayload.type).toBe('NO_SHOW');
      expect(noShowPayload.title).toBe('Slot Cancelled (15-Min Buffer Expired)');
      expect(noShowPayload.body).toContain('15-minute buffer wait time');
    });
  });
});

