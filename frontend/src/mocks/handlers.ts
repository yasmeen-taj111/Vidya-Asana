import { http, HttpResponse } from 'msw';
import {
  mockLibraries,
  mockSlots,
  mockFloorGrids,
  createDefaultFloorGrid,
} from './db';
import {
  resolveCurrentUser,
  findStoredUserByEmail,
  saveStoredUser,
  getStoredUsers,
  getStoredBookings,
  saveStoredBooking,
  getUserBookings,
  updateStoredBooking,
  getUserNotifications,
  addStoredNotification,
  markStoredNotificationRead,
  markAllStoredNotificationsRead,
  getUserWaitlist,
  getStoredWaitlist,
  addStoredWaitlistEntry,
  removeStoredWaitlistEntry,
  updateStoredWaitlistEntry,
  getUserPreferences,
  saveUserPreferences,
  addStoredStudySession,
  getUserStudyReport,
  getUserDashboard,
  getStoredLeaderboard,
  getStoredLibraries,
  saveStoredLibrary,
  updateStoredLibrary,
  findStoredLibraryById,
  getLibraryForAdmin,
  getStoredFloorsForLibrary,
  saveStoredFloorsForLibrary,
  saveStoredFloorForLibrary,
  getStoredSlotsForLibrary,
  saveStoredSlotsForLibrary,
  addStoredSlotForLibrary,
  updateStoredSlotForLibrary,
  deleteStoredSlotForLibrary,
  getStoredBookingsForLibrary,
  getStoredAnalyticsForLibrary,
  checkBookingRateLimit,
} from './storage';
import { useUiStore } from '../store/uiStore';
import { SeatSuggestion, Booking, TimeSlot, Seat, WaitlistEntry, FloorGrid, Library, GridCell } from '../api/types';
import { generateChatResponse } from '../chat/chatEngine';
import { mockSocketInstance } from '../realtime/socket';

const BASE = '*/api/v1';

export const handlers = [
  // 4.1 Auth
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string; password: string };
    const user = findStoredUserByEmail(email);

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
    const existing = findStoredUserByEmail(body.email);
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
    saveStoredUser(newUser);

    // Initial welcome notification for new student account
    addStoredNotification(newUser.id, {
      id: `notif-${Date.now()}`,
      title: 'Welcome to Vidya Asana! 🎓',
      body: 'Your account is ready. Discover quiet libraries, book ergonomic desks, and track focus streaks.',
      type: 'SYSTEM',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return HttpResponse.json({
      success: true,
      data: {
        user: newUser,
        accessToken: `mock-token-${newUser.id}-${Date.now()}`,
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

    const existingUser = findStoredUserByEmail(body.admin.email);
    if (existingUser) {
      if (existingUser.role === 'LIBRARY_ADMIN') {
        let existingLib = existingUser.libraryId ? findStoredLibraryById(existingUser.libraryId) : undefined;
        if (!existingLib) {
          const allLibs = getStoredLibraries();
          existingLib = allLibs.find((l) => l.contactEmail?.toLowerCase() === body.admin.email.toLowerCase());
        }
        return HttpResponse.json({
          success: true,
          data: {
            user: existingUser,
            accessToken: `mock-token-${existingUser.id}-${Date.now()}`,
            library: existingLib,
          },
        });
      }
      return HttpResponse.json(
        { success: false, error: { code: 'EMAIL_TAKEN', message: 'An account with this email address already exists as a student. Please sign in or use another email.' } },
        { status: 409 }
      );
    }

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
    saveStoredUser(newAdmin);

    const newLib = {
      id: libId,
      ...body.library,
      status: 'PENDING' as const,
      seatCounts: { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 },
      totalSeats: 0,
      floorCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveStoredLibrary(newLib);

    // Initialize fresh empty floors and slots for the new library
    saveStoredFloorsForLibrary(libId, {});
    saveStoredSlotsForLibrary(libId, []);

    // Welcome notification for the newly registered library admin
    addStoredNotification(newAdmin.id, {
      id: `notif-${Date.now()}`,
      title: 'Library Registration Submitted! 🏛️',
      body: `Your application for "${newLib.name}" is pending platform owner verification. Once approved, you can build your floor layouts and accept bookings.`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return HttpResponse.json({
      success: true,
      data: {
        user: newAdmin,
        accessToken: `mock-token-${newAdmin.id}-${Date.now()}`,
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

  http.get(`${BASE}/auth/me`, ({ request }) => {
    const user = resolveCurrentUser(request) || getStoredUsers().find((u) => u.id === 'usr-4') || getStoredUsers()[0];
    return HttpResponse.json({ success: true, data: { user } });
  }),

  // 4.2 Site Owner
  http.get(`${BASE}/owner/libraries`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q');

    const libraries = getStoredLibraries();
    let filtered = [...libraries];
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
    const lib = findStoredLibraryById(params.id as string);
    if (!lib) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Library not found' } }, { status: 404 });
    const allUsers = getStoredUsers();
    const admin = allUsers.find((u) => u.libraryId === lib.id) || allUsers[1];
    return HttpResponse.json({ success: true, data: { library: lib, admin } });
  }),

  http.post(`${BASE}/owner/libraries/:id/approve`, ({ params }) => {
    const lib = updateStoredLibrary(params.id as string, { status: 'APPROVED' });
    if (!lib) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Library not found' } }, { status: 404 });

    const admin = getStoredUsers().find((u) => u.libraryId === lib.id);
    if (admin) {
      addStoredNotification(admin.id, {
        id: `notif-${Date.now()}`,
        title: 'Library Listing Approved! 🎉',
        body: `Congratulations! ${lib.name} has been approved by the platform owner. You can now configure your floor layouts, add time slots, and accept bookings.`,
        type: 'SYSTEM',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return HttpResponse.json({ success: true, data: lib });
  }),

  http.post(`${BASE}/owner/libraries/:id/reject`, async ({ params, request }) => {
    const { reason } = (await request.json()) as { reason: string };
    const lib = updateStoredLibrary(params.id as string, { status: 'REJECTED', rejectionReason: reason });
    if (!lib) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Library not found' } }, { status: 404 });

    const admin = getStoredUsers().find((u) => u.libraryId === lib.id);
    if (admin) {
      addStoredNotification(admin.id, {
        id: `notif-${Date.now()}`,
        title: 'Library Application Update',
        body: `Your library application was not approved. Reason: ${reason}`,
        type: 'SYSTEM',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return HttpResponse.json({ success: true, data: lib });
  }),

  http.get(`${BASE}/owner/stats`, () => {
    const libraries = getStoredLibraries();
    const totalLibraries = libraries.length;
    const pending = libraries.filter((l) => l.status === 'PENDING').length;
    const approved = libraries.filter((l) => l.status === 'APPROVED').length;
    const rejected = libraries.filter((l) => l.status === 'REJECTED').length;
    const allUsers = getStoredUsers();
    const allBookings = getStoredBookings();
    return HttpResponse.json({
      success: true,
      data: {
        totalLibraries,
        pending,
        approved,
        rejected,
        totalUsers: allUsers.length,
        totalBookings: allBookings.length,
      },
    });
  }),

  // 4.3 Library Admin
  http.get(`${BASE}/admin/library`, ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    return HttpResponse.json({ success: true, data: lib });
  }),

  http.put(`${BASE}/admin/library`, async ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const data = (await request.json()) as Partial<Library>;
    const updated = updateStoredLibrary(lib.id, data) || Object.assign(lib, data);
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.post(`${BASE}/admin/library/grid/generate`, async ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const { floors } = (await request.json()) as {
      floors: Array<{ floorNumber: number; label: string; rows: number; cols: number; counts: Record<string, number> }>;
    };

    const floorsObj = getStoredFloorsForLibrary(lib.id);
    const result: FloorGrid[] = [];
    let totalGeneratedSeats = 0;
    const seatCounts: Record<string, number> = { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 };

    floors.forEach((f) => {
      const flId = `${lib.id}-fl-${f.floorNumber}`;
      const grid = createDefaultFloorGrid(flId, f.floorNumber, f.label, f.rows, f.cols);
      floorsObj[flId] = grid;
      result.push(grid);
      grid.cells.forEach((cell) => {
        if (cell.type === 'SEAT' && cell.seat) {
          totalGeneratedSeats++;
          if (seatCounts[cell.seat.seatType] !== undefined) {
            seatCounts[cell.seat.seatType]++;
          }
        }
      });
    });

    saveStoredFloorsForLibrary(lib.id, floorsObj);
    updateStoredLibrary(lib.id, {
      floorCount: Object.keys(floorsObj).length,
      totalSeats: totalGeneratedSeats,
      seatCounts: seatCounts as any,
    });

    return HttpResponse.json({ success: true, data: result });
  }),

  http.post(`${BASE}/admin/floors`, async ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const data = await request.json() as any;
    const floorId = `${lib.id}-fl-${data.floorNumber || Date.now()}`;
    const newFloor = createDefaultFloorGrid(floorId, Number(data.floorNumber), data.label, data.rows || 5, data.cols || 6);
    saveStoredFloorForLibrary(lib.id, newFloor);
    const floorsObj = getStoredFloorsForLibrary(lib.id);
    updateStoredLibrary(lib.id, { floorCount: Object.keys(floorsObj).length });
    return HttpResponse.json({ success: true, data: { id: floorId, ...data } });
  }),

  http.delete(`${BASE}/admin/floors/:floorId`, ({ params, request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const floorsObj = getStoredFloorsForLibrary(lib.id);
    delete floorsObj[params.floorId as string];
    saveStoredFloorsForLibrary(lib.id, floorsObj);
    const summary = getStoredAnalyticsForLibrary(lib.id);
    updateStoredLibrary(lib.id, { floorCount: Object.keys(floorsObj).length, totalSeats: summary.totalSeats });
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.get(`${BASE}/admin/floors`, ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const floorsObj = getStoredFloorsForLibrary(lib.id);
    const floors = Object.values(floorsObj).map((g) => ({
      id: g.floorId,
      floorNumber: g.floorNumber,
      label: g.label,
      rows: g.rows,
      cols: g.cols,
    }));
    return HttpResponse.json({ success: true, data: floors });
  }),

  http.get(`${BASE}/admin/floors/:floorId/grid`, ({ params, request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const floorsObj = getStoredFloorsForLibrary(lib.id);
    const grid = floorsObj[params.floorId as string];
    if (!grid) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: grid });
  }),

  http.put(`${BASE}/admin/floors/:floorId/layout`, async ({ params, request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const floorsObj = getStoredFloorsForLibrary(lib.id);
    const floorId = params.floorId as string;
    const existing = floorsObj[floorId];
    if (!existing) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor not found' } }, { status: 404 });

    const body = (await request.json()) as { rows: number; cols: number; cells: any[] };
    existing.rows = body.rows;
    existing.cols = body.cols;
    existing.cells = body.cells;
    saveStoredFloorForLibrary(lib.id, existing);

    const summary = getStoredAnalyticsForLibrary(lib.id);
    updateStoredLibrary(lib.id, { totalSeats: summary.totalSeats });

    return HttpResponse.json({ success: true, data: existing });
  }),

  http.patch(`${BASE}/admin/seats/:seatId`, async ({ params, request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const floorsObj = getStoredFloorsForLibrary(lib.id);
    const patch = (await request.json()) as Partial<Seat>;
    let foundSeat: Seat | null = null;
    Object.values(floorsObj).forEach((grid) => {
      const cell = grid.cells.find((c) => c.seat?.id === params.seatId);
      if (cell && cell.seat) {
        Object.assign(cell.seat, patch);
        foundSeat = cell.seat;
      }
    });

    if (!foundSeat) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seat not found' } }, { status: 404 });
    saveStoredFloorsForLibrary(lib.id, floorsObj);
    return HttpResponse.json({ success: true, data: foundSeat });
  }),

  http.get(`${BASE}/admin/slots`, ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const slots = getStoredSlotsForLibrary(lib.id);
    return HttpResponse.json({ success: true, data: slots });
  }),

  http.post(`${BASE}/admin/slots`, async ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const body = (await request.json()) as Partial<TimeSlot>;
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      libraryId: lib.id,
      name: body.name || 'MORNING',
      startTime: body.startTime || '08:00',
      endTime: body.endTime || '12:00',
      isFree: body.isFree || false,
      pricePaise: body.pricePaise || 0,
      isActive: true,
    };
    addStoredSlotForLibrary(lib.id, newSlot);
    return HttpResponse.json({ success: true, data: newSlot });
  }),

  http.put(`${BASE}/admin/slots/:slotId`, async ({ params, request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const body = (await request.json()) as Partial<TimeSlot>;
    const updated = updateStoredSlotForLibrary(lib.id, params.slotId as string, body);
    if (!updated) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Slot not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.delete(`${BASE}/admin/slots/:slotId`, ({ params, request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    deleteStoredSlotForLibrary(lib.id, params.slotId as string);
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.get(`${BASE}/admin/bookings`, ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const slotId = url.searchParams.get('slotId');
    const status = url.searchParams.get('status');

    let result = getStoredBookingsForLibrary(lib.id);
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
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const libBookings = getStoredBookingsForLibrary(lib.id);
    const allBookings = getStoredBookings();
    const booking = libBookings.find((b) => qrToken.includes(b.id) || qrToken.includes(b.code)) || allBookings.find((b) => qrToken.includes(b.id) || qrToken.includes(b.code));
    if (!booking) {
      return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });
    }

    if (booking.status === 'CHECKED_IN') {
      return HttpResponse.json({
        success: true,
        data: { booking, result: 'ALREADY_CHECKED_IN' },
      });
    }

    const updated = updateStoredBooking(booking.id, {
      status: 'CHECKED_IN',
      checkedInAt: new Date().toISOString(),
    }) || booking;

    return HttpResponse.json({
      success: true,
      data: { booking: updated, result: 'CHECKED_IN' },
    });
  }),

  http.post(`${BASE}/admin/bookings/walk-in`, async ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const body = (await request.json()) as { seatId: string; slotId: string; date: string; guestName?: string };
    const libSlots = getStoredSlotsForLibrary(lib.id);
    const slot = libSlots.find((s) => s.id === body.slotId) || libSlots[0] || mockSlots[0];
    let seat: Seat | null = null;
    let floorLabel = 'Floor 1';

    const floorsObj = getStoredFloorsForLibrary(lib.id);
    Object.values(floorsObj).forEach((grid) => {
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
      libraryId: lib.id,
      libraryName: lib.name,
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

    saveStoredBooking(newBooking);
    return HttpResponse.json({ success: true, data: newBooking });
  }),

  http.post(`${BASE}/admin/bookings/:id/release`, ({ params }) => {
    const updated = updateStoredBooking(params.id as string, { status: 'COMPLETED' });
    if (!updated) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.get(`${BASE}/admin/analytics/summary`, ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const summary = getStoredAnalyticsForLibrary(lib.id);
    return HttpResponse.json({
      success: true,
      data: summary,
    });
  }),

  http.get(`${BASE}/admin/analytics/timeseries`, ({ request }) => {
    const user = resolveCurrentUser(request);
    const lib = getLibraryForAdmin(user);
    const summary = getStoredAnalyticsForLibrary(lib.id);
    const cap = summary.totalSeats;
    return HttpResponse.json({
      success: true,
      data: {
        points: cap > 0 ? [
          { label: '06:00 - 12:00 (Morning)', booked: Math.round(cap * 0.4), capacity: cap, percent: 40 },
          { label: '12:00 - 17:00 (Afternoon)', booked: Math.round(cap * 0.6), capacity: cap, percent: 60 },
          { label: '17:00 - 21:00 (Evening)', booked: Math.round(cap * 0.5), capacity: cap, percent: 50 },
          { label: '21:00 - 23:59 (Night)', booked: Math.round(cap * 0.2), capacity: cap, percent: 20 },
        ] : [
          { label: '06:00 - 12:00 (Morning)', booked: 0, capacity: 0, percent: 0 },
          { label: '12:00 - 17:00 (Afternoon)', booked: 0, capacity: 0, percent: 0 },
          { label: '17:00 - 21:00 (Evening)', booked: 0, capacity: 0, percent: 0 },
          { label: '21:00 - 23:59 (Night)', booked: 0, capacity: 0, percent: 0 },
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

    const libraries = getStoredLibraries();
    let approved = libraries.filter((l) => l.status === 'APPROVED');
    if (q) {
      approved = approved.filter(
        (l) => l.name.toLowerCase().includes(q.toLowerCase()) || l.city.toLowerCase().includes(q.toLowerCase())
      );
    }
    if (isFree === 'true') {
      approved = approved.filter((l) => l.isFree);
    }
    if (seatType) {
      approved = approved.filter((l) => ((l.seatCounts as any) || {})[seatType] > 0);
    }

    return HttpResponse.json({
      success: true,
      data: approved,
      meta: { page: 1, pageSize: 20, total: approved.length, totalPages: 1 },
    });
  }),

  http.get(`${BASE}/recommendations/libraries`, () => {
    const libraries = getStoredLibraries();
    const scored = libraries
      .filter((l) => l.status === 'APPROVED')
      .map((l) => ({ ...l, matchScore: l.id === 'lib-1' ? 96 : 88 }));
    return HttpResponse.json({ success: true, data: scored });
  }),

  http.get(`${BASE}/libraries/:id`, ({ params }) => {
    const lib = findStoredLibraryById(params.id as string);
    if (!lib) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Library not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: lib });
  }),

  http.get(`${BASE}/libraries/:id/slots`, ({ params }) => {
    const slots = getStoredSlotsForLibrary(params.id as string);
    return HttpResponse.json({ success: true, data: slots });
  }),

  http.get(`${BASE}/libraries/:id/floors`, ({ params }) => {
    const floorsObj = getStoredFloorsForLibrary(params.id as string);
    const floors = Object.values(floorsObj).map((g) => ({
      id: g.floorId,
      floorNumber: g.floorNumber,
      label: g.label,
      rows: g.rows,
      cols: g.cols,
    }));
    return HttpResponse.json({ success: true, data: floors });
  }),

  http.get(`${BASE}/libraries/:id/floors/:floorId/grid`, ({ params, request }) => {
    const floorsObj = getStoredFloorsForLibrary(params.id as string);
    const grid = floorsObj[params.floorId as string];
    if (!grid) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Floor not found' } }, { status: 404 });

    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const slotId = url.searchParams.get('slotId');
    const currentUser = resolveCurrentUser(request);
    const allBookings = getStoredBookings();

    // Clone grid and compute status
    const clonedGrid = JSON.parse(JSON.stringify(grid));
    if (date && slotId) {
      clonedGrid.cells.forEach((cell: any) => {
        if (cell.type === 'SEAT' && cell.seat) {
          const booked = allBookings.find(
            (b) =>
              b.seat.id === cell.seat.id &&
              b.date === date &&
              b.slot.id === slotId &&
              (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
          );
          if (booked) {
            cell.status = currentUser && booked.userId === currentUser.id ? 'YOURS' : 'BOOKED';
          } else {
            cell.status = 'AVAILABLE';
          }
        }
      });
    }

    return HttpResponse.json({ success: true, data: clonedGrid });
  }),

  http.post(`${BASE}/libraries/:id/suggest-seats`, async () => {
    const fl1Seats = mockFloorGrids['fl-1']?.cells
      .filter((c) => c.type === 'SEAT' && c.seat)
      .map((c) => c.seat!) || [];
    const fl2Seats = mockFloorGrids['fl-2']?.cells
      .filter((c) => c.type === 'SEAT' && c.seat)
      .map((c) => c.seat!) || [];

    const seat1 = fl1Seats.find((s) => s.label === 'F1-A4') || fl1Seats[0];
    const seat2 = fl1Seats.find((s) => s.label === 'F1-B1') || fl1Seats[1] || fl1Seats[0];
    const seat3 = fl2Seats.find((s) => s.label === 'F2-A1') || fl2Seats[0] || seat1;

    const suggestions: SeatSuggestion[] = [];
    if (seat1) {
      suggestions.push({
        seat: seat1,
        floorLabel: 'Floor 1 - Main Hall',
        score: 95,
        reasons: ['Quiet window desk', 'Near power outlet', 'Ergonomic high-back chair'],
      });
    }
    if (seat2) {
      suggestions.push({
        seat: seat2,
        floorLabel: 'Floor 1 - Main Hall',
        score: 88,
        reasons: ['Direct natural sunlight', 'Dedicated electrical socket'],
      });
    }
    if (seat3) {
      suggestions.push({
        seat: seat3,
        floorLabel: 'Floor 2 - Silent Research Zone',
        score: 85,
        reasons: ['Silent study zone', 'High-speed LAN port'],
      });
    }

    return HttpResponse.json({ success: true, data: { suggestions } });
  }),

  // 4.5 Bookings
  http.post(`${BASE}/bookings`, async ({ request }) => {
    const { alwaysFailNext } = useUiStore.getState();
    const body = (await request.json()) as { libraryId: string; seatId: string; slotId: string; date: string };
    const currentUser = resolveCurrentUser(request) || getStoredUsers().find((u) => u.id === 'usr-4') || getStoredUsers()[0];

    // Rate Limiting Invariant: Max 10 attempts per minute per user
    const rateLimit = checkBookingRateLimit(currentUser.id, 10, 60000);
    if (!rateLimit.allowed) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many booking attempts. Please wait a moment before trying again.',
            details: { retryAfter: rateLimit.retryAfter },
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
            'RateLimit-Limit': '10',
            'RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Waitlist Hold Invariant: Held seat cannot be reserved by another user
    const waitlist = getStoredWaitlist();
    const heldByOther = waitlist.find(
      (w) =>
        w.seat.id === body.seatId &&
        w.slot.id === body.slotId &&
        w.date === body.date &&
        w.status === 'NOTIFIED' &&
        w.userId !== currentUser.id &&
        (!w.claimExpiresAt || new Date(w.claimExpiresAt) > new Date())
    );
    if (heldByOther) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'SEAT_HELD_FOR_WAITLIST',
            message: 'This seat is currently held for a waitlisted student.',
          },
        },
        { status: 409 }
      );
    }

    const allBookings = getStoredBookings();

    // Check if user already has an active booking for this time slot on this date
    const userOverlap = allBookings.find(
      (b) =>
        b.userId === currentUser.id &&
        b.slot.id === body.slotId &&
        b.date === body.date &&
        (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );

    if (userOverlap) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'OVERLAPPING_BOOKING',
            message: 'You already have an active booking during this time slot',
            details: { conflictingBookingId: userOverlap.id },
          },
        },
        { status: 409 }
      );
    }

    // Simulate conflict demo if alwaysFailNext toggle is on
    if (alwaysFailNext) {
      useUiStore.getState().setAlwaysFailNext(false); // Reset after trigger
      const alternativeSeat = mockFloorGrids['fl-1'].cells.find((c) => c.seat && c.seat.id !== body.seatId)?.seat;
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'SEAT_UNAVAILABLE',
            message: 'That seat was just taken by another student.',
            details: {
              alternatives: alternativeSeat
                ? [
                    {
                      seat: alternativeSeat,
                      floorLabel: 'Floor 1 - Main Hall',
                      score: 92,
                      reasons: ['Next adjacent desk', 'Similar quiet zone position'],
                    },
                  ]
                : [],
            },
          },
        },
        { status: 409 }
      );
    }

    // Check if seat is already booked by another user
    const existing = allBookings.find(
      (b) =>
        b.seat.id === body.seatId &&
        b.slot.id === body.slotId &&
        b.date === body.date &&
        (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );

    if (existing) {
      const bookedSeatIds = new Set(
        allBookings
          .filter((b) => b.slot.id === body.slotId && b.date === body.date && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN'))
          .map((b) => b.seat.id)
      );
      bookedSeatIds.add(body.seatId);

      const availableAltSeat = mockFloorGrids['fl-1'].cells.find((c) => c.seat && !bookedSeatIds.has(c.seat.id))?.seat;

      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'SEAT_UNAVAILABLE',
            message: 'This seat is already booked for this slot.',
            details: {
              alternatives: availableAltSeat
                ? [
                    {
                      seat: availableAltSeat,
                      floorLabel: 'Floor 1 - Main Hall',
                      score: 90,
                      reasons: ['Nearby available seat', 'Equal amenities'],
                    },
                  ]
                : [],
            },
          },
        },
        { status: 409 }
      );
    }

    const lib = findStoredLibraryById(body.libraryId);
    const libSlots = getStoredSlotsForLibrary(body.libraryId);
    const slot = libSlots.find((s) => s.id === body.slotId) || mockSlots.find((s) => s.id === body.slotId) || mockSlots[0];
    let seat: Seat | null = null;
    let floorLabel = 'Floor 1 - Main Hall';

    const floorsObj = getStoredFloorsForLibrary(body.libraryId);
    Object.values(floorsObj).forEach((grid) => {
      const cell = grid.cells.find((c) => c.seat?.id === body.seatId);
      if (cell && cell.seat) {
        seat = cell.seat;
        floorLabel = grid.label;
      }
    });

    if (!seat) {
      // Safe fallback if seatId is from custom floor or backend format
      const allMockSeats = Object.values(floorsObj)
        .flatMap((g) => g.cells)
        .filter((c) => c.type === 'SEAT' && c.seat)
        .map((c) => c.seat!);
      const matched = allMockSeats.find((s) => s.id === body.seatId);
      if (matched) {
        seat = matched;
      } else {
        seat = {
          id: body.seatId,
          floorId: 'fl-1',
          label: 'Desk',
          seatType: 'INDIVIDUAL',
          facing: 'N',
          attributes: { window: true, powerOutlet: true, quietZone: true, nearDoor: false },
          isActive: true,
        };
      }
    }

    const chosenSeat: Seat = seat;
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      code: `VA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      libraryId: body.libraryId,
      libraryName: lib?.name || 'Central Study Hub',
      seat: chosenSeat,
      floorLabel,
      slot,
      date: body.date,
      status: 'CONFIRMED',
      source: 'ONLINE',
      userId: currentUser.id,
      pricePaise: slot.pricePaise,
      paymentStatus: slot.isFree ? 'FREE' : 'PAID',
      graceUntil: (() => {
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const slotStartMs = new Date(`${body.date}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`).getTime();
        return new Date(slotStartMs + 15 * 60 * 1000).toISOString();
      })(),
      arrivalConfirmed: false,
      createdAt: new Date().toISOString(),
    };

    saveStoredBooking(newBooking);

    // Atomicity: If user held a waitlist spot for this seat and slot, transition status to CLAIMED
    const wlEntry = waitlist.find(
      (w) =>
        w.userId === currentUser.id &&
        w.seat.id === body.seatId &&
        w.slot.id === body.slotId &&
        w.date === body.date &&
        (w.status === 'NOTIFIED' || w.status === 'WAITING')
    );
    if (wlEntry) {
      updateStoredWaitlistEntry(wlEntry.id, { status: 'CLAIMED' });
    }

    // Initial booking confirmation notification
    addStoredNotification(currentUser.id, {
      id: `notif-${Date.now()}`,
      title: 'Booking Confirmed! 🪑',
      body: `Desk ${chosenSeat.label} reserved for ${body.date} (${slot.name} slot). See you there!`,
      type: 'BOOKING_CONFIRMED',
      data: { bookingId: newBooking.id },
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return HttpResponse.json({ success: true, data: newBooking });
  }),

  http.get(`${BASE}/bookings/me`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const upcoming = url.searchParams.get('upcoming');
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';

    let userBookings = getUserBookings(userId);
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
    const bk = getStoredBookings().find((b) => b.id === params.id);
    if (!bk) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: bk });
  }),

  http.get(`${BASE}/bookings/:id/qr`, ({ params }) => {
    const allBookings = getStoredBookings();
    const bk = allBookings.find((b) => b.id === params.id) || allBookings[0];
    const qrToken = `qr-va-${bk ? bk.id : 'demo'}-${bk ? bk.libraryId : 'lib-1'}-${Date.now()}`;
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
    const updated = updateStoredBooking(params.id as string, {
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    });
    if (!updated) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });

    // Free seat and notify next person on waitlist
    const allWait = getStoredWaitlist();
    const waitingEntry = allWait.find(
      (w) =>
        w.seat.id === updated.seat.id &&
        w.slot.id === updated.slot.id &&
        w.date === updated.date &&
        w.status === 'WAITING'
    );
    if (waitingEntry) {
      const claimExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      updateStoredWaitlistEntry(waitingEntry.id, {
        status: 'NOTIFIED',
        claimExpiresAt,
      });
      addStoredNotification(waitingEntry.userId || 'usr-4', {
        id: `ntf-${Date.now()}`,
        type: 'WAITLIST_AVAILABLE',
        title: 'Waitlist Seat Freed!',
        body: `A seat (${waitingEntry.seat.label}) at ${waitingEntry.libraryName} is now available! You have 10 minutes to claim it.`,
        isRead: false,
        data: {
          waitlistId: waitingEntry.id,
          seatId: waitingEntry.seat.id,
          slotId: waitingEntry.slot.id,
          date: waitingEntry.date,
          claimExpiresAt,
        },
        createdAt: new Date().toISOString(),
      });
      mockSocketInstance.simulateWaitlistAvailable(
        waitingEntry.id,
        waitingEntry.seat,
        claimExpiresAt
      );
      mockSocketInstance.simulateSeatUpdate(
        waitingEntry.libraryId,
        waitingEntry.seat.id,
        'HELD',
        waitingEntry.date,
        waitingEntry.slot.id
      );
    }

    return HttpResponse.json({ success: true, data: updated });
  }),

  http.post(`${BASE}/bookings/:id/confirm-arrival`, async ({ params, request }) => {
    const { coming } = (await request.json()) as { coming: boolean };
    const bk = getStoredBookings().find((b) => b.id === params.id);
    if (!bk) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 });

    if (!coming) {
      const updated = updateStoredBooking(params.id as string, {
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
      });

      // Free seat and notify waitlist
      const allWait = getStoredWaitlist();
      const waitingEntry = allWait.find(
        (w) =>
          w.seat.id === bk.seat.id &&
          w.slot.id === bk.slot.id &&
          w.date === bk.date &&
          w.status === 'WAITING'
      );
      if (waitingEntry) {
        const claimExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        updateStoredWaitlistEntry(waitingEntry.id, {
          status: 'NOTIFIED',
          claimExpiresAt,
        });
        addStoredNotification(waitingEntry.userId || 'usr-4', {
          id: `ntf-${Date.now()}`,
          type: 'WAITLIST_AVAILABLE',
          title: 'Waitlist Seat Freed!',
          body: `A seat (${waitingEntry.seat.label}) at ${waitingEntry.libraryName} is now available! You have 10 minutes to claim it.`,
          isRead: false,
          data: {
            waitlistId: waitingEntry.id,
            seatId: waitingEntry.seat.id,
            slotId: waitingEntry.slot.id,
            date: waitingEntry.date,
            claimExpiresAt,
          },
          createdAt: new Date().toISOString(),
        });
        mockSocketInstance.simulateWaitlistAvailable(
          waitingEntry.id,
          waitingEntry.seat,
          claimExpiresAt
        );
      }

      addStoredNotification(bk.userId || 'usr-4', {
        id: `ntf-${Date.now()}`,
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled & Seat Released',
        body: `Your booking for seat ${bk.seat.label} at ${bk.libraryName} was cancelled as requested and the seat has been released.`,
        isRead: false,
        data: { bookingId: bk.id },
        createdAt: new Date().toISOString(),
      });
      mockSocketInstance.simulateBookingReleased(
        bk.id,
        'CANCELLED',
        'Your booking was cancelled as you indicated you are not coming.'
      );
      mockSocketInstance.simulateSeatUpdate(bk.libraryId, bk.seat.id, 'AVAILABLE', bk.date, bk.slot.id);

      return HttpResponse.json({ success: true, data: updated });
    }

    if (bk.arrivalConfirmed) {
      return HttpResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Arrival buffer already utilized once.' } },
        { status: 409 }
      );
    }

    const updated = updateStoredBooking(params.id as string, {
      arrivalConfirmed: true,
      graceUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    addStoredNotification(bk.userId || 'usr-4', {
      id: `ntf-${Date.now()}`,
      type: 'GRACE_EXTENDED',
      title: '15-Minute Buffer Granted',
      body: `You have 15 minutes to arrive and check in for seat ${bk.seat.label} at ${bk.libraryName}. If not checked in within 15 minutes, your slot will be cancelled automatically.`,
      isRead: false,
      data: { bookingId: bk.id },
      createdAt: new Date().toISOString(),
    });

    return HttpResponse.json({ success: true, data: updated });
  }),

  // 4.6 Waitlist
  http.post(`${BASE}/waitlist`, async ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    const body = (await request.json()) as { seatId: string; slotId: string; date: string };

    // Check if user is already in waitlist for this seat, slot, and date
    const userWaitlist = getUserWaitlist(userId);
    const alreadyWaiting = userWaitlist.some(
      (w) =>
        w.seat.id === body.seatId &&
        w.slot.id === body.slotId &&
        w.date === body.date &&
        (w.status === 'WAITING' || w.status === 'NOTIFIED')
    );
    if (alreadyWaiting) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_ON_WAITLIST',
            message: 'You are already on the waitlist for this seat',
          },
        },
        { status: 409 }
      );
    }

    // Locate seat and floor label across all floor grids
    let seat: Seat | undefined;
    for (const grid of Object.values(mockFloorGrids)) {
      const cell = grid.cells.find((c) => c.seat?.id === body.seatId);
      if (cell?.seat) {
        seat = cell.seat;
        break;
      }
    }
    if (!seat) {
      seat = mockFloorGrids['fl-1'].cells.find((c) => c.seat?.id === body.seatId)?.seat || mockFloorGrids['fl-1'].cells[0].seat!;
    }

    const slot = mockSlots.find((s) => s.id === body.slotId) || mockSlots[0];
    const library = mockLibraries.find((l) => l.id === slot.libraryId) || mockLibraries[0];

    const allWaitlist = getStoredWaitlist();
    const existingQueueCount = allWaitlist.filter(
      (w) =>
        w.seat.id === body.seatId &&
        w.slot.id === body.slotId &&
        w.date === body.date &&
        w.status === 'WAITING'
    ).length;
    const position = existingQueueCount + 1;

    const newWait: WaitlistEntry = {
      id: `wt-${Date.now()}`,
      seat,
      libraryId: library.id,
      libraryName: library.name,
      slot,
      date: body.date,
      status: 'WAITING',
      position,
      createdAt: new Date().toISOString(),
    };
    addStoredWaitlistEntry(userId, newWait);
    return HttpResponse.json({ success: true, data: newWait }, { status: 201 });
  }),

  http.get(`${BASE}/waitlist/me`, ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    return HttpResponse.json({ success: true, data: getUserWaitlist(userId) });
  }),

  http.delete(`${BASE}/waitlist/:id`, ({ params, request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    removeStoredWaitlistEntry(params.id as string, userId);
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.post(`${BASE}/waitlist/:id/claim`, ({ params, request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';

    // Rate Limiting Invariant
    const rateLimit = checkBookingRateLimit(userId, 10, 60000);
    if (!rateLimit.allowed) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many booking attempts. Please wait a moment before trying again.',
            details: { retryAfter: rateLimit.retryAfter },
          },
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    const list = getUserWaitlist(userId);
    const item = list.find((w) => w.id === params.id);
    if (!item) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Waitlist entry not found' } }, { status: 404 });

    // Consistency Invariant: Ensure seat is not already booked
    const allBookings = getStoredBookings();
    const existing = allBookings.find(
      (b) =>
        b.seat.id === item.seat.id &&
        b.slot.id === item.slot.id &&
        b.date === item.date &&
        (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );
    if (existing) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'SEAT_UNAVAILABLE',
            message: 'This seat was just claimed by another student.',
          },
        },
        { status: 409 }
      );
    }

    updateStoredWaitlistEntry(params.id as string, { status: 'CLAIMED' });

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
      userId,
      pricePaise: item.slot.pricePaise,
      paymentStatus: item.slot.isFree ? 'FREE' : 'PAID',
      graceUntil: (() => {
        const [startH, startM] = item.slot.startTime.split(':').map(Number);
        const slotStartMs = new Date(`${item.date}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`).getTime();
        return new Date(slotStartMs + 15 * 60 * 1000).toISOString();
      })(),
      arrivalConfirmed: false,
      createdAt: new Date().toISOString(),
    };

    saveStoredBooking(newBooking);

    addStoredNotification(userId, {
      id: `ntf-${Date.now()}`,
      type: 'BOOKING_CONFIRMED',
      title: 'Waitlist Seat Claimed!',
      body: `Your reservation for seat ${item.seat.label} at ${item.libraryName} has been confirmed.`,
      isRead: false,
      data: { bookingId: newBooking.id },
      createdAt: new Date().toISOString(),
    });

    return HttpResponse.json({ success: true, data: newBooking });
  }),

  // 4.7 User Dashboard, Study, Leaderboard
  http.get(`${BASE}/users/me/dashboard`, ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    const dashboard = getUserDashboard(userId);
    return HttpResponse.json({
      success: true,
      data: dashboard,
    });
  }),

  http.get(`${BASE}/users/me/preferences`, ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    return HttpResponse.json({ success: true, data: getUserPreferences(userId) });
  }),

  http.put(`${BASE}/users/me/preferences`, async ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    const body = (await request.json()) as any;
    const updated = saveUserPreferences(userId, body);
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.post(`${BASE}/study/sessions`, async ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    const body = (await request.json()) as {
      type: 'POMODORO' | 'CUSTOM' | 'STOPWATCH';
      startedAt: string;
      endedAt: string;
      focusSeconds: number;
      breakSeconds?: number;
      bookingId?: string;
    };
    const session = addStoredStudySession({
      userId,
      type: body.type,
      startedAt: body.startedAt,
      endedAt: body.endedAt,
      focusSeconds: body.focusSeconds,
      breakSeconds: body.breakSeconds,
      bookingId: body.bookingId,
    });
    return HttpResponse.json({ success: true, data: { id: session.id } });
  }),

  http.get(`${BASE}/study/reports`, ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    const url = new URL(request.url);
    const range = (url.searchParams.get('range') || 'week') as 'week' | 'month';
    const report = getUserStudyReport(userId, range);
    return HttpResponse.json({ success: true, data: report });
  }),

  http.get(`${BASE}/study/leaderboard`, ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    const entries = getStoredLeaderboard(userId);
    const myEntry = entries.find((e) => e.userId === userId);
    return HttpResponse.json({
      success: true,
      data: {
        entries,
        myRank: myEntry?.rank || 1,
      },
    });
  }),

  // 4.8 Notifications & Chat
  http.get(`${BASE}/notifications`, ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    return HttpResponse.json({ success: true, data: getUserNotifications(userId) });
  }),

  http.post(`${BASE}/notifications/:id/read`, ({ params, request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    markStoredNotificationRead(params.id as string, userId);
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.post(`${BASE}/notifications/read-all`, ({ request }) => {
    const currentUser = resolveCurrentUser(request);
    const userId = currentUser?.id || 'usr-4';
    markAllStoredNotificationsRead(userId);
    return HttpResponse.json({ success: true, data: { ok: true } });
  }),

  http.post(`${BASE}/chat`, async ({ request }) => {
    const { message } = (await request.json()) as { message: string };
    const { reply, suggestedActions } = generateChatResponse(message || '');

    return HttpResponse.json({
      success: true,
      data: {
        conversationId: `conv-${Date.now()}`,
        reply,
        suggestedActions: suggestedActions || [],
      },
    });
  }),
];
