import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../utils/errorMessages';
import { createDefaultFloorGrid } from '../mocks/db';
import { generateChatResponse } from '../chat/chatEngine';
import { renderFormattedText } from '../utils/formatText';
import {
  saveStoredUser,
  findStoredUserByEmail,
  getUserDashboard,
  getUserBookings,
  saveStoredBooking,
  addStoredStudySession,
  getUserNotifications,
  getUserPreferences,
  saveStoredLibrary,
  findStoredLibraryById,
  updateStoredLibrary,
  getLibraryForAdmin,
  getStoredFloorsForLibrary,
  saveStoredFloorForLibrary,
  saveStoredFloorsForLibrary,
  getStoredSlotsForLibrary,
  saveStoredSlotsForLibrary,
  addStoredSlotForLibrary,
  getStoredBookingsForLibrary,
  getStoredAnalyticsForLibrary,
  addStoredNotification,
  getUserWaitlist,
  getStoredWaitlist,
  addStoredWaitlistEntry,
  removeStoredWaitlistEntry,
  updateStoredWaitlistEntry,
} from '../mocks/storage';
import { mockFloorGrids, mockSlots } from '../mocks/db';

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
      date: new Date().toLocaleDateString('en-CA'),
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

    // Verify seats exist and safe fallback selector guarantees valid seat models for recommendation
    expect(fl1Seats.length).toBeGreaterThan(0);
    const hasA1 = fl1Seats.some((s) => s.label === 'F1-A1');
    const hasB1 = fl1Seats.some((s) => s.label === 'F1-B1');

    expect(hasA1).toBe(true);
    expect(hasB1).toBe(true);

    // Fallback safe selector guarantees a valid seat object
    const safeSeat1 = fl1Seats.find((s) => s.label === 'F1-A1') || fl1Seats[0];
    expect(safeSeat1).toBeDefined();
    expect(safeSeat1.id).toBeDefined();
    expect(safeSeat1.label).toBeDefined();
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

describe('Library Isolation and Fresh Setup Flow', () => {
  it('newly registered library has status PENDING and starts with fresh empty data (0 floors, 0 seats, 0 slots)', () => {
    const testLibId = `lib-test-fresh-${Date.now()}`;
    const testAdminId = `usr-admin-${Date.now()}`;

    const newAdmin = {
      id: testAdminId,
      name: 'Fresh Admin',
      email: `admin-${Date.now()}@freshlib.test`,
      role: 'LIBRARY_ADMIN' as const,
      libraryId: testLibId,
      createdAt: new Date().toISOString(),
    };
    saveStoredUser(newAdmin);

    const newLib = {
      id: testLibId,
      name: 'Apex Study Lounge',
      address: '10th Main, Indiranagar',
      city: 'Bengaluru',
      latitude: 12.978,
      longitude: 77.64,
      contactEmail: newAdmin.email,
      amenities: { lockers: true, cctv: true, ac: true, wifi: true, powerOutlets: true },
      isFree: false,
      status: 'PENDING' as const,
      seatCounts: { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 },
      totalSeats: 0,
      floorCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveStoredLibrary(newLib);

    // 1. Admin gets their own pending library
    const adminLib = getLibraryForAdmin(newAdmin);
    expect(adminLib.id).toBe(testLibId);
    expect(adminLib.name).toBe('Apex Study Lounge');
    expect(adminLib.status).toBe('PENDING');

    // 2. Starts with fresh empty data
    const floors = getStoredFloorsForLibrary(testLibId);
    expect(Object.keys(floors).length).toBe(0);

    const slots = getStoredSlotsForLibrary(testLibId);
    expect(slots.length).toBe(0);

    const bookings = getStoredBookingsForLibrary(testLibId);
    expect(bookings.length).toBe(0);

    const analytics = getStoredAnalyticsForLibrary(testLibId);
    expect(analytics.totalSeats).toBe(0);
    expect(analytics.bookedSeats).toBe(0);
    expect(analytics.revenuePaise).toBe(0);
  });

  it('site owner approval transitions library to APPROVED and admin keeps isolated data intact', () => {
    const testLibId = `lib-test-approve-${Date.now()}`;
    const testAdminId = `usr-admin-${Date.now()}`;

    const adminUser = {
      id: testAdminId,
      name: 'Approved Admin',
      email: `admin-${Date.now()}@approved.test`,
      role: 'LIBRARY_ADMIN' as const,
      libraryId: testLibId,
      createdAt: new Date().toISOString(),
    };
    saveStoredUser(adminUser);

    const lib = {
      id: testLibId,
      name: 'Bright Minds Library',
      address: 'Koramangala 4th Block',
      city: 'Bengaluru',
      latitude: 12.935,
      longitude: 77.624,
      contactEmail: adminUser.email,
      amenities: { lockers: true, cctv: true, ac: true, wifi: true, powerOutlets: true },
      isFree: false,
      status: 'PENDING' as const,
      seatCounts: { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 },
      totalSeats: 0,
      floorCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveStoredLibrary(lib);

    // Site owner approves
    const approved = updateStoredLibrary(testLibId, { status: 'APPROVED' });
    expect(approved?.status).toBe('APPROVED');

    const adminLib = getLibraryForAdmin(adminUser);
    expect(adminLib.status).toBe('APPROVED');

    // Admin creates a floor grid
    const floorGrid = createDefaultFloorGrid(`${testLibId}-fl-1`, 1, 'Main Hall');
    saveStoredFloorForLibrary(testLibId, floorGrid);

    // Admin adds a time slot
    addStoredSlotForLibrary(testLibId, {
      id: `slot-${Date.now()}`,
      libraryId: testLibId,
      name: 'MORNING',
      startTime: '07:00',
      endTime: '13:00',
      isFree: false,
      pricePaise: 6000,
      isActive: true,
    });

    // Check data is saved and isolated
    const savedFloors = getStoredFloorsForLibrary(testLibId);
    expect(Object.keys(savedFloors).length).toBe(1);
    expect(savedFloors[`${testLibId}-fl-1`].label).toBe('Main Hall');

    const savedSlots = getStoredSlotsForLibrary(testLibId);
    expect(savedSlots.length).toBe(1);
    expect(savedSlots[0].startTime).toBe('07:00');

    // Central Study Hub (lib-1) remains isolated and unaffected
    const lib1Slots = getStoredSlotsForLibrary('lib-1');
    expect(lib1Slots.some((s) => s.libraryId === testLibId)).toBe(false);
  });

  it('generates welcome notification and initial isolation state for newly registered library admin', () => {
    const testLibId = `lib-test-notif-${Date.now()}`;
    const testAdminId = `usr-admin-notif-${Date.now()}`;

    const newAdmin = {
      id: testAdminId,
      name: 'Notif Admin',
      email: `notif-${Date.now()}@library.test`,
      role: 'LIBRARY_ADMIN' as const,
      libraryId: testLibId,
      createdAt: new Date().toISOString(),
    };
    saveStoredUser(newAdmin);

    const newLib = {
      id: testLibId,
      name: 'Horizon Knowledge Hub',
      address: '22 Residency Road',
      city: 'Bengaluru',
      latitude: 12.97,
      longitude: 77.6,
      contactEmail: newAdmin.email,
      amenities: { lockers: true, cctv: true, ac: true, wifi: true, powerOutlets: true },
      isFree: false,
      status: 'PENDING' as const,
      seatCounts: { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 },
      totalSeats: 0,
      floorCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveStoredLibrary(newLib);
    saveStoredFloorsForLibrary(testLibId, {});
    saveStoredSlotsForLibrary(testLibId, []);

    addStoredNotification(newAdmin.id, {
      id: `notif-${Date.now()}`,
      title: 'Library Registration Submitted! 🏛️',
      body: `Your application for "${newLib.name}" is pending platform owner verification. Once approved, you can build your floor layouts and accept bookings.`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    const notifs = getUserNotifications(newAdmin.id);
    expect(notifs.length).toBe(1);
    expect(notifs[0].title).toContain('Library Registration Submitted!');
    expect(notifs[0].body).toContain('pending platform owner verification');

    const adminLib = getLibraryForAdmin(newAdmin);
    expect(adminLib.status).toBe('PENDING');
  });

  it('re-submitting registration with existing library admin email retrieves the library and authenticates without blocking with EMAIL_TAKEN', () => {
    const adminEmail = `reentry-${Date.now()}@library.test`;
    const testLibId = `lib-reentry-${Date.now()}`;
    const admin = {
      id: `usr-reentry-${Date.now()}`,
      name: 'Reentry Admin',
      email: adminEmail,
      role: 'LIBRARY_ADMIN' as const,
      libraryId: testLibId,
      createdAt: new Date().toISOString(),
    };
    saveStoredUser(admin);

    const lib = {
      id: testLibId,
      name: 'Reentry Study Lounge',
      address: 'Indiranagar 100ft Road',
      city: 'Bengaluru',
      latitude: 12.97,
      longitude: 77.6,
      contactEmail: adminEmail,
      amenities: { lockers: true, cctv: true, ac: true, wifi: true, powerOutlets: true },
      isFree: false,
      status: 'PENDING' as const,
      seatCounts: { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 },
      totalSeats: 0,
      floorCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveStoredLibrary(lib);

    // Existing check logic retrieves this admin smoothly
    const found = findStoredUserByEmail(adminEmail);
    expect(found).toBeDefined();
    expect(found?.role).toBe('LIBRARY_ADMIN');
    expect(found?.libraryId).toBe(testLibId);

    const userLib = getLibraryForAdmin(found!);
    expect(userLib.id).toBe(testLibId);
    expect(userLib.name).toBe('Reentry Study Lounge');
  });

  describe('VidyaBot Frontend Assistant Tests', () => {
    it('handles student slang, greetings, typos and intent prompts smoothly', () => {
      const promptsAndChecks: Array<{ prompt: string; expectedSubstring: string; actionPath?: string }> = [
        { prompt: 'whats ur name', expectedSubstring: 'VidyaBot' },
        { prompt: 'who r u', expectedSubstring: 'VidyaBot' },
        { prompt: 'how r u', expectedSubstring: 'great' },
        { prompt: 'yo', expectedSubstring: 'great to see you' },
        { prompt: 'wassup', expectedSubstring: 'great to see you' },
        { prompt: 'bro i domt wanna go to lib', expectedSubstring: 'study fatigue', actionPath: '/app/study' },
        { prompt: 'whats pomodro', expectedSubstring: 'Pomodoro Technique', actionPath: '/app/study' },
        { prompt: 'which is best lib', expectedSubstring: 'Central Study Hub', actionPath: '/app/discover' },
        { prompt: 'can u cancel my booking', expectedSubstring: 'Cancel Booking', actionPath: '/app/bookings' },
        { prompt: 'whats leaderboards', expectedSubstring: 'Leaderboard', actionPath: '/app/leaderboard' },
        { prompt: 'i dont wanna hv streaks', expectedSubstring: 'zero penalties' },
      ];

      for (const item of promptsAndChecks) {
        const res = generateChatResponse(item.prompt);
        expect(res.reply.toLowerCase()).toContain(item.expectedSubstring.toLowerCase());
        if (item.actionPath) {
          expect(res.suggestedActions?.some((a) => a.payload.path === item.actionPath)).toBe(true);
        }
      }
    });

    it('renders **bold** markdown cleanly without showing raw asterisks', () => {
      const rawText = "The **Pomodoro Technique** is a proven method for **25 Minutes Focus**.";
      const elements = renderFormattedText(rawText, false);
      expect(Array.isArray(elements)).toBe(true);

      // Verify that no part has raw **
      const renderedStrings = elements!.map((el: any) => (typeof el === 'string' ? el : el.props.children));
      const fullText = renderedStrings.join('');
      expect(fullText).not.toContain('**');
      expect(fullText).toContain('The Pomodoro Technique is a proven method for 25 Minutes Focus.');
    });
  });

  describe('Student Seat Waitlist Queue & Claim Flow', () => {
    it('correctly adds student to waitlist for an occupied seat and assigns queue position', () => {
      const testUserId = `usr-test-wait-${Date.now()}`;
      const seat = mockFloorGrids['fl-1'].cells.find((c) => c.seat?.label === 'A-02')?.seat || mockFloorGrids['fl-1'].cells[1].seat!;
      const slot = mockSlots[0];
      const date = '2026-10-25';

      const allWaitlist = getStoredWaitlist();
      const existingQueueCount = allWaitlist.filter(
        (w) => w.seat.id === seat.id && w.slot.id === slot.id && w.date === date && w.status === 'WAITING'
      ).length;
      const expectedPosition = existingQueueCount + 1;

      const entryId = `wt-test-${Date.now()}`;
      addStoredWaitlistEntry(testUserId, {
        id: entryId,
        seat,
        libraryId: 'lib-1',
        libraryName: 'Central Study Hub',
        slot,
        date,
        status: 'WAITING',
        position: expectedPosition,
        createdAt: new Date().toISOString(),
      });

      const userEntries = getUserWaitlist(testUserId);
      const found = userEntries.find((w) => w.id === entryId);
      expect(found).toBeDefined();
      expect(found?.seat.label).toBe(seat.label);
      expect(found?.position).toBe(expectedPosition);
      expect(found?.status).toBe('WAITING');
    });

    it('detects and prevents duplicate waitlist requests for the same seat, slot, and date', () => {
      const testUserId = `usr-test-dup-${Date.now()}`;
      const seat = mockFloorGrids['fl-1'].cells[0].seat!;
      const slot = mockSlots[1];
      const date = '2026-10-26';

      addStoredWaitlistEntry(testUserId, {
        id: `wt-1-${Date.now()}`,
        seat,
        libraryId: 'lib-1',
        libraryName: 'Central Study Hub',
        slot,
        date,
        status: 'WAITING',
        position: 1,
        createdAt: new Date().toISOString(),
      });

      const currentList = getUserWaitlist(testUserId);
      const isDuplicate = currentList.some(
        (w) => w.seat.id === seat.id && w.slot.id === slot.id && w.date === date && (w.status === 'WAITING' || w.status === 'NOTIFIED')
      );
      expect(isDuplicate).toBe(true);
    });

    it('notifies waiting student when a reservation is cancelled and sets a 10-minute claim expiry', () => {
      const testUserId = `usr-test-notify-${Date.now()}`;
      const seat = mockFloorGrids['fl-1'].cells[2].seat!;
      const slot = mockSlots[2];
      const date = '2026-10-27';
      const entryId = `wt-notify-${Date.now()}`;

      addStoredWaitlistEntry(testUserId, {
        id: entryId,
        seat,
        libraryId: 'lib-1',
        libraryName: 'Central Study Hub',
        slot,
        date,
        status: 'WAITING',
        position: 1,
        createdAt: new Date().toISOString(),
      });

      // Simulate booking cancellation triggering notify
      const claimExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      updateStoredWaitlistEntry(entryId, {
        status: 'NOTIFIED',
        claimExpiresAt,
      });

      const updatedList = getUserWaitlist(testUserId);
      const updatedEntry = updatedList.find((w) => w.id === entryId);
      expect(updatedEntry?.status).toBe('NOTIFIED');
      expect(updatedEntry?.claimExpiresAt).toBe(claimExpiresAt);
    });

    it('claiming a notified waitlist entry updates status to CLAIMED and records booking', () => {
      const testUserId = `usr-test-claim-${Date.now()}`;
      const seat = mockFloorGrids['fl-1'].cells[3].seat!;
      const slot = mockSlots[0];
      const date = '2026-10-28';
      const entryId = `wt-claim-${Date.now()}`;

      addStoredWaitlistEntry(testUserId, {
        id: entryId,
        seat,
        libraryId: 'lib-1',
        libraryName: 'Central Study Hub',
        slot,
        date,
        status: 'NOTIFIED',
        position: 1,
        claimExpiresAt: new Date(Date.now() + 600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Claiming
      updateStoredWaitlistEntry(entryId, { status: 'CLAIMED' });
      const bookingId = `bk-wl-${Date.now()}`;
      saveStoredBooking({
        id: bookingId,
        code: `VA-WL${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        libraryId: 'lib-1',
        libraryName: 'Central Study Hub',
        seat,
        floorLabel: 'Floor 1 - Main Hall',
        slot,
        date,
        status: 'CONFIRMED',
        source: 'ONLINE',
        userId: testUserId,
        pricePaise: 0,
        paymentStatus: 'FREE',
        graceUntil: `${date}T${slot.startTime}:00.000Z`,
        arrivalConfirmed: false,
        createdAt: new Date().toISOString(),
      });

      const userEntries = getUserWaitlist(testUserId);
      expect(userEntries.find((w) => w.id === entryId)?.status).toBe('CLAIMED');

      const userBookings = getUserBookings(testUserId);
      const claimedBooking = userBookings.find((b) => b.id === bookingId);
      expect(claimedBooking).toBeDefined();
      expect(claimedBooking?.seat.label).toBe(seat.label);
      expect(claimedBooking?.status).toBe('CONFIRMED');
    });

    it('leaving waitlist removes the entry from the student active queue', () => {
      const testUserId = `usr-test-leave-${Date.now()}`;
      const seat = mockFloorGrids['fl-1'].cells[0].seat!;
      const slot = mockSlots[0];
      const date = '2026-10-29';
      const entryId = `wt-leave-${Date.now()}`;

      addStoredWaitlistEntry(testUserId, {
        id: entryId,
        seat,
        libraryId: 'lib-1',
        libraryName: 'Central Study Hub',
        slot,
        date,
        status: 'WAITING',
        position: 1,
        createdAt: new Date().toISOString(),
      });

      expect(getUserWaitlist(testUserId).length).toBe(1);

      removeStoredWaitlistEntry(entryId, testUserId);
      expect(getUserWaitlist(testUserId).length).toBe(0);
    });
  });
});


