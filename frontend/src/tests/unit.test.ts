import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../utils/errorMessages';
import { createDefaultFloorGrid } from '../mocks/db';

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
