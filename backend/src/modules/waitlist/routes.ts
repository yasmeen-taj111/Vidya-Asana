import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { query, withTransaction } from '../../config/db';
import { bookingRateLimiter } from '../../middleware/rateLimit';
import { AppError } from '../../utils/errors';
import { sendSuccess, sendError } from '../../utils/response';
import { generateUUID, generateBookingCode } from '../../utils/ids';
import { emitSeatUpdated } from '../../realtime/socket';
import { createNotification } from '../notifications/service';
import { mapBookingRow } from '../bookings/routes';

export const waitlistRouter = Router();

function mapWaitlistRow(w: any, position = 1) {
  return {
    id: w.id,
    seat: {
      id: w.seat_id,
      floorId: w.floor_id,
      label: w.seat_label,
      seatType: w.seat_type,
      facing: w.facing,
      attributes: {
        window: Boolean(w.attr_window),
        powerOutlet: Boolean(w.attr_power_outlet),
        quietZone: Boolean(w.attr_quiet_zone),
        nearDoor: Boolean(w.attr_near_door),
      },
      isActive: true,
      groupCapacity: w.group_capacity || undefined,
    },
    libraryId: w.library_id,
    libraryName: w.library_name,
    slot: {
      id: w.slot_id,
      libraryId: w.library_id,
      name: w.slot_name,
      startTime: w.start_time,
      endTime: w.end_time,
      isFree: Boolean(w.slot_is_free),
      pricePaise: Number(w.slot_price_paise),
      isActive: Boolean(w.slot_is_active),
    },
    date:
      typeof w.booking_date === 'string'
        ? w.booking_date.substring(0, 10)
        : new Date(w.booking_date).toISOString().substring(0, 10),
    status: w.status,
    position,
    claimExpiresAt: w.claim_expires_at ? new Date(w.claim_expires_at).toISOString() : undefined,
    createdAt: new Date(w.created_at).toISOString(),
  };
}

const WAITLIST_SELECT_SQL = `
  SELECT w.*,
    l.name as library_name,
    s.library_id, s.label as seat_label, s.seat_type, s.facing,
    s.attr_window, s.attr_power_outlet, s.attr_quiet_zone, s.attr_near_door,
    s.group_capacity, s.floor_id,
    f.label as floor_label,
    sl.name as slot_name, sl.start_time, sl.end_time, sl.is_free as slot_is_free,
    sl.price_paise as slot_price_paise, sl.is_active as slot_is_active
  FROM waitlist_entries w
  JOIN seats s ON s.id = w.seat_id
  JOIN libraries l ON l.id = s.library_id
  JOIN floors f ON f.id = s.floor_id
  JOIN time_slots sl ON sl.id = w.slot_id
`;

// POST /waitlist
waitlistRouter.post('/', authenticate, bookingRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { seatId, slotId, date } = req.body;

    if (!seatId || !slotId || !date) {
      return sendError(res, 'VALIDATION_ERROR', 'seatId, slotId, and date are required', 422);
    }

    // Check if user already on waitlist
    const existing = await query<any[]>(
      `SELECT * FROM waitlist_entries
       WHERE user_id = ? AND seat_id = ? AND slot_id = ? AND booking_date = ?
         AND status IN ('WAITING', 'NOTIFIED')`,
      [userId, seatId, slotId, date]
    );

    if (existing.length > 0) {
      return sendError(res, 'ALREADY_ON_WAITLIST', 'You are already on the waitlist for this seat', 409);
    }

    // Check seat and slot
    const seatRows = await query<any[]>(`SELECT * FROM seats WHERE id = ? AND is_active = 1`, [seatId]);
    if (seatRows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Seat not found', 404);
    }

    const slotRows = await query<any[]>(`SELECT * FROM time_slots WHERE id = ? AND is_active = 1`, [slotId]);
    if (slotRows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Slot not found', 404);
    }

    // Determine position
    const countRows = await query<any[]>(
      `SELECT COUNT(*) as count FROM waitlist_entries
       WHERE seat_id = ? AND slot_id = ? AND booking_date = ? AND status = 'WAITING'`,
      [seatId, slotId, date]
    );
    const position = (countRows[0]?.count || 0) + 1;

    const id = generateUUID();
    await query(
      `INSERT INTO waitlist_entries (id, user_id, seat_id, slot_id, booking_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'WAITING', NOW())`,
      [id, userId, seatId, slotId, date]
    );

    const inserted = await query<any[]>(`${WAITLIST_SELECT_SQL} WHERE w.id = ?`, [id]);
    sendSuccess(res, mapWaitlistRow(inserted[0], position), undefined, 201);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return sendError(res, 'ALREADY_ON_WAITLIST', 'You are already on the waitlist for this seat', 409);
    }
    next(err);
  }
});

// GET /waitlist/me
waitlistRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const rows = await query<any[]>(
      `${WAITLIST_SELECT_SQL}
       WHERE w.user_id = ? AND w.status IN ('WAITING', 'NOTIFIED')
       ORDER BY w.created_at ASC`,
      [userId]
    );

    // Compute relative queue position for each
    const results = await Promise.all(
      rows.map(async (row) => {
        if (row.status === 'NOTIFIED') {
          return mapWaitlistRow(row, 1);
        }
        const posRows = await query<any[]>(
          `SELECT COUNT(*) as count FROM waitlist_entries
           WHERE seat_id = ? AND slot_id = ? AND booking_date = ? AND status = 'WAITING'
             AND created_at <= ?`,
          [row.seat_id, row.slot_id, row.booking_date, row.created_at]
        );
        const pos = Math.max(1, posRows[0]?.count || 1);
        return mapWaitlistRow(row, pos);
      })
    );

    sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
});

// DELETE /waitlist/:id
waitlistRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const rows = await query<any[]>(`SELECT * FROM waitlist_entries WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Waitlist entry not found', 404);
    }

    if (rows[0].user_id !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied', 403);
    }

    await query(`UPDATE waitlist_entries SET status = 'REMOVED' WHERE id = ?`, [id]);
    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /waitlist/:id/claim
waitlistRouter.post('/:id/claim', authenticate, bookingRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const booking = await withTransaction(async (tx) => {
      // 1. Lock waitlist entry row FOR UPDATE
      const rows = await tx.query<any[]>(`${WAITLIST_SELECT_SQL} WHERE w.id = ? FOR UPDATE`, [id]);
      if (rows.length === 0) {
        throw new AppError('NOT_FOUND', 'Waitlist entry not found', 404);
      }

      const w = rows[0];
      if (w.user_id !== userId) {
        throw new AppError('FORBIDDEN', 'Access denied', 403);
      }

      if (w.status !== 'NOTIFIED') {
        throw new AppError('BAD_REQUEST', 'Seat is not ready for claim', 400);
      }

      if (w.claim_expires_at && new Date(w.claim_expires_at) < new Date()) {
        await tx.execute(`UPDATE waitlist_entries SET status = 'EXPIRED' WHERE id = ?`, [id]);
        throw new AppError('BOOKING_EXPIRED', 'Waitlist claim window has expired', 410);
      }

      const dateStr =
        typeof w.booking_date === 'string'
          ? w.booking_date.substring(0, 10)
          : new Date(w.booking_date).toISOString().substring(0, 10);

      // 2. Lock seat row FOR UPDATE
      const [seat] = await tx.query<any[]>(
        'SELECT id FROM seats WHERE id = ? AND is_active = 1 FOR UPDATE',
        [w.seat_id]
      );
      if (!seat) {
        throw new AppError('NOT_FOUND', 'Seat not found or inactive', 404);
      }

      // 3. Consistency invariant: Check active conflicting booking FOR UPDATE
      const activeBookings = await tx.query<any[]>(
        `SELECT id FROM bookings
         WHERE seat_id = ? AND slot_id = ? AND booking_date = ?
           AND status IN ('CONFIRMED', 'CHECKED_IN')
         FOR UPDATE`,
        [w.seat_id, w.slot_id, dateStr]
      );
      if (activeBookings.length > 0) {
        throw new AppError('SEAT_UNAVAILABLE', 'This seat is already booked for this slot.', 409);
      }

      // Calculate grace period: 15 minutes buffer wait time
      const [startHour, startMin] = w.start_time.split(':').map(Number);
      const graceDate = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
      graceDate.setMinutes(graceDate.getMinutes() + 15);
      const now = new Date();
      const finalGrace = graceDate > now ? graceDate : new Date(now.getTime() + 15 * 60 * 1000);

      const bookingId = generateUUID();
      const code = generateBookingCode();
      const qrSecret = generateUUID();
      const pricePaise = w.slot_is_free ? 0 : w.slot_price_paise;
      const paymentStatus = w.slot_is_free ? 'FREE' : 'PAID';

      // 4. Atomicity: Insert booking
      await tx.execute(
        `INSERT INTO bookings (
          id, code, library_id, seat_id, slot_id, user_id, booking_date, status, source,
          price_paise, payment_status, grace_until, arrival_confirmed, qr_secret, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'ONLINE', ?, ?, ?, 0, ?, NOW())`,
        [
          bookingId,
          code,
          w.library_id,
          w.seat_id,
          w.slot_id,
          userId,
          dateStr,
          pricePaise,
          paymentStatus,
          finalGrace,
          qrSecret,
        ]
      );

      // 5. Atomicity: Update waitlist entry status to CLAIMED
      await tx.execute(`UPDATE waitlist_entries SET status = 'CLAIMED' WHERE id = ?`, [id]);

      const createdRows = await tx.query<any[]>(
        `SELECT b.*,
          l.name as library_name,
          s.label as seat_label, s.seat_type, s.facing, s.attr_window, s.attr_power_outlet,
          s.attr_quiet_zone, s.attr_near_door, s.group_capacity, s.is_active as seat_is_active, s.floor_id,
          f.label as floor_label,
          sl.name as slot_name, sl.start_time, sl.end_time, sl.is_free as slot_is_free,
          sl.price_paise as slot_price_paise, sl.is_active as slot_is_active
        FROM bookings b
        JOIN libraries l ON l.id = b.library_id
        JOIN seats s ON s.id = b.seat_id
        JOIN floors f ON f.id = s.floor_id
        JOIN time_slots sl ON sl.id = b.slot_id
        WHERE b.id = ?`,
        [bookingId]
      );

      return {
        booking: mapBookingRow(createdRows[0]),
        libraryId: w.library_id,
        seatId: w.seat_id,
        slotId: w.slot_id,
        dateStr,
        seatLabel: w.seat_label,
        libraryName: w.library_name,
        code,
        bookingId,
      };
    });

    // Durability & Side effects: Transaction committed successfully
    emitSeatUpdated(booking.libraryId, booking.seatId, booking.slotId, booking.dateStr, 'BOOKED');

    try {
      await createNotification({
        userId,
        type: 'BOOKING_CONFIRMED',
        title: 'Waitlist Claimed!',
        body: `You successfully claimed seat ${booking.seatLabel} at ${booking.libraryName}.`,
        data: { bookingId: booking.bookingId, code: booking.code },
      });
    } catch (notifErr) {
      console.warn('[Waitlist] Notification delivery failed (non-fatal):', notifErr);
    }

    sendSuccess(res, booking.booking);
  } catch (err: any) {
    if (err instanceof AppError) {
      return sendError(res, err.code, err.message, err.status, err.details);
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return sendError(res, 'SEAT_UNAVAILABLE', 'This seat was just claimed by another student.', 409);
    }
    next(err);
  }
});
