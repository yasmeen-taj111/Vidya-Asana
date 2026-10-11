// Vidya Asana — Types from API_CONTRACT.md v1.0 (§2 & §3)

export type Role = 'SITE_OWNER' | 'LIBRARY_ADMIN' | 'USER';
export type LibraryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SeatType = 'INDIVIDUAL' | 'GROUP' | 'ACCESSIBLE' | 'COMPUTER';
export type SlotName = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type Facing = 'N' | 'E' | 'S' | 'W';
export type CellType = 'SEAT' | 'AISLE' | 'EMPTY' | 'DOOR' | 'WINDOW_WALL';
export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'YOURS' | 'HELD' | 'MAINTENANCE';
export type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type BookingSource = 'ONLINE' | 'WALK_IN';
export type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'CLAIMED' | 'EXPIRED' | 'REMOVED';
export type StudySessionType = 'POMODORO' | 'CUSTOM' | 'STOPWATCH';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  createdAt: string;
  libraryId?: string; /* LIBRARY_ADMIN only */
}

export interface Library {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  contactEmail: string;
  contactPhone?: string;
  status: LibraryStatus;
  rejectionReason?: string;
  amenities: {
    lockers: boolean;
    cctv: boolean;
    ac: boolean;
    wifi: boolean;
    powerOutlets: boolean;
  };
  isFree: boolean;
  seatCounts: Record<SeatType, number>;
  totalSeats: number;
  floorCount: number;
  distanceKm?: number;
  matchScore?: number;
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  libraryId: string;
  name: SlotName | string;
  startTime: string;
  endTime: string;
  isFree: boolean;
  pricePaise: number;
  isActive: boolean;
}

export interface UnbookableInterval {
  id: string;
  libraryId: string;
  date?: string | null;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeatAttributes {
  window: boolean;
  powerOutlet: boolean;
  quietZone: boolean;
  nearDoor: boolean;
}

export interface Seat {
  id: string;
  floorId: string;
  label: string;
  seatType: SeatType;
  facing: Facing;
  attributes: SeatAttributes;
  isActive: boolean;
  groupCapacity?: number;
}

export interface GridCell {
  row: number;
  col: number;
  type: CellType;
  seat?: Seat;
  status?: SeatStatus;
}

export interface FloorGrid {
  floorId: string;
  floorNumber: number;
  label: string;
  rows: number;
  cols: number;
  cells: GridCell[];
}

export interface SeatSuggestion {
  seat: Seat;
  floorLabel: string;
  score: number;
  reasons: string[];
}

export interface Booking {
  id: string;
  code: string;
  libraryId: string;
  libraryName: string;
  seat: Seat;
  floorLabel: string;
  slot: TimeSlot;
  date: string;
  status: BookingStatus;
  source: BookingSource;
  userId?: string;
  guestName?: string;
  pricePaise: number;
  paymentStatus: 'FREE' | 'PAID' | 'PENDING';
  graceUntil: string;
  arrivalConfirmed: boolean;
  checkedInAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  seat: Seat;
  libraryId: string;
  libraryName: string;
  slot: TimeSlot;
  date: string;
  status: WaitlistStatus;
  position: number;
  claimExpiresAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type:
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_CANCELLED'
    | 'GRACE_EXTENDED'
    | 'REMINDER'
    | 'NO_SHOW'
    | 'WAITLIST_AVAILABLE'
    | 'LIBRARY_APPROVED'
    | 'LIBRARY_REJECTED'
    | 'SYSTEM';
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// Contract §1 Error Codes
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'LIBRARY_NOT_APPROVED'
  | 'NOT_FOUND'
  | 'SEAT_UNAVAILABLE'
  | 'OVERLAPPING_BOOKING'
  | 'SEAT_HELD_FOR_WAITLIST'
  | 'ALREADY_ON_WAITLIST'
  | 'EMAIL_TAKEN'
  | 'BOOKING_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface ApiErrorDetails {
  alternatives?: SeatSuggestion[];
  conflictingBookingId?: string;
  fields?: Record<string, string>;
  [key: string]: unknown;
}

export interface UserPreferences {
  seatType?: SeatType;
  window?: boolean;
  powerOutlet?: boolean;
  quietZone?: boolean;
  studyMode?: 'SOLO' | 'GROUP';
  preferredSlot?: SlotName;
}

export interface DashboardStats {
  upcomingBooking?: Booking;
  preferredSeat?: {
    seat: Seat;
    libraryId: string;
    libraryName: string;
    timesBooked: number;
  };
  stats: {
    totalBookings: number;
    totalFocusHours: number;
    currentStreakDays: number;
    longestStreakDays: number;
  };
}

export interface FloorAnalytics {
  id: string;
  floorNumber: number;
  label: string;
  rows: number;
  cols: number;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  occupancyPercent: number;
  seatTypes: Record<string, number>;
}

export interface AnalyticsSummary {
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  bookedPercent: number;
  notBookedPercent: number;
  checkedIn: number;
  noShows: number;
  walkIns: number;
  revenuePaise: number;
  floors?: FloorAnalytics[];
}

export interface AnalyticsTimeseriesPoint {
  label: string;
  booked: number;
  capacity: number;
  percent: number;
}

export interface StudyReport {
  totalFocusSeconds: number;
  activeDays: number;
  consistencyPercent: number;
  streakDays: number;
  daily: { date: string; focusSeconds: number }[];
  bySessionType: Record<StudySessionType, number>;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  focusSeconds: number;
  isMe: boolean;
}

export interface ChatReply {
  conversationId: string;
  reply: string;
  suggestedActions?: {
    label: string;
    type: 'NAVIGATE' | 'BOOK';
    payload: Record<string, unknown>;
  }[];
}
