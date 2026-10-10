import {
  User,
  Library,
  TimeSlot,
  FloorGrid,
  Seat,
  Booking,
  WaitlistEntry,
  Notification,
  UserPreferences,
  StudyReport,
  LeaderboardEntry,
} from '../api/types';

export const mockUsers: User[] = [
  {
    id: 'usr-1',
    name: 'Platform Owner',
    email: 'owner@vidyaasana.test',
    role: 'SITE_OWNER',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-2',
    name: 'Rajesh Kumar',
    email: 'admin@vidyaasana.test',
    role: 'LIBRARY_ADMIN',
    libraryId: 'lib-1',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'usr-3',
    name: 'Anita Sharma',
    email: 'pending@vidyaasana.test',
    role: 'LIBRARY_ADMIN',
    libraryId: 'lib-2',
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'usr-4',
    name: 'Aarav Patel',
    email: 'student@vidyaasana.test',
    role: 'USER',
    phone: '+91 98765 43210',
    createdAt: '2026-01-04T00:00:00.000Z',
  },
  {
    id: 'usr-5',
    name: 'Priya Nair',
    email: 'student2@vidyaasana.test',
    role: 'USER',
    phone: '+91 98765 43211',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
];

export const mockLibraries: Library[] = [
  {
    id: 'lib-1',
    name: 'Central Study Hub',
    description: 'Premier air-conditioned library with high-speed fiber internet and ergonomic seating across two dedicated study floors.',
    address: '42 MG Road, Ashok Nagar',
    city: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    contactEmail: 'admin@vidyaasana.test',
    contactPhone: '+91 80 2558 1234',
    status: 'APPROVED',
    amenities: {
      lockers: true,
      cctv: true,
      ac: true,
      wifi: true,
      powerOutlets: true,
    },
    isFree: false,
    seatCounts: {
      INDIVIDUAL: 18,
      GROUP: 4,
      ACCESSIBLE: 2,
      COMPUTER: 8,
    },
    totalSeats: 32,
    floorCount: 2,
    distanceKm: 1.2,
    matchScore: 95,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'lib-2',
    name: 'Koramangala Community Library',
    description: 'Quiet residential library ideal for UPSC and competitive exam aspirants with serene natural light.',
    address: '15, 80 Feet Road, 4th Block, Koramangala',
    city: 'Bengaluru',
    latitude: 12.9352,
    longitude: 77.6245,
    contactEmail: 'pending@vidyaasana.test',
    contactPhone: '+91 80 2553 4321',
    status: 'PENDING',
    amenities: {
      lockers: true,
      cctv: true,
      ac: true,
      wifi: true,
      powerOutlets: true,
    },
    isFree: true,
    seatCounts: {
      INDIVIDUAL: 20,
      GROUP: 2,
      ACCESSIBLE: 2,
      COMPUTER: 4,
    },
    totalSeats: 28,
    floorCount: 1,
    distanceKm: 4.8,
    matchScore: 82,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'lib-3',
    name: 'Indiranagar Tech & Knowledge Lounge',
    description: 'Modern co-study space equipped with standing desks, monitor-equipped workstations and silent research pods.',
    address: '100 Feet Rd, Defence Colony, Indiranagar',
    city: 'Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
    contactEmail: 'info@indiralounge.org',
    contactPhone: '+91 80 4123 9876',
    status: 'APPROVED',
    amenities: {
      lockers: true,
      cctv: true,
      ac: true,
      wifi: true,
      powerOutlets: true,
    },
    isFree: false,
    seatCounts: {
      INDIVIDUAL: 24,
      GROUP: 6,
      ACCESSIBLE: 2,
      COMPUTER: 12,
    },
    totalSeats: 44,
    floorCount: 2,
    distanceKm: 5.1,
    matchScore: 89,
    createdAt: '2026-01-10T00:00:00.000Z',
  },
];

export const mockSlots: TimeSlot[] = [
  {
    id: 'slot-1',
    libraryId: 'lib-1',
    name: 'MORNING',
    startTime: '06:00',
    endTime: '12:00',
    isFree: false,
    pricePaise: 5000, // ₹50
    isActive: true,
  },
  {
    id: 'slot-2',
    libraryId: 'lib-1',
    name: 'AFTERNOON',
    startTime: '12:00',
    endTime: '17:00',
    isFree: false,
    pricePaise: 6000, // ₹60
    isActive: true,
  },
  {
    id: 'slot-3',
    libraryId: 'lib-1',
    name: 'EVENING',
    startTime: '17:00',
    endTime: '21:00',
    isFree: false,
    pricePaise: 5000, // ₹50
    isActive: true,
  },
  {
    id: 'slot-4',
    libraryId: 'lib-1',
    name: 'NIGHT',
    startTime: '21:00',
    endTime: '23:59',
    isFree: false,
    pricePaise: 4000, // ₹40
    isActive: true,
  },
];

// Build floor grids for Central Study Hub
export function createDefaultFloorGrid(floorId: string, floorNumber: number, label: string): FloorGrid {
  const rows = 5;
  const cols = 6;
  const cells: FloorGrid['cells'] = [];

  let seatIndex = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Create aisle in column 2
      if (c === 2) {
        cells.push({ row: r, col: c, type: 'AISLE' });
        continue;
      }
      // Door at row 4, col 0
      if (r === 4 && c === 0) {
        cells.push({ row: r, col: c, type: 'DOOR' });
        continue;
      }

      const isWindow = c === 0 || c === cols - 1;
      const isComputer = r === 0;
      const isGroup = r === 3 && (c === 3 || c === 4);
      const isAccessible = r === 4 && c === 1;

      const seatType = isComputer
        ? 'COMPUTER'
        : isGroup
        ? 'GROUP'
        : isAccessible
        ? 'ACCESSIBLE'
        : 'INDIVIDUAL';

      const seat: Seat = {
        id: `seat-${floorId}-${r}-${c}`,
        floorId,
        label: `F${floorNumber}-${String.fromCharCode(65 + r)}${c + 1}`,
        seatType,
        facing: r % 2 === 0 ? 'N' : 'S',
        attributes: {
          window: isWindow,
          powerOutlet: isComputer || r < 3,
          quietZone: r < 2,
          nearDoor: r >= 3 && c <= 2,
        },
        isActive: true,
        groupCapacity: isGroup ? 4 : undefined,
      };

      cells.push({
        row: r,
        col: c,
        type: 'SEAT',
        seat,
        status: 'AVAILABLE',
      });
      seatIndex++;
    }
  }

  return {
    floorId,
    floorNumber,
    label,
    rows,
    cols,
    cells,
  };
}

export const mockFloorGrids: Record<string, FloorGrid> = {
  'fl-1': createDefaultFloorGrid('fl-1', 1, 'Floor 1 - Main Hall'),
  'fl-2': createDefaultFloorGrid('fl-2', 2, 'Floor 2 - Silent Research Zone'),
};

const todayStr = new Date().toISOString().split('T')[0];

export const mockBookings: Booking[] = [
  {
    id: 'bk-101',
    code: 'VA-8F3K2',
    libraryId: 'lib-1',
    libraryName: 'Central Study Hub',
    seat: mockFloorGrids['fl-1'].cells.find((c) => c.seat?.label === 'F1-A1')!.seat!,
    floorLabel: 'Floor 1 - Main Hall',
    slot: mockSlots[0],
    date: todayStr,
    status: 'CONFIRMED',
    source: 'ONLINE',
    userId: 'usr-4',
    pricePaise: 5000,
    paymentStatus: 'PAID',
    graceUntil: `${todayStr}T06:30:00.000Z`,
    arrivalConfirmed: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'bk-102',
    code: 'VA-9K2L1',
    libraryId: 'lib-1',
    libraryName: 'Central Study Hub',
    seat: mockFloorGrids['fl-1'].cells.find((c) => c.seat?.label === 'F1-A2')!.seat!,
    floorLabel: 'Floor 1 - Main Hall',
    slot: mockSlots[0],
    date: todayStr,
    status: 'CHECKED_IN',
    source: 'ONLINE',
    userId: 'usr-5',
    pricePaise: 5000,
    paymentStatus: 'PAID',
    graceUntil: `${todayStr}T06:30:00.000Z`,
    arrivalConfirmed: true,
    checkedInAt: `${todayStr}T06:12:00.000Z`,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const mockWaitlist: WaitlistEntry[] = [];

export const mockNotifications: Notification[] = [
  {
    id: 'ntf-1',
    type: 'BOOKING_CONFIRMED',
    title: 'Booking Confirmed!',
    body: 'Your reservation for seat F1-A1 at Central Study Hub is confirmed.',
    isRead: false,
    data: { bookingId: 'bk-101' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const mockUserPreferences: UserPreferences = {
  seatType: 'INDIVIDUAL',
  window: true,
  powerOutlet: true,
  quietZone: true,
  studyMode: 'SOLO',
  preferredSlot: 'MORNING',
};

export const mockStudyReport: StudyReport = {
  totalFocusSeconds: 18 * 3600, // 18 hours
  activeDays: 5,
  consistencyPercent: 83,
  streakDays: 4,
  daily: [
    { date: '2026-10-06', focusSeconds: 3 * 3600 },
    { date: '2026-10-07', focusSeconds: 4 * 3600 },
    { date: '2026-10-08', focusSeconds: 3.5 * 3600 },
    { date: '2026-10-09', focusSeconds: 4.5 * 3600 },
    { date: '2026-10-10', focusSeconds: 3 * 3600 },
  ],
  bySessionType: {
    POMODORO: 12 * 3600,
    CUSTOM: 4 * 3600,
    STOPWATCH: 2 * 3600,
  },
};

export const mockLeaderboardEntries: LeaderboardEntry[] = [
  { rank: 1, userId: 'usr-8', name: 'Tanvi Desai', focusSeconds: 32 * 3600, isMe: false },
  { rank: 2, userId: 'usr-9', name: 'Karthik Rao', focusSeconds: 28 * 3600, isMe: false },
  { rank: 3, userId: 'usr-4', name: 'Aarav Patel (You)', focusSeconds: 18 * 3600, isMe: true },
  { rank: 4, userId: 'usr-5', name: 'Priya Nair', focusSeconds: 15 * 3600, isMe: false },
  { rank: 5, userId: 'usr-10', name: 'Vivek Singhania', focusSeconds: 12 * 3600, isMe: false },
];
