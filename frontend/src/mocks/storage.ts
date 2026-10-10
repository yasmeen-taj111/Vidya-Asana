import {
  User,
  Booking,
  WaitlistEntry,
  Notification,
  UserPreferences,
  StudyReport,
  LeaderboardEntry,
  Seat,
  Library,
  TimeSlot,
  FloorGrid,
} from '../api/types';
import {
  mockUsers as initialMockUsers,
  mockBookings as initialMockBookings,
  mockNotifications as initialMockNotifications,
  mockUserPreferences as defaultPreferences,
  mockFloorGrids,
  mockLibraries as initialMockLibraries,
  mockSlots as initialMockSlots,
} from './db';

export interface StoredNotification extends Notification {
  userId?: string;
}

export interface StoredWaitlistEntry extends WaitlistEntry {
  userId?: string;
}

export interface StoredStudySession {
  id: string;
  userId: string;
  type: 'POMODORO' | 'CUSTOM' | 'STOPWATCH';
  startedAt: string;
  endedAt: string;
  focusSeconds: number;
  breakSeconds?: number;
  bookingId?: string;
}

// -------------------------------------------------------------
// Helper for Safe LocalStorage Access with Memory Fallback
// -------------------------------------------------------------
const memoryStore: Record<string, string> = {};

function loadJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch {}

  if (memoryStore[key]) {
    try {
      return JSON.parse(memoryStore[key]);
    } catch {}
  }

  return fallback;
}

function saveJson<T>(key: string, value: T): void {
  const json = JSON.stringify(value);
  memoryStore[key] = json;
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, json);
    }
  } catch {}
}

export function clearMemoryStore(): void {
  Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
}

// -------------------------------------------------------------
// 1. Users Store
// -------------------------------------------------------------
export function getStoredUsers(): User[] {
  return loadJson<User[]>('va_mock_users', initialMockUsers);
}

export function saveStoredUser(user: User): void {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  saveJson('va_mock_users', users);
}

export function findStoredUserByEmail(email: string): User | undefined {
  return getStoredUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

// -------------------------------------------------------------
// 2. Identify Current User from Request or Local Storage
// -------------------------------------------------------------
export function resolveCurrentUser(request?: Request): User | null {
  if (request) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Format: mock-token-${userId} or mock-token-${userId}-${timestamp}
      if (token.startsWith('mock-token-') || token.startsWith('dev-token-')) {
        const prefix = token.startsWith('mock-token-') ? 'mock-token-' : 'dev-token-';
        const rawPart = token.substring(prefix.length);
        const allUsers = getStoredUsers();
        // Check if rawPart contains a known user id
        const user = allUsers.find((u) => rawPart === u.id || rawPart.startsWith(`${u.id}-`));
        if (user) return user;
      }
    }
  }

  // Fallback to active user in localStorage
  try {
    const saved = localStorage.getItem('va_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.id) {
        return getStoredUsers().find((u) => u.id === parsed.id) || parsed;
      }
    }
  } catch {}

  return null;
}

// -------------------------------------------------------------
// 3. Bookings Store
// -------------------------------------------------------------
export function autoExpireOverdueBookings(bookings?: Booking[]): { bookings: Booking[]; expiredCount: number } {
  const all = bookings || loadJson<Booking[]>('va_mock_bookings', initialMockBookings);
  const now = new Date();
  const nowMs = now.getTime();
  let updatedAny = false;
  let expiredCount = 0;

  for (const b of all) {
    if (b.status === 'CONFIRMED' && !b.checkedInAt) {
      let slotStartMs = 0;
      if (b.date && b.slot?.startTime) {
        const year = parseInt(b.date.substring(0, 4));
        const month = parseInt(b.date.substring(5, 7)) - 1;
        const day = parseInt(b.date.substring(8, 10));
        const [startH, startM] = b.slot.startTime.split(':').map(Number);
        slotStartMs = new Date(year, month, day, startH, startM, 0, 0).getTime();
      }

      const defaultBufferExpiryMs = slotStartMs > 0 ? slotStartMs + 15 * 60 * 1000 : 0;
      let graceExpiryMs = 0;
      if (b.graceUntil) {
        graceExpiryMs = new Date(b.graceUntil).getTime();
      }

      let isExpired = false;
      if (b.arrivalConfirmed) {
        isExpired = graceExpiryMs > 0 && nowMs >= graceExpiryMs;
      } else {
        if (graceExpiryMs > 0 && defaultBufferExpiryMs > 0) {
          isExpired = nowMs >= Math.max(graceExpiryMs, defaultBufferExpiryMs);
        } else if (graceExpiryMs > 0) {
          isExpired = nowMs >= graceExpiryMs;
        } else if (defaultBufferExpiryMs > 0) {
          isExpired = nowMs >= defaultBufferExpiryMs;
        }
      }

      if (isExpired) {
        b.status = 'NO_SHOW';
        b.cancelledAt = now.toISOString();
        updatedAny = true;
        expiredCount++;

        const notifTitle = 'Slot Cancelled (15-Min Buffer Expired)';
        const existingNotifs = loadJson<StoredNotification[]>('va_mock_notifications', initialTaggedNotifications);
        const alreadyNotified = existingNotifs.some(
          (n) => n.userId === b.userId && n.data?.bookingId === b.id && n.type === 'NO_SHOW'
        );
        if (!alreadyNotified) {
          existingNotifs.unshift({
            id: `ntf-noshow-${b.id}-${Date.now()}`,
            userId: b.userId || 'usr-4',
            type: 'NO_SHOW',
            title: notifTitle,
            body: `Your reservation for seat ${b.seat?.label || 'your seat'} at ${b.libraryName} was automatically cancelled because the 15-minute buffer expired.`,
            isRead: false,
            data: { bookingId: b.id },
            createdAt: now.toISOString(),
          });
          saveJson('va_mock_notifications', existingNotifs);
        }
      }
    }
  }

  if (updatedAny) {
    saveJson('va_mock_bookings', all);
  }

  return { bookings: all, expiredCount };
}

export function getStoredBookings(): Booking[] {
  const raw = loadJson<Booking[]>('va_mock_bookings', initialMockBookings);
  return autoExpireOverdueBookings(raw).bookings;
}

export function saveStoredBooking(booking: Booking): void {
  const bookings = getStoredBookings();
  const index = bookings.findIndex((b) => b.id === booking.id);
  if (index >= 0) {
    bookings[index] = booking;
  } else {
    bookings.push(booking);
  }
  saveJson('va_mock_bookings', bookings);
}

export function getUserBookings(userId: string): Booking[] {
  return getStoredBookings().filter((b) => b.userId === userId);
}

export function updateStoredBooking(id: string, partial: Partial<Booking>): Booking | undefined {
  const bookings = getStoredBookings();
  const b = bookings.find((x) => x.id === id);
  if (b) {
    Object.assign(b, partial);
    saveJson('va_mock_bookings', bookings);
    return b;
  }
  return undefined;
}

// -------------------------------------------------------------
// 4. Notifications Store
// -------------------------------------------------------------
const initialTaggedNotifications: StoredNotification[] = initialMockNotifications.map((n) => ({
  ...n,
  userId: 'usr-4', // Aarav demo user
}));

export function getStoredNotifications(): StoredNotification[] {
  return loadJson<StoredNotification[]>('va_mock_notifications', initialTaggedNotifications);
}

export function getUserNotifications(userId: string): Notification[] {
  const all = getStoredNotifications();
  // Filter for this user specifically
  return all.filter((n) => n.userId === userId);
}

export function addStoredNotification(userId: string, notification: Notification): void {
  const all = getStoredNotifications();
  all.unshift({ ...notification, userId });
  saveJson('va_mock_notifications', all);
}

export function markStoredNotificationRead(id: string, userId: string): void {
  const all = getStoredNotifications();
  const item = all.find((n) => n.id === id && n.userId === userId);
  if (item) {
    item.isRead = true;
    saveJson('va_mock_notifications', all);
  }
}

export function markAllStoredNotificationsRead(userId: string): void {
  const all = getStoredNotifications();
  all.forEach((n) => {
    if (n.userId === userId) n.isRead = true;
  });
  saveJson('va_mock_notifications', all);
}

// -------------------------------------------------------------
// 5. Waitlist Store
// -------------------------------------------------------------
export function getStoredWaitlist(): StoredWaitlistEntry[] {
  return loadJson<StoredWaitlistEntry[]>('va_mock_waitlist', []);
}

export function getUserWaitlist(userId: string): WaitlistEntry[] {
  return getStoredWaitlist().filter((w) => w.userId === userId);
}

export function addStoredWaitlistEntry(userId: string, entry: WaitlistEntry): void {
  const all = getStoredWaitlist();
  all.push({ ...entry, userId });
  saveJson('va_mock_waitlist', all);
}

export function removeStoredWaitlistEntry(id: string, userId: string): void {
  const all = getStoredWaitlist().filter((w) => !(w.id === id && w.userId === userId));
  saveJson('va_mock_waitlist', all);
}

export function updateStoredWaitlistEntry(id: string, partial: Partial<StoredWaitlistEntry>): void {
  const all = getStoredWaitlist();
  const item = all.find((w) => w.id === id);
  if (item) {
    Object.assign(item, partial);
    saveJson('va_mock_waitlist', all);
  }
}

// -------------------------------------------------------------
// 6. User Preferences Store
// -------------------------------------------------------------
export function getUserPreferences(userId: string): UserPreferences {
  const map = loadJson<Record<string, UserPreferences>>('va_mock_preferences', {
    'usr-4': defaultPreferences,
  });

  if (map[userId]) {
    return map[userId];
  }

  // Default clean preferences for newly registered users
  return {
    seatType: 'INDIVIDUAL',
    window: true,
    powerOutlet: true,
    quietZone: true,
    studyMode: 'SOLO',
    preferredSlot: 'MORNING',
  };
}

export function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): UserPreferences {
  const map = loadJson<Record<string, UserPreferences>>('va_mock_preferences', {
    'usr-4': defaultPreferences,
  });

  const current = map[userId] || {
    seatType: 'INDIVIDUAL',
    window: true,
    powerOutlet: true,
    quietZone: true,
    studyMode: 'SOLO',
    preferredSlot: 'MORNING',
  };

  map[userId] = { ...current, ...prefs };
  saveJson('va_mock_preferences', map);
  return map[userId];
}

// -------------------------------------------------------------
// 7. Study Sessions & Reports Store
// -------------------------------------------------------------
const initialAaravSessions: StoredStudySession[] = [
  {
    id: 'ss-init-1',
    userId: 'usr-4',
    type: 'POMODORO',
    startedAt: '2026-10-06T10:00:00.000Z',
    endedAt: '2026-10-06T13:00:00.000Z',
    focusSeconds: 3 * 3600,
  },
  {
    id: 'ss-init-2',
    userId: 'usr-4',
    type: 'POMODORO',
    startedAt: '2026-10-07T09:00:00.000Z',
    endedAt: '2026-10-07T13:00:00.000Z',
    focusSeconds: 4 * 3600,
  },
  {
    id: 'ss-init-3',
    userId: 'usr-4',
    type: 'CUSTOM',
    startedAt: '2026-10-08T14:00:00.000Z',
    endedAt: '2026-10-08T17:30:00.000Z',
    focusSeconds: 3.5 * 3600,
  },
  {
    id: 'ss-init-4',
    userId: 'usr-4',
    type: 'POMODORO',
    startedAt: '2026-10-09T08:00:00.000Z',
    endedAt: '2026-10-09T12:30:00.000Z',
    focusSeconds: 4.5 * 3600,
  },
  {
    id: 'ss-init-5',
    userId: 'usr-4',
    type: 'STOPWATCH',
    startedAt: '2026-10-10T09:00:00.000Z',
    endedAt: '2026-10-10T12:00:00.000Z',
    focusSeconds: 3 * 3600,
  },
];

export function getStoredStudySessions(): StoredStudySession[] {
  return loadJson<StoredStudySession[]>('va_mock_study_sessions', initialAaravSessions);
}

export function addStoredStudySession(session: Omit<StoredStudySession, 'id'>): StoredStudySession {
  const all = getStoredStudySessions();
  const created: StoredStudySession = {
    ...session,
    id: `ss-${Date.now()}`,
  };
  all.push(created);
  saveJson('va_mock_study_sessions', all);
  return created;
}

export function getUserStudyReport(userId: string, range = 'week'): StudyReport {
  const sessions = getStoredStudySessions().filter((s) => s.userId === userId);

  const daysCount = range === 'month' ? 30 : 7;
  const now = new Date();

  // Initialize empty daily map
  const dailyMap: Record<string, number> = {};
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA');
    dailyMap[dateStr] = 0;
  }

  const bySessionType = {
    POMODORO: 0,
    CUSTOM: 0,
    STOPWATCH: 0,
  };

  let totalFocusSeconds = 0;
  const activeDates = new Set<string>();

  sessions.forEach((s) => {
    totalFocusSeconds += s.focusSeconds;
    const dateStr = s.startedAt.split('T')[0];
    activeDates.add(dateStr);

    if (dailyMap[dateStr] !== undefined) {
      dailyMap[dateStr] += s.focusSeconds;
    } else {
      dailyMap[dateStr] = s.focusSeconds;
    }

    if (bySessionType[s.type] !== undefined) {
      bySessionType[s.type] += s.focusSeconds;
    }
  });

  const daily = Object.keys(dailyMap)
    .sort()
    .map((date) => ({
      date,
      focusSeconds: dailyMap[date],
    }));

  const activeDays = activeDates.size;
  const consistencyPercent = daysCount > 0 ? Math.min(100, Math.round((activeDays / daysCount) * 100)) : 0;

  // Compute streak
  let streakDays = 0;
  if (activeDates.size > 0) {
    const sortedDates = Array.from(activeDates).sort().reverse();
    const todayStr = now.toLocaleDateString('en-CA');
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    // Check if streak is alive (active today or yesterday)
    if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
      streakDays = 1;
      let checkDate = new Date(sortedDates[0]);
      for (let i = 1; i < sortedDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const expected = checkDate.toLocaleDateString('en-CA');
        if (sortedDates[i] === expected) {
          streakDays++;
        } else {
          break;
        }
      }
    }
  }

  return {
    totalFocusSeconds,
    activeDays,
    consistencyPercent,
    streakDays,
    daily,
    bySessionType,
  };
}

// -------------------------------------------------------------
// 8. User Dashboard Stats
// -------------------------------------------------------------
export function getUserDashboard(userId: string) {
  const userBookings = getUserBookings(userId);
  const todayStr = new Date().toLocaleDateString('en-CA');

  // Upcoming reservation
  const upcomingBooking = userBookings.find(
    (b) => (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && b.date >= todayStr
  );

  // Preferred desk (most frequently booked by this user)
  const seatCounts: Record<string, { count: number; seat: Seat; libraryId: string; libraryName: string }> = {};
  userBookings.forEach((b) => {
    const id = b.seat.id;
    if (!seatCounts[id]) {
      seatCounts[id] = { count: 0, seat: b.seat, libraryId: b.libraryId, libraryName: b.libraryName };
    }
    seatCounts[id].count++;
  });

  let preferredSeat = undefined;
  const topSeat = Object.values(seatCounts).sort((a, b) => b.count - a.count)[0];
  if (topSeat) {
    preferredSeat = {
      seat: topSeat.seat,
      libraryId: topSeat.libraryId,
      libraryName: topSeat.libraryName,
      timesBooked: topSeat.count,
    };
  } else if (userId === 'usr-4') {
    // Fallback for Aarav demo profile
    const demoSeat = mockFloorGrids['fl-1'].cells.find((c) => c.seat?.label === 'F1-A1')?.seat;
    if (demoSeat) {
      preferredSeat = {
        seat: demoSeat,
        libraryId: 'lib-1',
        libraryName: 'Central Study Hub',
        timesBooked: 7,
      };
    }
  }

  const report = getUserStudyReport(userId);
  const totalFocusHours = Math.round((report.totalFocusSeconds / 3600) * 10) / 10;

  return {
    upcomingBooking,
    preferredSeat,
    stats: {
      totalBookings: userBookings.length,
      totalFocusHours,
      currentStreakDays: report.streakDays,
      longestStreakDays: Math.max(report.streakDays, userId === 'usr-4' ? 9 : report.streakDays),
    },
  };
}

// -------------------------------------------------------------
// 9. Leaderboard Store
// -------------------------------------------------------------
export function getStoredLeaderboard(currentUserId: string): LeaderboardEntry[] {
  const users = getStoredUsers().filter((u) => u.role === 'USER');
  const entries: LeaderboardEntry[] = [];

  // Fixed top community members for vibrant demo
  const staticCommunity = [
    { id: 'usr-8', name: 'Tanvi Desai', focusSeconds: 32 * 3600 },
    { id: 'usr-9', name: 'Karthik Rao', focusSeconds: 28 * 3600 },
    { id: 'usr-10', name: 'Vivek Singhania', focusSeconds: 12 * 3600 },
  ];

  staticCommunity.forEach((c) => {
    entries.push({
      rank: 0,
      userId: c.id,
      name: c.name,
      focusSeconds: c.focusSeconds,
      isMe: c.id === currentUserId,
    });
  });

  // Calculate actual focus time for registered users
  users.forEach((u) => {
    if (!staticCommunity.some((c) => c.id === u.id)) {
      const rep = getUserStudyReport(u.id);
      entries.push({
        rank: 0,
        userId: u.id,
        name: u.id === currentUserId ? `${u.name} (You)` : u.name,
        focusSeconds: rep.totalFocusSeconds,
        isMe: u.id === currentUserId,
      });
    }
  });

  entries.sort((a, b) => b.focusSeconds - a.focusSeconds);
  entries.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  return entries;
}

// -------------------------------------------------------------
// 10. Libraries Store (Persistent & Per-Library Isolated)
// -------------------------------------------------------------
export function getStoredLibraries(): Library[] {
  return loadJson<Library[]>('va_mock_libraries', initialMockLibraries);
}

export function saveStoredLibrary(library: Library): void {
  const libraries = getStoredLibraries();
  const index = libraries.findIndex((l) => l.id === library.id);
  if (index >= 0) {
    libraries[index] = library;
  } else {
    libraries.push(library);
  }
  saveJson('va_mock_libraries', libraries);
}

export function updateStoredLibrary(id: string, partial: Partial<Library>): Library | undefined {
  const libraries = getStoredLibraries();
  const lib = libraries.find((l) => l.id === id);
  if (lib) {
    Object.assign(lib, partial);
    saveJson('va_mock_libraries', libraries);
    return lib;
  }
  return undefined;
}

export function findStoredLibraryById(id: string): Library | undefined {
  return getStoredLibraries().find((l) => l.id === id);
}

export function getLibraryForAdmin(user?: User | null): Library {
  const libraries = getStoredLibraries();
  if (user?.libraryId) {
    const matched = libraries.find((l) => l.id === user.libraryId);
    if (matched) return matched;
  }
  if (user?.email?.toLowerCase().includes('pending') || user?.id === 'usr-3') {
    const matched = libraries.find(
      (l) => l.id === 'lib-2' || l.contactEmail?.toLowerCase() === 'pending@vidyaasana.test'
    );
    if (matched) return matched;
    const pendingLib = libraries.find((l) => l.status === 'PENDING');
    if (pendingLib) return pendingLib;
    return libraries[1] || libraries[0];
  }
  return libraries[0];
}

// -------------------------------------------------------------
// 11. Floors Store (Per-Library Isolated)
// -------------------------------------------------------------
export function getStoredFloorsForLibrary(libraryId: string): Record<string, FloorGrid> {
  if (libraryId === 'lib-1') {
    return loadJson<Record<string, FloorGrid>>(`va_mock_floors_${libraryId}`, mockFloorGrids);
  }
  return loadJson<Record<string, FloorGrid>>(`va_mock_floors_${libraryId}`, {});
}

export function saveStoredFloorsForLibrary(libraryId: string, floors: Record<string, FloorGrid>): void {
  saveJson(`va_mock_floors_${libraryId}`, floors);
}

export function saveStoredFloorForLibrary(libraryId: string, floorGrid: FloorGrid): void {
  const floors = getStoredFloorsForLibrary(libraryId);
  floors[floorGrid.floorId] = floorGrid;
  saveStoredFloorsForLibrary(libraryId, floors);
}

// -------------------------------------------------------------
// 12. Time Slots Store (Per-Library Isolated)
// -------------------------------------------------------------
export function getStoredSlotsForLibrary(libraryId: string): TimeSlot[] {
  if (libraryId === 'lib-1') {
    return loadJson<TimeSlot[]>(`va_mock_slots_${libraryId}`, initialMockSlots);
  }
  return loadJson<TimeSlot[]>(`va_mock_slots_${libraryId}`, []);
}

export function saveStoredSlotsForLibrary(libraryId: string, slots: TimeSlot[]): void {
  saveJson(`va_mock_slots_${libraryId}`, slots);
}

export function addStoredSlotForLibrary(libraryId: string, slot: TimeSlot): TimeSlot {
  const slots = getStoredSlotsForLibrary(libraryId);
  slots.push(slot);
  saveStoredSlotsForLibrary(libraryId, slots);
  return slot;
}

export function updateStoredSlotForLibrary(
  libraryId: string,
  slotId: string,
  partial: Partial<TimeSlot>
): TimeSlot | undefined {
  const slots = getStoredSlotsForLibrary(libraryId);
  const slot = slots.find((s) => s.id === slotId);
  if (slot) {
    Object.assign(slot, partial);
    saveStoredSlotsForLibrary(libraryId, slots);
    return slot;
  }
  return undefined;
}

export function deleteStoredSlotForLibrary(libraryId: string, slotId: string): boolean {
  const slots = getStoredSlotsForLibrary(libraryId);
  const idx = slots.findIndex((s) => s.id === slotId);
  if (idx !== -1) {
    slots.splice(idx, 1);
    saveStoredSlotsForLibrary(libraryId, slots);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// 13. Bookings and Analytics for Library
// -------------------------------------------------------------
export function getStoredBookingsForLibrary(libraryId: string): Booking[] {
  return getStoredBookings().filter((b) => b.libraryId === libraryId);
}

export function getStoredAnalyticsForLibrary(libraryId: string) {
  const floors = getStoredFloorsForLibrary(libraryId);
  let totalSeats = 0;
  Object.values(floors).forEach((grid) => {
    grid.cells.forEach((cell) => {
      if (cell.type === 'SEAT' && cell.seat && cell.seat.isActive !== false) {
        totalSeats++;
      }
    });
  });

  const libBookings = getStoredBookingsForLibrary(libraryId);
  const bookedSeats = libBookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN'
  ).length;
  const availableSeats = Math.max(0, totalSeats - bookedSeats);
  const bookedPercent = totalSeats > 0 ? Math.min(100, Math.round((bookedSeats / totalSeats) * 100)) : 0;
  const notBookedPercent = 100 - bookedPercent;
  const checkedIn = libBookings.filter((b) => b.status === 'CHECKED_IN').length;
  const noShows = libBookings.filter((b) => b.status === 'NO_SHOW').length;
  const walkIns = libBookings.filter((b) => b.source === 'WALK_IN').length;

  const revenuePaise = libBookings
    .filter((b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.pricePaise || 0), 0);

  return {
    totalSeats,
    bookedSeats,
    availableSeats,
    bookedPercent,
    notBookedPercent,
    checkedIn,
    noShows,
    walkIns,
    revenuePaise,
  };
}

// -------------------------------------------------------------
// 14. Seat Reservation Rate Limiter & ACID Invariant Controller
// -------------------------------------------------------------
const bookingAttemptsMap = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export function checkBookingRateLimit(
  userId: string,
  limit = 10,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
  const history = bookingAttemptsMap.get(userId) || [];
  const recent = history.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    bookingAttemptsMap.set(userId, recent);
    return { allowed: false, remaining: 0, retryAfter };
  }

  recent.push(now);
  bookingAttemptsMap.set(userId, recent);
  return { allowed: true, remaining: limit - recent.length };
}

export function resetBookingRateLimit(userId?: string): void {
  if (userId) {
    bookingAttemptsMap.delete(userId);
  } else {
    bookingAttemptsMap.clear();
  }
}
