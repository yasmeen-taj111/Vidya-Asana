import { describe, it, expect } from 'vitest';
import { generateUUID, generateBookingCode } from '../src/utils/ids';
import { generateQrToken, verifyQrToken } from '../src/utils/qr';
import { scoreSeat, scoreLibrary, calculateHaversineDistance } from '../src/utils/scoring';

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
});
