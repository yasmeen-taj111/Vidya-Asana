import { http, HttpResponse } from 'msw';
import {
  mockUsers,
  mockLibraries,
  mockSlots,
  mockFloorGrids,
  mockBookings,
  mockWaitlist,
  mockNotifications,
  mockUserPreferences,
  mockStudyReport,
  mockLeaderboardEntries,
  createDefaultFloorGrid,
} from './db';
import { useUiStore } from '../store/uiStore';
import { SeatSuggestion, Booking, TimeSlot, Seat, WaitlistEntry } from '../api/types';

const BASE = 'http://localhost:4000/api/v1';

export const handlers = [
  // 4.1 Auth
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string };
    const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        user,
        accessToken: `mock-token-${user.id}-${Date.now()}`,
      },
    });
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string; phone?: string };
    const existing = mockUsers.find((u) => u.email.toLowerCase() === body.email.toLowerCase());
    if (existing) {
      return HttpResponse.json(
        { success: false, error: { code: 'EMAIL_TAKEN', message: 'Email address already in use' } },
        { status: 409 }
      );
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name: body.name,
      email: body.email,
      role: 'USER' as const,
      phone: body.phone,
      createdAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);

    return HttpResponse.json({
      success: true,
      data: {
        user: newUser,
        accessToken: `mock-token-${newUser.id}`,
      },
    });
  }),

  http.post(`${BASE}/auth/register-library`, async ({ request }) => {
    const body = (await request.json()) as {
      admin: { name: string; email: string; phone?: string };
      library: {
        name: string;
        description?: string;
        address: string;
        city: string;
        latitude: number;
        longitude: number;
        contactEmail: string;
        contactPhone?: string;
        amenities: {
          lockers: boolean;
          cctv: boolean;
          ac: boolean;
          wifi: boolean;
          powerOutlets: boolean;
        };
        isFree: boolean;
      };
    };

    const libId = `lib-${Date.now()}`;
    const newAdmin = {
      id: `usr-${Date.now()}`,
      name: body.admin.name,
      email: body.admin.email,
      role: 'LIBRARY_ADMIN' as const,
      phone: body.admin.phone,
      libraryId: libId,
      createdAt: new Date().toISOString(),
    };
    mockUsers.push(newAdmin);

    const newLib = {
      id: libId,
      ...body.library,
      status: 'PENDING' as const,
      seatCounts: { INDIVIDUAL: 20, GROUP: 4, ACCESSIBLE: 2, COMPUTER: 6 },
      totalSeats: 32,
      floorCount: 1,
      createdAt: new Date().toISOString(),
    };
    mockLibraries.push(newLib);

    return HttpResponse.json({
      success: true,
      data: {
        user: newAdmin,
        accessToken: `mock-token-${newAdmin.id}`,
        library: newLib,
      },
    });
  }),

  http.post(`${BASE}/auth/refresh`, () => {
    return HttpResponse.json({
      success: true,
      data: { accessToken: `mock-refreshed-token-${Date.now()}` },
    });
  }),

  http.post(`${BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.get(`${BASE}/auth/me`, () => {
    return HttpResponse.json({ success: true, data: { user: mockUsers[3] } });
  }),

  // 4.2 Site Owner
  http.get(`${BASE}/owner/libraries`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q');

    let filtered = [...mockLibraries];
    if (status) filtered = filtered.filter((l) => l.status === status);
    if (q) {
      const qLower = q.toLowerCase();
      filtered = filtered.filter(
        (l) => l.name.toLowerCase().includes(qLower) || l.city.toLowerCase().includes(qLower)
      );
    }

    return HttpResponse.json({
      success: true,
      data: filtered,
      meta: { page: 1, pageSize: 20, total: filtered.length, totalPages: 1 },
    });
  }),

  http.get(`${BASE}/owner/libraries/:id`, ({ params }) => {
    const lib = mockLibraries.find((l) => l.id === params.id);
    if (!lib) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Library not found' } }, { status: 404 });
    const admin = mockUsers.find((u) => u.libraryId === lib.id) || mockUsers[1];
    return HttpResponse.json({ success: true, data: { library: lib, admin } });
  }),

  http.post(`${BASE}/owner/libraries/:id/approve`, ({ params }) => {
    const lib = mockLibraries.find((l) => l.id === params.id);
    if (!lib) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Library not found' } }, { status: 404 });
    lib.status = 'APPROVED';
    return HttpResponse.json({ success: true, data: lib });
  }),

  http.post(`${BASE}/owner/libraries/:id/reject`, async ({ params, request }) => {
    const { reason } = (await request.json()) as { reason: string };
    const lib = mockLibraries.find((l) => l.id === params.id);
    if (!lib) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Library not found' } }, { status: 404 });
    lib.status = 'REJECTED';
    lib.rejectionReason = reason;
    return HttpResponse.json({ success: true, data: lib });
  }),

  http.get(`${BASE}/owner/stats`, () => {
    const totalLibraries = mockLibraries.length;
    const pending = mockLibraries.filter((l) => l.status === 'PENDING').length;
    const approved = mockLibraries.filter((l) => l.status === 'APPROVED').length;
    const rejected = mockLibraries.filter((l) => l.status === 'REJECTED').length;
    return HttpResponse.json({
      success: true,
      data: {
        totalLibraries,
        pending,
        approved,
        rejected,
        totalUsers: 142,
        totalBookings: 840,
      },
    });
  }),

  // 4.3 Library Admin
  http.get(`${BASE}/admin/library`, () => {
    return HttpResponse.json({ success: true, data: mockLibraries[0] });
  }),

  http.put(`${BASE}/admin/library`, async ({ request }) => {
    const data = (await request.json()) as Partial<typeof mockLibraries[0]>;
    Object.assign(mockLibraries[0], data);
    return HttpResponse.json({ success: true, data: mockLibraries[0] });
  }),

  http.post(`${BASE}/admin/library/grid/generate`, async ({ request }) => {
    const { floors } = (await request.json()) as {
      floors: Array<{ floorNumber: number; label: string; rows: number; cols: number; counts: Record<string, number> }>;
    };

    const result: typeof mockFloorGrids[string][] = [];
    floors.forEach((f) => {
      const flId = `fl-${f.floorNumber}`;
      const grid = createDefaultFloorGrid(flId, f.floorNumber, f.label, f.rows, f.cols);
      mockFloorGrids[flId] = grid;
      result.push(grid);
    });

    return HttpResponse.json({ success: true, data: result });
  }),

  http.post(`${BASE}/admin/floors`, async ({ request }) => {
    const data = await request.json() as any;
    const floorId = `fl-temp-${Date.now()}`;
    const newFloor = createDefaultFloorGrid(floorId, data.floorNumber, data.label, data.rows, data.cols);
    mockFloorGrids[floorId] = newFloor;
    return HttpResponse.json({ success: true, data: { id: floorId, ...data } });
  }),

  http.get(`${BASE}/admin/floors`, () => {
    const floors = Object.values(mockFloorGrids).map((g) => ({
      id: g.floorId,
      floorNumber: g.floorNumber,
      label: g.label,
      rows: g.rows,
      cols: g.cols,
    }));
    return HttpResponse.json({ success: true, data: floors });
  }),

  http.get(`${BASE}/admin/floors/:floorId/grid`, ({ params }) => {
    const grid = mockFloorGrids[params.floorId as string];
    if (!grid) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: grid });
  }),

  http.put(`${BASE}/admin/floors/:floorId/layout`, async ({ params, request }) => {
    const body = (await request.json()) as { rows: number; cols: number; cells: any[] };
    const floorId = params.floorId as string;
    const existing = mockFloorGrids[floorId];
    if (!existing) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor not found' } }, { status: 404 });

    existing.rows = body.rows;
    existing.cols = body.cols;
    existing.cells = body.cells;

    return HttpResponse.json({ success: true, data: existing });
  }),

  http.patch(`${BASE}/admin/seats/:seatId`, async ({ params, request }) => {
    const patch = (await request.json()) as Partial<Seat>;
    let foundSeat: Seat | null = null;
    Object.values(mockFloorGrids).forEach((grid) => {
      const cell = grid.cells.find((c) => c.seat?.id === params.seatId);
      if (cell && cell.seat) {
        Object.assign(cell.seat, patch);
        foundSeat = cell.seat;
      }
    });

    if (!foundSeat) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seat not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: foundSeat });
  }),

  http.get(`${BASE}/admin/slots`, () => {
    return HttpResponse.json({ success: true, data: mockSlots });
  }),

  http.post(`${BASE}/admin/slots`, async ({ request }) => {
    const body = (await request.json()) as Partial<TimeSlot>;
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      libraryId: 'lib-1',
      name: body.name || 'MORNING',
      startTime: body.startTime || '08:00',
      endTime: body.endTime || '12:00',
      isFree: body.isFree || false,
      pricePaise: body.pricePaise || 0,
      isActive: true,
    };
    mockSlots.push(newSlot);
    return HttpResponse.json({ success: true, data: newSlot });
  }),

  http.put(`${BASE}/admin/slots/:slotId`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<TimeSlot>;
    const slot = mockSlots.find((s) => s.id === params.slotId);
    if (!slot) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Slot not found' } }, { status: 404 });
    Object.assign(slot, body);
    return HttpResponse.json({ success: true, data: slot });
  }),

  http.delete(`${BASE}/admin/slots/:slotId`, ({ params }) => {
    const idx = mockSlots.findIndex((s) => s.id === params.slotId);
    if (idx !== -1) mockSlots.splice(idx, 1);
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.get(`${BASE}/admin/bookings`, ({ request }) => {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const slotId = url.searchParams.get('slotId');
    const status = url.searchParams.get('status');

    let result = [...mockBookings];
    if (date) result = result.filter((b) => b.date === date);
    if (slotId) result = result.filter((b) => b.slot.id === slotId);
    if (status) result = result.filter((b) => b.status === status);

    return HttpResponse.json({
      success: true,
      data: result,
      meta: { page: 1, pageSize: 20, total: result.length, totalPages: 1 },
    });
  }),

  http.post(`${BASE}/admin/checkin/scan`, async ({ request }) => {
    const { qrToken } = (await request.json()) as { qrToken: string };
    // token format test: "qr-bk-101" or real token
    const booking = mockBookings.find((b) => qrToken.includes(b.id) || qrToken.includes(b.code)) || mockBookings[0];
    if (!booking) {
      return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });
    }

    if (booking.status === 'CHECKED_IN') {
      return HttpResponse.json({
        success: true,
        data: { booking, result: 'ALREADY_CHECKED_IN' },
      });
    }

    booking.status = 'CHECKED_IN';
    booking.checkedInAt = new Date().toISOString();
    return HttpResponse.json({
      success: true,
      data: { booking, result: 'CHECKED_IN' },
    });
  }),

  http.post(`${BASE}/admin/bookings/walk-in`, async ({ request }) => {
    const body = (await request.json()) as { seatId: string; slotId: string; date: string; guestName?: string };
    const slot = mockSlots.find((s) => s.id === body.slotId) || mockSlots[0];
    let seat: Seat | null = null;
    let floorLabel = 'Floor 1';

    Object.values(mockFloorGrids).forEach((grid) => {
      const cell = grid.cells.find((c) => c.seat?.id === body.seatId);
      if (cell && cell.seat) {
        seat = cell.seat;
        floorLabel = grid.label;
      }
    });

    if (!seat) {
      return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seat not found' } }, { status: 404 });
    }

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      code: `VA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      libraryId: 'lib-1',
      libraryName: 'Central Study Hub',
      seat,
      floorLabel,
      slot,
      date: body.date,
      status: 'CHECKED_IN',
      source: 'WALK_IN',
      guestName: body.guestName || 'Walk-in Guest',
      pricePaise: slot.pricePaise,
      paymentStatus: slot.isFree ? 'FREE' : 'PAID',
      graceUntil: `${body.date}T${slot.startTime}:00.000Z`,
      arrivalConfirmed: true,
      checkedInAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockBookings.push(newBooking);
    return HttpResponse.json({ success: true, data: newBooking });
  }),

  http.post(`${BASE}/admin/bookings/:id/release`, ({ params }) => {
    const bk = mockBookings.find((b) => b.id === params.id);
    if (!bk) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });
    bk.status = 'COMPLETED';
    return HttpResponse.json({ success: true, data: bk });
  }),

  http.get(`${BASE}/admin/analytics/summary`, () => {
    const totalSeats = 32;
    const bookedSeats = mockBookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN').length;
    const availableSeats = totalSeats - bookedSeats;
    const bookedPercent = Math.round((bookedSeats / totalSeats) * 100);
    const notBookedPercent = 100 - bookedPercent;

    return HttpResponse.json({
      success: true,
      data: {
        totalSeats,
        bookedSeats,
        availableSeats,
        bookedPercent,
        notBookedPercent,
        checkedIn: mockBookings.filter((b) => b.status === 'CHECKED_IN').length,
        noShows: 1,
        walkIns: mockBookings.filter((b) => b.source === 'WALK_IN').length,
        revenuePaise: 45000, // ₹450
      },
    });
  }),

  http.get(`${BASE}/admin/analytics/timeseries`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        points: [
          { label: '06:00 - 12:00 (Morning)', booked: 22, capacity: 32, percent: 68 },
          { label: '12:00 - 17:00 (Afternoon)', booked: 28, capacity: 32, percent: 87 },
          { label: '17:00 - 21:00 (Evening)', booked: 26, capacity: 32, percent: 81 },
          { label: '21:00 - 23:59 (Night)', booked: 14, capacity: 32, percent: 43 },
        ],
      },
    });
  }),

  http.get(`${BASE}/admin/reports/export`, () => {
    const csvContent = 'Booking ID,Seat,Slot,Date,Status,User,Amount (Rs)\nVA-8F3K2,F1-A1,Morning,2026-10-10,CONFIRMED,Aarav Patel,50.00\nVA-9K2L1,F1-A2,Morning,2026-10-10,CHECKED_IN,Priya Nair,50.00\n';
    return new HttpResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="vidya-asana-report.csv"',
      },
    });
  }),

  // 4.4 Discovery
  http.get(`${BASE}/libraries`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const isFree = url.searchParams.get('isFree');
    const seatType = url.searchParams.get('seatType');

    let approved = mockLibraries.filter((l) => l.status === 'APPROVED');
    if (q) {
      approved = approved.filter(
        (l) => l.name.toLowerCase().includes(q.toLowerCase()) || l.city.toLowerCase().includes(q.toLowerCase())
      );
    }
    if (isFree === 'true') {
      approved = approved.filter((l) => l.isFree);
    }
    if (seatType) {
      approved = approved.filter((l) => (l.seatCounts as any)[seatType] > 0);
    }

    return HttpResponse.json({
      success: true,
      data: approved,
      meta: { page: 1, pageSize: 20, total: approved.length, totalPages: 1 },
    });
  }),

  http.get(`${BASE}/recommendations/libraries`, () => {
    const scored = mockLibraries
      .filter((l) => l.status === 'APPROVED')
      .map((l) => ({ ...l, matchScore: l.id === 'lib-1' ? 96 : 88 }));
    return HttpResponse.json({ success: true, data: scored });
  }),

  http.get(`${BASE}/libraries/:id`, ({ params }) => {
    const lib = mockLibraries.find((l) => l.id === params.id);
    if (!lib) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Library not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: lib });
  }),

  http.get(`${BASE}/libraries/:id/slots`, () => {
    return HttpResponse.json({ success: true, data: mockSlots });
  }),

  http.get(`${BASE}/libraries/:id/floors`, () => {
    const floors = Object.values(mockFloorGrids).map((g) => ({
      id: g.floorId,
      floorNumber: g.floorNumber,
      label: g.label,
      rows: g.rows,
      cols: g.cols,
    }));
    return HttpResponse.json({ success: true, data: floors });
  }),

  http.get(`${BASE}/libraries/:id/floors/:floorId/grid`, ({ params, request }) => {
    const grid = mockFloorGrids[params.floorId as string];
    if (!grid) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor not found' } }, { status: 404 });

    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const slotId = url.searchParams.get('slotId');

    // Clone grid and compute status
    const clonedGrid = JSON.parse(JSON.stringify(grid));
    if (date && slotId) {
      clonedGrid.cells.forEach((cell: any) => {
        if (cell.type === 'SEAT' && cell.seat) {
          const booked = mockBookings.find(
            (b) =>
              b.seat.id === cell.seat.id &&
              b.date === date &&
              b.slot.id === slotId &&
              (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
          );
          if (booked) {
            cell.status = booked.userId === 'usr-4' ? 'YOURS' : 'BOOKED';
          } else {
            cell.status = 'AVAILABLE';
          }
        }
      });
    }

    return HttpResponse.json({ success: true, data: clonedGrid });
  }),

  http.post(`${BASE}/libraries/:id/suggest-seats`, async ({ request }) => {
    const body = (await request.json()) as any;
    const suggestions: SeatSuggestion[] = [
      {
        seat: mockFloorGrids['fl-1'].cells.find((c) => c.seat?.label === 'F1-A3')!.seat!,
        floorLabel: 'Floor 1 - Main Hall',
        score: 95,
        reasons: ['Quiet window desk', 'Near power outlet', 'Ergonomic high-back chair'],
      },
      {
        seat: mockFloorGrids['fl-1'].cells.find((c) => c.seat?.label === 'F1-B1')!.seat!,
        floorLabel: 'Floor 1 - Main Hall',
        score: 88,
        reasons: ['Direct natural sunlight', 'Dedicated electrical socket'],
      },
      {
        seat: mockFloorGrids['fl-2'].cells.find((c) => c.seat?.label === 'F2-A1')!.seat!,
        floorLabel: 'Floor 2 - Silent Research Zone',
        score: 85,
        reasons: ['Silent study zone', 'High-speed LAN port'],
      },
    ];

    return HttpResponse.json({ success: true, data: { suggestions } });
  }),

  // 4.5 Bookings
  http.post(`${BASE}/bookings`, async ({ request }) => {
    const { alwaysFailNext } = useUiStore.getState();
    const body = (await request.json()) as { libraryId: string; seatId: string; slotId: string; date: string };

    // Simulate conflict demo if alwaysFailNext toggle is on
    if (alwaysFailNext) {
      useUiStore.getState().setAlwaysFailNext(false); // Reset after trigger
      const alternativeSeat = mockFloorGrids['fl-1'].cells.find((c) => c.seat && c.seat.id !== body.seatId)?.seat!;
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'SEAT_UNAVAILABLE',
            message: 'That seat was just taken by another student.',
            details: {
              alternatives: [
                {
                  seat: alternativeSeat,
                  floorLabel: 'Floor 1 - Main Hall',
                  score: 92,
                  reasons: ['Next adjacent desk', 'Similar quiet zone position'],
                },
              ],
            },
          },
        },
        { status: 409 }
      );
    }

    // Check if already booked
    const existing = mockBookings.find(
      (b) =>
        b.seat.id === body.seatId &&
        b.slot.id === body.slotId &&
        b.date === body.date &&
        (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );

    if (existing) {
      const alternativeSeat = mockFloorGrids['fl-1'].cells.find((c) => c.seat && c.seat.id !== body.seatId)?.seat!;
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'SEAT_UNAVAILABLE',
            message: 'This seat is already booked for this slot.',
            details: {
              alternatives: [
                {
                  seat: alternativeSeat,
                  floorLabel: 'Floor 1 - Main Hall',
                  score: 90,
                  reasons: ['Nearby available seat', 'Equal amenities'],
                },
              ],
            },
          },
        },
        { status: 409 }
      );
    }

    const slot = mockSlots.find((s) => s.id === body.slotId) || mockSlots[0];
    let seat: Seat | null = null;
    let floorLabel = 'Floor 1 - Main Hall';

    Object.values(mockFloorGrids).forEach((grid) => {
      const cell = grid.cells.find((c) => c.seat?.id === body.seatId);
      if (cell && cell.seat) {
        seat = cell.seat;
        floorLabel = grid.label;
      }
    });

    if (!seat) {
      return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seat not found' } }, { status: 404 });
    }

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      code: `VA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      libraryId: body.libraryId,
      libraryName: 'Central Study Hub',
      seat,
      floorLabel,
      slot,
      date: body.date,
      status: 'CONFIRMED',
      source: 'ONLINE',
      userId: 'usr-4',
      pricePaise: slot.pricePaise,
      paymentStatus: slot.isFree ? 'FREE' : 'PAID',
      graceUntil: `${body.date}T${slot.startTime}:00.000Z`,
      arrivalConfirmed: false,
      createdAt: new Date().toISOString(),
    };

    mockBookings.push(newBooking);

    return HttpResponse.json({ success: true, data: newBooking });
  }),

  http.get(`${BASE}/bookings/me`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const upcoming = url.searchParams.get('upcoming');

    let userBookings = mockBookings.filter((b) => b.userId === 'usr-4');
    if (status) userBookings = userBookings.filter((b) => b.status === status);
    if (upcoming === 'true') {
      userBookings = userBookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN');
    }

    return HttpResponse.json({
      success: true,
      data: userBookings,
      meta: { page: 1, pageSize: 20, total: userBookings.length, totalPages: 1 },
    });
  }),

  http.get(`${BASE}/bookings/:id`, ({ params }) => {
    const bk = mockBookings.find((b) => b.id === params.id);
    if (!bk) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: bk });
  }),

  http.get(`${BASE}/bookings/:id/qr`, ({ params }) => {
    const bk = mockBookings.find((b) => b.id === params.id) || mockBookings[0];
    const qrToken = `qr-va-${bk.id}-${bk.libraryId}-${Date.now()}`;
    return HttpResponse.json({
      success: true,
      data: {
        qrToken,
        qrDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><rect x="20" y="20" width="60" height="60" fill="black"/><rect x="120" y="20" width="60" height="60" fill="black"/><rect x="20" y="120" width="60" height="60" fill="black"/><rect x="100" y="100" width="40" height="40" fill="black"/></svg>',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
  }),

  http.post(`${BASE}/bookings/:id/cancel`, ({ params }) => {
    const bk = mockBookings.find((b) => b.id === params.id);
    if (!bk) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });
    bk.status = 'CANCELLED';
    bk.cancelledAt = new Date().toISOString();
    return HttpResponse.json({ success: true, data: bk });
  }),

  http.post(`${BASE}/bookings/:id/confirm-arrival`, async ({ params, request }) => {
    const { coming } = (await request.json()) as { coming: boolean };
    const bk = mockBookings.find((b) => b.id === params.id);
    if (!bk) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });

    if (!coming) {
      bk.status = 'CANCELLED';
      bk.cancelledAt = new Date().toISOString();
      return HttpResponse.json({ success: true, data: bk });
    }

    if (bk.arrivalConfirmed) {
      return HttpResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Grace extension already utilized once.' } },
        { status: 409 }
      );
    }

    bk.arrivalConfirmed = true;
    bk.graceUntil = new Date(new Date(bk.graceUntil).getTime() + 30 * 60 * 1000).toISOString();
    return HttpResponse.json({ success: true, data: bk });
  }),

  // 4.6 Waitlist
  http.post(`${BASE}/waitlist`, async ({ request }) => {
    const body = (await request.json()) as { seatId: string; slotId: string; date: string };
    const slot = mockSlots.find((s) => s.id === body.slotId) || mockSlots[0];
    const seat = mockFloorGrids['fl-1'].cells.find((c) => c.seat?.id === body.seatId)?.seat || mockFloorGrids['fl-1'].cells[0].seat!;

    const newWait: WaitlistEntry = {
      id: `wt-${Date.now()}`,
      seat,
      libraryId: 'lib-1',
      libraryName: 'Central Study Hub',
      slot,
      date: body.date,
      status: 'WAITING',
      position: 1,
      createdAt: new Date().toISOString(),
    };
    mockWaitlist.push(newWait);
    return HttpResponse.json({ success: true, data: newWait });
  }),

  http.get(`${BASE}/waitlist/me`, () => {
    return HttpResponse.json({ success: true, data: mockWaitlist });
  }),

  http.delete(`${BASE}/waitlist/:id`, ({ params }) => {
    const idx = mockWaitlist.findIndex((w) => w.id === params.id);
    if (idx !== -1) mockWaitlist.splice(idx, 1);
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.post(`${BASE}/waitlist/:id/claim`, ({ params }) => {
    const item = mockWaitlist.find((w) => w.id === params.id);
    if (!item) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Waitlist entry not found' } }, { status: 404 });
    item.status = 'CLAIMED';

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      code: `VA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      libraryId: item.libraryId,
      libraryName: item.libraryName,
      seat: item.seat,
      floorLabel: 'Floor 1 - Main Hall',
      slot: item.slot,
      date: item.date,
      status: 'CONFIRMED',
      source: 'ONLINE',
      userId: 'usr-4',
      pricePaise: item.slot.pricePaise,
      paymentStatus: item.slot.isFree ? 'FREE' : 'PAID',
      graceUntil: `${item.date}T${item.slot.startTime}:00.000Z`,
      arrivalConfirmed: false,
      createdAt: new Date().toISOString(),
    };

    mockBookings.push(newBooking);
    return HttpResponse.json({ success: true, data: newBooking });
  }),

  // 4.7 User Dashboard, Study, Leaderboard
  http.get(`${BASE}/users/me/dashboard`, () => {
    const upcoming = mockBookings.find((b) => b.userId === 'usr-4' && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN'));
    const preferredSeat = mockFloorGrids['fl-1'].cells.find((c) => c.seat?.label === 'F1-A1')?.seat;

    return HttpResponse.json({
      success: true,
      data: {
        upcomingBooking: upcoming,
        preferredSeat: preferredSeat
          ? {
              seat: preferredSeat,
              libraryId: 'lib-1',
              libraryName: 'Central Study Hub',
              timesBooked: 7,
            }
          : undefined,
        stats: {
          totalBookings: 12,
          totalFocusHours: 38,
          currentStreakDays: 4,
          longestStreakDays: 9,
        },
      },
    });
  }),

  http.get(`${BASE}/users/me/preferences`, () => {
    return HttpResponse.json({ success: true, data: mockUserPreferences });
  }),

  http.put(`${BASE}/users/me/preferences`, async ({ request }) => {
    const body = (await request.json()) as any;
    Object.assign(mockUserPreferences, body);
    return HttpResponse.json({ success: true, data: mockUserPreferences });
  }),

  http.post(`${BASE}/study/sessions`, () => {
    return HttpResponse.json({ success: true, data: { id: `ss-${Date.now()}` } });
  }),

  http.get(`${BASE}/study/reports`, () => {
    return HttpResponse.json({ success: true, data: mockStudyReport });
  }),

  http.get(`${BASE}/study/leaderboard`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        entries: mockLeaderboardEntries,
        myRank: 3,
      },
    });
  }),

  // 4.8 Notifications & Chat
  http.get(`${BASE}/notifications`, () => {
    return HttpResponse.json({ success: true, data: mockNotifications });
  }),

  http.post(`${BASE}/notifications/:id/read`, ({ params }) => {
    const n = mockNotifications.find((x) => x.id === params.id);
    if (n) n.isRead = true;
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.post(`${BASE}/notifications/read-all`, () => {
    mockNotifications.forEach((n) => (n.isRead = true));
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.post(`${BASE}/chat`, async ({ request }) => {
    const { message } = (await request.json()) as { message: string };
    const q = message.toLowerCase();

    let reply = "Hello! I'm Vidya Bot, your AI study assistant. How can I assist you with your library seats or study sessions today?";
    const suggestedActions: any[] = [];

    if (q.includes('book') || q.includes('seat')) {
      reply = "Central Study Hub currently has available morning and afternoon desks on Floor 1. Would you like to check the interactive seating layout?";
      suggestedActions.push({
        label: 'View Central Study Hub',
        type: 'NAVIGATE',
        payload: { path: '/app/libraries/lib-1/book' },
      });
    } else if (q.includes('timer') || q.includes('focus') || q.includes('pomodoro')) {
      reply = "Our integrated Pomodoro and stopwatch study tools are ready! You can track your daily streaks and earn leaderboard rankings.";
      suggestedActions.push({
        label: 'Open Study Timer',
        type: 'NAVIGATE',
        payload: { path: '/app/study' },
      });
    } else if (q.includes('qr') || q.includes('checkin') || q.includes('check in')) {
      reply = "You can view your active entry QR code right from your dashboard or under 'My Bookings'. Present it to the admin desk upon arrival!";
      suggestedActions.push({
        label: 'My Bookings',
        type: 'NAVIGATE',
        payload: { path: '/app/bookings' },
      });
    }

    return HttpResponse.json({
      success: true,
      data: {
        conversationId: `conv-${Date.now()}`,
        reply,
        suggestedActions,
      },
    });
  }),
];
