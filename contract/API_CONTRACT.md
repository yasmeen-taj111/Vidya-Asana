# Vidya Asana — API Contract v1.0 (SOURCE OF TRUTH)

Both the frontend agent and the backend agent build against THIS file. Neither may change it unilaterally.
Changes: append an entry to `/contract/CHANGELOG.md`, bump the version, and tell the human. Never silently rename a field.

---

## 0. Repo layout and ownership

```
vidya-asana/
├─ contract/            # shared, READ-ONLY for both agents (human edits)
│  ├─ API_CONTRACT.md   # this file
│  ├─ CHANGELOG.md
│  └─ fixtures/         # sample JSON responses (frontend mocks use these; backend seeds match them)
├─ backend/             # OWNED BY BACKEND AGENT ONLY
└─ frontend/            # OWNED BY FRONTEND AGENT ONLY
```

Rules:
1. Backend agent never edits `/frontend`. Frontend agent never edits `/backend`.
2. Neither edits `/contract` except appending to `CHANGELOG.md` a *proposed* change.
3. Ports: backend `4000`, frontend `5173`. API base: `http://localhost:4000/api/v1`. Socket.IO: `http://localhost:4000`.
4. Frontend env: `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_USE_MOCKS` (true = MSW mocks from fixtures, false = real backend).
5. Backend CORS allows `http://localhost:5173` with credentials.

---

## 1. Global conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1` |
| JSON keys | `camelCase` (DB is `snake_case`; backend maps) |
| IDs | **strings** (BIGINT in DB, serialized as string) |
| Timestamps | ISO 8601 UTC, e.g. `2026-10-10T08:30:00.000Z` |
| Booking date | `YYYY-MM-DD` in the library's local time (Asia/Kolkata) |
| Slot times | `HH:mm` 24h, library local. Slots must NOT cross midnight (MVP) |
| Money | integer **paise** (₹1 = 100). Field name ends with `Paise` |
| Pagination | `?page=1&pageSize=20` → `meta: { page, pageSize, total, totalPages }` |
| Auth | `Authorization: Bearer <accessToken>` (15 min). Refresh token in httpOnly cookie `refreshToken` |
| Idempotency | `POST /bookings` and `POST /bookings/walk-in` REQUIRE header `Idempotency-Key: <uuid>` |

### Success envelope
```json
{ "success": true, "data": { }, "meta": { } }
```
### Error envelope
```json
{ "success": false, "error": { "code": "SEAT_UNAVAILABLE", "message": "Human readable", "details": { } } }
```

### Error codes (frontend switches on `code`, never on message)
| HTTP | code | Notes |
|---|---|---|
| 400 | `BAD_REQUEST` | |
| 401 | `UNAUTHORIZED` | missing/expired token → frontend tries `/auth/refresh` once |
| 403 | `FORBIDDEN` | wrong role |
| 403 | `LIBRARY_NOT_APPROVED` | admin acting before approval |
| 404 | `NOT_FOUND` | |
| 409 | `SEAT_UNAVAILABLE` | `details.alternatives: SeatSuggestion[]` (required — this is the "suitable alternative" demo) |
| 409 | `OVERLAPPING_BOOKING` | user already has a booking whose slot overlaps; `details.conflictingBookingId` |
| 409 | `SEAT_HELD_FOR_WAITLIST` | seat is held for a waitlisted user |
| 409 | `ALREADY_ON_WAITLIST` | |
| 409 | `EMAIL_TAKEN` | |
| 410 | `BOOKING_EXPIRED` | |
| 422 | `VALIDATION_ERROR` | `details.fields: { [field]: message }` |
| 429 | `RATE_LIMITED` | `Retry-After` header (seconds) |
| 500 | `INTERNAL_ERROR` | |

---

## 2. Enums (exact strings)

```ts
type Role = 'SITE_OWNER' | 'LIBRARY_ADMIN' | 'USER';
type LibraryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type SeatType = 'INDIVIDUAL' | 'GROUP' | 'ACCESSIBLE' | 'COMPUTER';
type SlotName = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
type Facing = 'N' | 'E' | 'S' | 'W';
type CellType = 'SEAT' | 'AISLE' | 'EMPTY' | 'DOOR' | 'WINDOW_WALL';
type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'YOURS' | 'HELD' | 'MAINTENANCE'; // computed per (date, slot)
type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type BookingSource = 'ONLINE' | 'WALK_IN';
type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'CLAIMED' | 'EXPIRED' | 'REMOVED';
type StudySessionType = 'POMODORO' | 'CUSTOM' | 'STOPWATCH';
```

---

## 3. Shared types

```ts
interface User { id: string; name: string; email: string; role: Role; phone?: string; createdAt: string; libraryId?: string /* LIBRARY_ADMIN only */ }

interface Library {
  id: string; name: string; description?: string; address: string; city: string;
  latitude: number; longitude: number; contactEmail: string; contactPhone?: string;
  status: LibraryStatus; rejectionReason?: string;
  amenities: { lockers: boolean; cctv: boolean; ac: boolean; wifi: boolean; powerOutlets: boolean };
  isFree: boolean;                     // true if all slots are free
  seatCounts: Record<SeatType, number>;
  totalSeats: number;
  floorCount: number;
  distanceKm?: number;                 // present when lat/lng query given
  matchScore?: number;                 // 0-100, present on recommendation endpoints
  createdAt: string;
}

interface TimeSlot { id: string; libraryId: string; name: SlotName; startTime: string; endTime: string; isFree: boolean; pricePaise: number; isActive: boolean }

interface SeatAttributes { window: boolean; powerOutlet: boolean; quietZone: boolean; nearDoor: boolean }
interface Seat { id: string; floorId: string; label: string /* e.g. "A-12" */; seatType: SeatType; facing: Facing; attributes: SeatAttributes; isActive: boolean; groupCapacity?: number /* GROUP only */ }

interface GridCell { row: number; col: number; type: CellType; seat?: Seat; status?: SeatStatus /* only when type=SEAT and date+slotId were queried */ }
interface FloorGrid { floorId: string; floorNumber: number; label: string; rows: number; cols: number; cells: GridCell[] /* row-major, length = rows*cols */ }

interface SeatSuggestion { seat: Seat; floorLabel: string; score: number /* 0-100 */; reasons: string[] }

interface Booking {
  id: string; code: string /* short human code e.g. VA-8F3K2 */;
  libraryId: string; libraryName: string; seat: Seat; floorLabel: string;
  slot: TimeSlot; date: string; status: BookingStatus; source: BookingSource;
  userId?: string; guestName?: string;
  pricePaise: number; paymentStatus: 'FREE' | 'PAID' | 'PENDING';
  graceUntil: string; arrivalConfirmed: boolean;
  checkedInAt?: string; cancelledAt?: string; createdAt: string;
}

interface WaitlistEntry { id: string; seat: Seat; libraryId: string; libraryName: string; slot: TimeSlot; date: string; status: WaitlistStatus; position: number; claimExpiresAt?: string; createdAt: string }
interface Notification { id: string; type: 'BOOKING_CONFIRMED'|'REMINDER'|'NO_SHOW'|'WAITLIST_AVAILABLE'|'LIBRARY_APPROVED'|'LIBRARY_REJECTED'|'SYSTEM'; title: string; body: string; isRead: boolean; data?: Record<string, unknown>; createdAt: string }
```

---

## 4. REST endpoints

Legend: 🌐 public · 👤 USER · 🏛 LIBRARY_ADMIN · 👑 SITE_OWNER · 🔑 any logged-in.

### 4.1 Auth
| | Endpoint | Body | Response `data` |
|---|---|---|---|
| 🌐 | `POST /auth/register` | `{ name, email, password(min 8), phone? }` | `{ user, accessToken }` (role=USER) |
| 🌐 | `POST /auth/register-library` | `{ admin:{name,email,password,phone?}, library:{name,description?,address,city,latitude,longitude,contactEmail,contactPhone?,amenities,isFree} }` | `{ user, accessToken, library }` library.status=PENDING |
| 🌐 | `POST /auth/login` | `{ email, password }` | `{ user, accessToken }` + sets refresh cookie |
| 🌐 | `POST /auth/refresh` | – (cookie) | `{ accessToken }` |
| 🔑 | `POST /auth/logout` | – | `{ ok: true }` |
| 🔑 | `GET /auth/me` | – | `{ user }` |

### 4.2 Site owner (`/owner`)
| | Endpoint | Notes |
|---|---|---|
| 👑 | `GET /owner/libraries?status=&page=&pageSize=&q=` | paginated `Library[]` |
| 👑 | `GET /owner/libraries/:id` | `Library` + `admin: User` |
| 👑 | `POST /owner/libraries/:id/approve` | → `Library`; backend sends SMTP email to library admin |
| 👑 | `POST /owner/libraries/:id/reject` body `{ reason }` | → `Library`; SMTP email with reason |
| 👑 | `GET /owner/stats` | `{ totalLibraries, pending, approved, rejected, totalUsers, totalBookings }` |

### 4.3 Library admin (`/admin`) — all require approved library except GET profile
| | Endpoint | Notes |
|---|---|---|
| 🏛 | `GET /admin/library` | `Library` |
| 🏛 | `PUT /admin/library` | partial profile update (name, description, address, amenities, lat/lng…) |
| 🏛 | `POST /admin/library/grid/generate` | body `{ floors: [{ floorNumber, label, rows, cols, counts: Record<SeatType, number> }] }` → auto-creates floors, seats, layout. Total seats on a floor must be ≤ rows*cols else 422. Returns `FloorGrid[]` |
| 🏛 | `GET /admin/floors` | `{ id, floorNumber, label, rows, cols }[]` |
| 🏛 | `POST /admin/floors` | `{ floorNumber, label, rows, cols }` |
| 🏛 | `DELETE /admin/floors/:floorId` | 409 if future bookings exist |
| 🏛 | `GET /admin/floors/:floorId/grid` | `FloorGrid` (no status) |
| 🏛 | `PUT /admin/floors/:floorId/layout` | body `{ rows, cols, cells: [{ row, col, type, seat?: { label, seatType, facing, attributes, groupCapacity? } }] }` — full replace of layout. Preserves seat IDs when `seat.id` supplied. Returns `FloorGrid` |
| 🏛 | `PATCH /admin/seats/:seatId` | `{ seatType?, facing?, attributes?, isActive?, label? }` |
| 🏛 | `GET /admin/slots` | `TimeSlot[]` |
| 🏛 | `POST /admin/slots` | `{ name, startTime, endTime, isFree, pricePaise }` (no overlap with existing active slots) |
| 🏛 | `PUT /admin/slots/:slotId` · `DELETE /admin/slots/:slotId` | |
| 🏛 | `GET /admin/bookings?date=&slotId=&status=&page=` | paginated `Booking[]` |
| 🏛 | `POST /admin/checkin/scan` | `{ qrToken }` → `{ booking, result: 'CHECKED_IN' \| 'ALREADY_CHECKED_IN' }`; errors: `NOT_FOUND`, `BOOKING_EXPIRED`, `BAD_REQUEST` (wrong library/date/slot) |
| 🏛 | `POST /admin/bookings/walk-in` (Idempotency-Key) | `{ seatId, slotId, date, guestName? }` → `Booking` (source WALK_IN, status CHECKED_IN) |
| 🏛 | `POST /admin/bookings/:id/release` | walk-out / free the seat early → status COMPLETED, triggers waitlist notify |
| 🏛 | `GET /admin/analytics/summary?date=&slotId=` | `{ totalSeats, bookedSeats, availableSeats, bookedPercent, notBookedPercent, checkedIn, noShows, walkIns, revenuePaise }` |
| 🏛 | `GET /admin/analytics/timeseries?from=&to=&groupBy=day\|slot\|seatType` | `{ points: { label: string, booked: number, capacity: number, percent: number }[] }` |
| 🏛 | `GET /admin/reports/export?format=csv\|pdf&from=&to=` | file download (`Content-Disposition: attachment`) |

### 4.4 Discovery & grid (user-facing)
| | Endpoint | Notes |
|---|---|---|
| 🌐 | `GET /libraries?q=&lat=&lng=&radiusKm=&seatType=&isFree=&amenities=ac,cctv&page=` | only APPROVED. Sorted by distance if lat/lng. Paginated `Library[]` |
| 👤 | `GET /recommendations/libraries?lat=&lng=&seatType=&groupSize=&isFree=` | `Library[]` with `matchScore`, sorted desc |
| 🌐 | `GET /libraries/:id` | `Library` |
| 🌐 | `GET /libraries/:id/slots` | `TimeSlot[]` (active only) |
| 🌐 | `GET /libraries/:id/floors` | `{ id, floorNumber, label, rows, cols }[]` |
| 🌐 | `GET /libraries/:id/floors/:floorId/grid?date=&slotId=` | `FloorGrid` with `status` on every SEAT cell (`YOURS` only when authenticated) |
| 👤 | `POST /libraries/:id/suggest-seats` | body `{ date, slotId, preferences: { seatType?, groupSize?, window?, powerOutlet?, quietZone?, floorId? } }` → `{ suggestions: SeatSuggestion[] }` (max 5, only AVAILABLE) |

### 4.5 Bookings (user)
| | Endpoint | Notes |
|---|---|---|
| 👤 | `POST /bookings` (Idempotency-Key) | `{ libraryId, seatId, slotId, date }` → `Booking`. Errors: `SEAT_UNAVAILABLE` (with `alternatives`), `OVERLAPPING_BOOKING`, `SEAT_HELD_FOR_WAITLIST`. Cannot book past slot or > 14 days ahead |
| 👤 | `GET /bookings/me?status=&upcoming=true&page=` | paginated `Booking[]` |
| 👤 | `GET /bookings/:id` | `Booking` |
| 👤 | `GET /bookings/:id/qr` | `{ qrToken: string, qrDataUrl: string /* PNG data URL */, expiresAt: string }` |
| 👤 | `POST /bookings/:id/cancel` | → `Booking` (CANCELLED); frees seat; notifies waitlist |
| 👤 | `POST /bookings/:id/confirm-arrival` | body `{ coming: boolean }`. `true` → extends `graceUntil` by 30 min (ONCE; 409 if already used). `false` → cancels |

### 4.6 Waitlist
| | Endpoint | Notes |
|---|---|---|
| 👤 | `POST /waitlist` | `{ seatId, slotId, date }` → `WaitlistEntry` |
| 👤 | `GET /waitlist/me` | `WaitlistEntry[]` |
| 👤 | `DELETE /waitlist/:id` | |
| 👤 | `POST /waitlist/:id/claim` | only when status NOTIFIED and before `claimExpiresAt` → returns `Booking` |

### 4.7 User dashboard, study, leaderboard
| | Endpoint | Response |
|---|---|---|
| 👤 | `GET /users/me/dashboard` | `{ upcomingBooking?: Booking, preferredSeat?: { seat: Seat, libraryId, libraryName, timesBooked: number }, stats: { totalBookings, totalFocusHours, currentStreakDays, longestStreakDays } }` |
| 👤 | `PUT /users/me/preferences` | `{ seatType?, window?, powerOutlet?, quietZone?, studyMode?: 'SOLO'\|'GROUP', preferredSlot?: SlotName }` |
| 👤 | `GET /users/me/preferences` | same shape |
| 👤 | `POST /study/sessions` | `{ type: StudySessionType, startedAt, endedAt, focusSeconds, breakSeconds?, bookingId? }` → `{ id }` |
| 👤 | `GET /study/reports?range=week\|month` | `{ totalFocusSeconds, activeDays, consistencyPercent, streakDays, daily: { date: string, focusSeconds: number }[], bySessionType: Record<StudySessionType, number> }` |
| 👤 | `GET /study/leaderboard?scope=library\|global&period=week\|month&libraryId=` | `{ entries: { rank: number, userId: string, name: string, focusSeconds: number, isMe: boolean }[], myRank?: number }` |

### 4.8 Notifications & chatbot
| | Endpoint | Notes |
|---|---|---|
| 🔑 | `GET /notifications?unread=true&page=` | `Notification[]` |
| 🔑 | `POST /notifications/:id/read` · `POST /notifications/read-all` | |
| 👤 | `POST /chat` | `{ message: string, conversationId?: string }` → `{ conversationId, reply: string, suggestedActions?: { label: string, type: 'NAVIGATE'\|'BOOK', payload: Record<string,unknown> }[] }` (rate-limited) |

---

## 5. Socket.IO contract

Connect with `io(VITE_SOCKET_URL, { auth: { token: accessToken } })`. Server rejects invalid tokens.

| Direction | Event | Payload |
|---|---|---|
| client→server | `library:join` | `{ libraryId }` (viewing a grid) |
| client→server | `library:leave` | `{ libraryId }` |
| server→room `library:{id}` | `seat:updated` | `{ libraryId, seatId, slotId, date, status: SeatStatus }` |
| server→user | `booking:reminder` | `{ bookingId, message, graceUntil }` — "Are you coming?" prompt |
| server→user | `booking:released` | `{ bookingId, reason: 'NO_SHOW' \| 'CANCELLED_BY_ADMIN' }` |
| server→user | `waitlist:available` | `{ waitlistId, seat: Seat, claimExpiresAt }` |
| server→admin | `booking:checked-in` | `{ booking }` |
| server→user | `notification:new` | `Notification` |

---

## 6. Business rules both sides must agree on

1. **Availability** is per (seat, date, slot). A seat is BOOKED if a booking with status CONFIRMED or CHECKED_IN exists.
2. **Conflict prevention:** one seat+date+slot ⇒ max one active booking. One user ⇒ no two active bookings with overlapping slot times on the same date (across all libraries).
3. **No-show rule:** `graceUntil = slotStart + 30min`. Reminder (`booking:reminder` + email) at slotStart. If user taps "coming" → `graceUntil += 30min` (once). If not checked in by `graceUntil` → status NO_SHOW, seat freed, email sent, waitlist notified. If user taps "not coming" → CANCELLED.
4. **Waitlist:** FIFO per (seat, date, slot). On seat freed, first WAITING → NOTIFIED with `claimExpiresAt = now + 10min`; seat shows `HELD` to others. On expiry → EXPIRED, next in line notified.
5. **QR token:** opaque signed string (HMAC), contains bookingId + libraryId + slotId + date. Valid from slotStart−15min to slotEnd.
6. **Payments (MVP):** mocked. Paid slot ⇒ `paymentStatus: 'PAID'` after a fake instant success. FREE slot ⇒ `'FREE'`. No gateway.
7. **Recommendation scoring** is backend-only; frontend only displays `score` and `reasons`.

---

## 7. Seed data / test accounts (backend seeds these; frontend mocks use same values)

| Role | Email | Password |
|---|---|---|
| SITE_OWNER | `owner@vidyaasana.test` | `Owner@1234` |
| LIBRARY_ADMIN (approved lib) | `admin@vidyaasana.test` | `Admin@1234` |
| LIBRARY_ADMIN (pending lib) | `pending@vidyaasana.test` | `Admin@1234` |
| USER | `student@vidyaasana.test` | `Student@1234` |
| USER | `student2@vidyaasana.test` | `Student@1234` |

Seeded approved library: "Central Study Hub", Bengaluru (12.9716, 77.5946), 2 floors, 4 slots (MORNING 06:00–12:00, AFTERNOON 12:00–17:00, EVENING 17:00–21:00, NIGHT 21:00–23:59), all 4 seat types, a few seats pre-booked for today.
