import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../utils/errorMessages';
import { createDefaultFloorGrid } from '../mocks/db';
import {
  saveStoredUser,
  getUserDashboard,
  getUserBookings,
  saveStoredBooking,
  addStoredStudySession,
  getUserNotifications,
  getUserPreferences,
} from '../mocks/storage';

describe('Error Code Mapper', () => {
  it('maps known API error codes to human friendly messages', () => {
    expect(getErrorMessage('SEAT_UNAVAILABLE')).toBe(
      'This seat is already booked for the selected date and time slot.'
    );
    expect(getErrorMessage('OVERLAPPING_BOOKING')).toBe(
      'You already have another active booking that overlaps with this time slot.'
    );
    expect(getErrorMessage('RATE_LIMITED')).toBe(
      'Too many requests. Please wait a moment and try again.'
    );
  });

  it('falls back to default message on unknown code', () => {
    expect(getErrorMessage('UNKNOWN_CODE_XYZ')).toBe('An unexpected error occurred.');
  });
});

describe('Floor Grid Generator', () => {
  it('creates grid with designated aisles, doors and seat labels', () => {
    const grid = createDefaultFloorGrid('fl-test', 1, 'Test Floor');
    expect(grid.floorNumber).toBe(1);
    expect(grid.rows).toBe(5);
    expect(grid.cols).toBe(6);
    expect(grid.cells.length).toBe(30);

    const aisleCells = grid.cells.filter((c) => c.type === 'AISLE');
    expect(aisleCells.length).toBeGreaterThan(0);

    const seatCells = grid.cells.filter((c) => c.type === 'SEAT');
    expect(seatCells.length).toBeGreaterThan(0);
    expect(seatCells[0].seat?.label).toBeDefined();
    expect(seatCells[0].seat?.facing).toBeDefined();
  });
});

describe('Slot Overlap Logic', () => {
  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const isOverlapping = (startA: string, endA: string, startB: string, endB: string) => {
    const aS = toMinutes(startA);
    const aE = toMinutes(endA);
    const bS = toMinutes(startB);
    const bE = toMinutes(endB);
    return Math.max(aS, bS) < Math.min(aE, bE);
  };

  it('correctly detects overlapping intervals', () => {
    expect(isOverlapping('06:00', '12:00', '10:00', '14:00')).toBe(true);
    expect(isOverlapping('06:00', '12:00', '12:00', '17:00')).toBe(false);
    expect(isOverlapping('17:00', '21:00', '18:00', '20:00')).toBe(true);
  });
});

describe('User Isolation and Storage', () => {
  it('new user starts with 0 bookings, 0 focus hours, 0 streak and no demo data', () => {
    const testUserId = `usr-test-fresh-${Date.now()}`;
    saveStoredUser({
      id: testUserId,
      name: 'Fresh Student',
      email: 'fresh@example.com',
      role: 'USER',
      createdAt: new Date().toISOString(),
    });

    const dashboard = getUserDashboard(testUserId);
    expect(dashboard.stats.totalBookings).toBe(0);
    expect(dashboard.stats.totalFocusHours).toBe(0);
    expect(dashboard.stats.currentStreakDays).toBe(0);
    expect(dashboard.upcomingBooking).toBeUndefined();
    expect(dashboard.preferredSeat).toBeUndefined();

    const bookings = getUserBookings(testUserId);
    expect(bookings.length).toBe(0);

    const notifications = getUserNotifications(testUserId);
    expect(notifications.length).toBe(0);

    const preferences = getUserPreferences(testUserId);
    expect(preferences.seatType).toBe('INDIVIDUAL');
  });

  it('preserves and updates data when user creates a booking and study session', () => {
    const testUserId = `usr-test-active-${Date.now()}`;
    saveStoredUser({
      id: testUserId,
      name: 'Active Student',
      email: 'active@example.com',
      role: 'USER',
      createdAt: new Date().toISOString(),
    });

    const seat = {
      id: 'seat-test-1',
      floorId: 'fl-1',
      label: 'F1-Z9',
      seatType: 'INDIVIDUAL' as const,
      facing: 'N' as const,
      attributes: { window: true, powerOutlet: true, quietZone: true, nearDoor: false },
      isActive: true,
    };

    const slot = {
      id: 'slot-morning',
      libraryId: 'lib-1',
      name: 'MORNING' as const,
      startTime: '06:00',
      endTime: '12:00',
      isFree: true,
      pricePaise: 0,
      isActive: true,
    };

    saveStoredBooking({
      id: `bk-${Date.now()}`,
      code: 'VA-TEST1',
      libraryId: 'lib-1',
      libraryName: 'Central Study Hub',
      seat,
      floorLabel: 'Floor 1',
      slot,
      date: new Date().toISOString().split('T')[0],
      status: 'CONFIRMED',
      source: 'ONLINE',
      userId: testUserId,
      pricePaise: 0,
      paymentStatus: 'FREE',
      graceUntil: new Date().toISOString(),
      arrivalConfirmed: false,
      createdAt: new Date().toISOString(),
    });

    addStoredStudySession({
      userId: testUserId,
      type: 'POMODORO',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      focusSeconds: 7200, // 2 hours
    });

    const updatedDashboard = getUserDashboard(testUserId);
    expect(updatedDashboard.stats.totalBookings).toBe(1);
    expect(updatedDashboard.stats.totalFocusHours).toBe(2);
    expect(updatedDashboard.stats.currentStreakDays).toBe(1);
    expect(updatedDashboard.upcomingBooking).toBeDefined();
    expect(updatedDashboard.preferredSeat?.seat.label).toBe('F1-Z9');
  });

  it('preserves rich pre-seeded stats for demo student profile usr-4', () => {
    const demoDashboard = getUserDashboard('usr-4');
    expect(demoDashboard.stats.totalBookings).toBeGreaterThanOrEqual(1);
    expect(demoDashboard.stats.longestStreakDays).toBe(9);
    expect(demoDashboard.preferredSeat).toBeDefined();
  });
});

describe('Student Seat Booking & Suggestion Flow', () => {
  it('safely finds existing seat models for suggestions without undefined access', () => {
    const grid1 = createDefaultFloorGrid('fl-1', 1, 'Floor 1');
    const fl1Seats = grid1.cells.filter((c) => c.type === 'SEAT' && c.seat).map((c) => c.seat!);

    // Verify Aisle at column index 3 means F1-A4 does NOT exist, while F1-A3 and F1-B1 exist
    const hasA3 = fl1Seats.some((s) => s.label === 'F1-A3');
    const hasA4 = fl1Seats.some((s) => s.label === 'F1-A4');
    const hasB1 = fl1Seats.some((s) => s.label === 'F1-B1');

    expect(hasA3).toBe(true);
    expect(hasA4).toBe(false);
    expect(hasB1).toBe(true);

    // Fallback safe selector guarantees a valid seat object
    const safeSeat1 = fl1Seats.find((s) => s.label === 'F1-A3') || fl1Seats[0];
    expect(safeSeat1).toBeDefined();
    expect(safeSeat1.id).toBeDefined();
  });

  it('detects user overlapping booking on same date and slot', () => {
    const studentId = `usr-student-${Date.now()}`;
    const testDate = '2026-10-15';
    const slotId = 'slot-1';

    const initialBookings = getUserBookings(studentId);
    expect(initialBookings.length).toBe(0);

    const booking: any = {
      id: `bk-${Date.now()}`,
      code: 'VA-TEST9',
      libraryId: 'lib-1',
      libraryName: 'Central Study Hub',
      seat: { id: 'seat-1', label: 'F1-A1' },
      floorLabel: 'Floor 1',
      slot: { id: slotId, name: 'MORNING' },
      date: testDate,
      status: 'CONFIRMED',
      userId: studentId,
      createdAt: new Date().toISOString(),
    };

    saveStoredBooking(booking);

    const userBookings = getUserBookings(studentId);
    expect(userBookings.length).toBe(1);

    // Check overlap logic
    const hasOverlap = userBookings.some(
      (b) => b.slot.id === slotId && b.date === testDate && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );
    expect(hasOverlap).toBe(true);

    // Another date or slot has no overlap
    const hasOverlapDifferentDate = userBookings.some(
      (b) => b.slot.id === slotId && b.date === '2026-10-16' && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );
    expect(hasOverlapDifferentDate).toBe(false);
  });
});

