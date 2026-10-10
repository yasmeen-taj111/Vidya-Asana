import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { query, withTransaction } from '../../config/db';
import { bookingRateLimiter } from '../../middleware/rateLimit';
import { AppError } from '../../utils/errors';
import { sendSuccess, sendError } from '../../utils/response';
import { generateUUID, generateBookingCode } from '../../utils/ids';
import { generateQrToken, generateQrDataUrl } from '../../utils/qr';
import { scoreSeat } from '../../utils/scoring';
import { emitSeatUpdated, emitBookingUpdated, emitBookingReleased } from '../../realtime/socket';
import { createNotification } from '../notifications/service';
import { notifyNextInWaitlist } from '../waitlist/service';

export const bookingsRouter = Router();

export function mapBookingRow(b: any) {
  return {
    id: b.id,
    code: b.code,
    libraryId: b.library_id,
    libraryName: b.library_name,
    seat: {
      id: b.seat_id,
      floorId: b.floor_id,
      label: b.seat_label,
      seatType: b.seat_type,
      facing: b.facing,
      attributes: {
        window: Boolean(b.attr_window),
        powerOutlet: Boolean(b.attr_power_outlet),
        quietZone: Boolean(b.attr_quiet_zone),
        nearDoor: Boolean(b.attr_near_door),
      },
      isActive: Boolean(b.seat_is_active),
      groupCapacity: b.group_capacity || undefined,
    },
    floorLabel: b.floor_label,
    slot: {
      id: b.slot_id,
      libraryId: b.library_id,
      name: b.slot_name,
      startTime: b.start_time,
      endTime: b.end_time,
      isFree: Boolean(b.slot_is_free),
      pricePaise: Number(b.slot_price_paise),
      isActive: Boolean(b.slot_is_active),
    },
    date:
      typeof b.booking_date === 'string'
        ? b.booking_date.substring(0, 10)
        : new Date(b.booking_date).toISOString().substring(0, 10),
    status: b.status,
    source: b.source,
    userId: b.user_id || undefined,
    guestName: b.guest_name || undefined,
    pricePaise: Number(b.price_paise),
    paymentStatus: b.payment_status,
    graceUntil: new Date(b.grace_until).toISOString(),
    arrivalConfirmed: Boolean(b.arrival_confirmed),
    checkedInAt: b.checked_in_at ? new Date(b.checked_in_at).toISOString() : undefined,
    cancelledAt: b.cancelled_at ? new Date(b.cancelled_at).toISOString() : undefined,
    createdAt: new Date(b.created_at).toISOString(),
  };
}

const BOOKING_SELECT_SQL = `
  SELECT b.*,
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
`;

// POST /bookings
bookingsRouter.post('/', authenticate, bookingRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
    const { libraryId, seatId, slotId, date } = req.body;

    if (!libraryId || !seatId || !slotId || !date) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required fields: libraryId, seatId, slotId, date', 422);
    }

    // Validate booking date range: today (with 1-day timezone leeway) <= date <= today + 14 days
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 1);
    const minDateStr = minDate.toISOString().substring(0, 10);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 15);
    const maxDateStr = maxDate.toISOString().substring(0, 10);

    if (date < minDateStr) {
      return sendError(res, 'BAD_REQUEST', 'Cannot book a date in the past', 400);
    }
    if (date > maxDateStr) {
      return sendError(res, 'BAD_REQUEST', 'Cannot book more than 14 days in advance', 400);
    }

    // Idempotency check
    if (idempotencyKey) {
      const existing = await query<any[]>(
        `${BOOKING_SELECT_SQL} WHERE b.user_id = ? AND b.idempotency_key = ?`,
        [userId, idempotencyKey]
      );
      if (existing.length > 0) {
        return sendSuccess(res, mapBookingRow(existing[0]), undefined, 200);
      }
    }

    // Validate slot has not already ended if booking for today
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const localTodayStr = `${curYear}-${curMonth}-${curDay}`;

    if (date < localTodayStr) {
      return sendError(res, 'BAD_REQUEST', 'Cannot make a booking for a past date. Please select today or an upcoming date.', 400);
    }

    // Execute reservation within an ACID Transaction guaranteeing Atomicity, Consistency, and Isolation
    const booking = await withTransaction(async (tx) => {
      // 1. Isolation & Consistency: Lock seat row FOR UPDATE
      const seatRows = await tx.query<any[]>(
        `SELECT * FROM seats WHERE id = ? AND library_id = ? AND is_active = 1 FOR UPDATE`,
        [seatId, libraryId]
      );
      if (seatRows.length === 0) {
        throw new AppError('NOT_FOUND', 'Seat not found or inactive', 404);
      }

      // 2. Isolation & Consistency: Lock slot row FOR UPDATE
      const slotRows = await tx.query<any[]>(
        `SELECT * FROM time_slots WHERE id = ? AND library_id = ? AND is_active = 1 FOR UPDATE`,
        [slotId, libraryId]
      );
      if (slotRows.length === 0) {
        throw new AppError('NOT_FOUND', 'Time slot not found or inactive', 404);
      }
      const slot = slotRows[0];

      if (date === localTodayStr) {
        const curH = String(now.getHours()).padStart(2, '0');
        const curM = String(now.getMinutes()).padStart(2, '0');
        const curTime = `${curH}:${curM}`;

        if (slot.end_time <= curTime) {
          throw new AppError(
            'BAD_REQUEST',
            `The ${slot.name} slot (${slot.start_time} - ${slot.end_time}) has already ended for today. Please select an upcoming slot or a future date.`,
            400
          );
        }
      }

      // 3. Consistency: Check user overlapping bookings on same date FOR UPDATE
      const userActiveBookings = await tx.query<any[]>(
        `SELECT b.id, sl.start_time, sl.end_time
         FROM bookings b
         JOIN time_slots sl ON sl.id = b.slot_id
         WHERE b.user_id = ? AND b.booking_date = ? AND b.status IN ('CONFIRMED', 'CHECKED_IN')
         FOR UPDATE`,
        [userId, date]
      );

      for (const active of userActiveBookings) {
        if (active.start_time < slot.end_time && active.end_time > slot.start_time) {
          throw new AppError(
            'OVERLAPPING_BOOKING',
            'You already have an active booking during this time slot',
            409,
            { conflictingBookingId: active.id }
          );
        }
      }

      // 4. Consistency: Check waitlist hold
      const held = await tx.query<any[]>(
        `SELECT * FROM waitlist_entries
         WHERE seat_id = ? AND slot_id = ? AND booking_date = ?
           AND status = 'NOTIFIED' AND claim_expires_at > UTC_TIMESTAMP()
         FOR UPDATE`,
        [seatId, slotId, date]
      );
      if (held.length > 0 && held[0].user_id !== userId) {
        throw new AppError(
          'SEAT_HELD_FOR_WAITLIST',
          'This seat is currently held for a waitlisted user',
          409
        );
      }

      // 5. Consistency & Isolation: Check seat availability FOR UPDATE
      const conflict = await tx.query<any[]>(
        `SELECT id FROM bookings
         WHERE seat_id = ? AND slot_id = ? AND booking_date = ?
           AND status IN ('CONFIRMED', 'CHECKED_IN')
         FOR UPDATE`,
        [seatId, slotId, date]
      );

      if (conflict.length > 0) {
        // Compute smart alternatives
        const candidateSeats = await tx.query<any[]>(
          `SELECT s.id, s.floor_id, s.label, s.seat_type, s.facing,
                  s.attr_window, s.attr_power_outlet, s.attr_quiet_zone, s.attr_near_door,
                  s.group_capacity, f.label as floor_label
           FROM seats s
           JOIN floors f ON f.id = s.floor_id
           WHERE s.library_id = ? AND s.is_active = 1 AND s.id != ?
             AND s.id NOT IN (
               SELECT seat_id FROM bookings
               WHERE library_id = ? AND booking_date = ? AND slot_id = ?
                 AND status IN ('CONFIRMED', 'CHECKED_IN')
             )
             AND s.id NOT IN (
               SELECT seat_id FROM waitlist_entries
               WHERE slot_id = ? AND booking_date = ? AND status = 'NOTIFIED' AND claim_expires_at > UTC_TIMESTAMP()
             )
           LIMIT 15`,
          [libraryId, seatId, libraryId, date, slotId, slotId, date]
        );

        const prefRows = await tx.query<any[]>(
          `SELECT * FROM user_preferences WHERE user_id = ?`,
          [userId]
        );
        const userPrefs = prefRows.length > 0 ? {
          seatType: prefRows[0].seat_type,
          window: Boolean(prefRows[0].window),
          powerOutlet: Boolean(prefRows[0].power_outlet),
          quietZone: Boolean(prefRows[0].quiet_zone),
        } : {};

        const alternatives = candidateSeats.map((c) => {
          const scored = scoreSeat(
            {
              id: c.id,
              floorId: c.floor_id,
              label: c.label,
              seatType: c.seat_type,
              facing: c.facing,
              attributes: {
                window: Boolean(c.attr_window),
                powerOutlet: Boolean(c.attr_power_outlet),
                quietZone: Boolean(c.attr_quiet_zone),
                nearDoor: Boolean(c.attr_near_door),
              },
              groupCapacity: c.group_capacity,
            },
            userPrefs
          );
          return {
            seat: {
              id: c.id,
              floorId: c.floor_id,
              label: c.label,
              seatType: c.seat_type,
              facing: c.facing,
              attributes: {
                window: Boolean(c.attr_window),
                powerOutlet: Boolean(c.attr_power_outlet),
                quietZone: Boolean(c.attr_quiet_zone),
                nearDoor: Boolean(c.attr_near_door),
              },
              isActive: true,
            },
            floorLabel: c.floor_label,
            score: scored.score,
            reasons: scored.reasons,
          };
        });

        alternatives.sort((a, b) => b.score - a.score);

        throw new AppError(
          'SEAT_UNAVAILABLE',
          'The selected seat is already reserved for this slot',
          409,
          { alternatives: alternatives.slice(0, 5) }
        );
      }

      // 6. Calculate graceUntil
      const [startHour, startMin] = slot.start_time.split(':').map(Number);
      const [endHour, endMin] = slot.end_time.split(':').map(Number);
      const slotStartDate = new Date(`${date}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
      const slotEndDate = new Date(`${date}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`);
      const defaultGraceDate = new Date(slotStartDate.getTime() + 15 * 60 * 1000);

      let finalGraceUntil = defaultGraceDate;
      const isOngoing = slotStartDate <= now && now < slotEndDate;
      if (isOngoing) {
        const graceFromNow = new Date(now.getTime() + 15 * 60 * 1000);
        finalGraceUntil = graceFromNow < slotEndDate ? graceFromNow : slotEndDate;
      }

      const bookingId = generateUUID();
      const code = generateBookingCode();
      const qrSecret = generateUUID();
      const pricePaise = slot.is_free ? 0 : slot.price_paise;
      const paymentStatus = slot.is_free ? 'FREE' : 'PAID';

      // 7. Atomicity: Insert booking within transaction
      await tx.execute(
        `INSERT INTO bookings (
          id, code, library_id, seat_id, slot_id, user_id, booking_date, status, source,
          price_paise, payment_status, grace_until, arrival_confirmed, reminder_sent_at, qr_secret, idempotency_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'ONLINE', ?, ?, ?, 0, ${isOngoing ? 'UTC_TIMESTAMP()' : 'NULL'}, ?, ?, UTC_TIMESTAMP())`,
        [
          bookingId,
          code,
          libraryId,
          seatId,
          slotId,
          userId,
          date,
          pricePaise,
          paymentStatus,
          finalGraceUntil,
          qrSecret,
          idempotencyKey,
        ]
      );

      // 8. Atomicity: If user was on waitlist, mark as CLAIMED within same transaction
      await tx.execute(
        `UPDATE waitlist_entries
         SET status = 'CLAIMED'
         WHERE user_id = ? AND seat_id = ? AND slot_id = ? AND booking_date = ?`,
        [userId, seatId, slotId, date]
      );

      // 9. Fetch full booking record before commit
      const createdRows = await tx.query<any[]>(
        `${BOOKING_SELECT_SQL} WHERE b.id = ?`,
        [bookingId]
      );
      return mapBookingRow(createdRows[0]);
    });

    // Durability & Side effects: Transaction committed successfully to disk
    // Broadcast real-time events and queue notifications
    emitSeatUpdated(libraryId, seatId, slotId, date, 'BOOKED');
    emitBookingUpdated(libraryId, booking);

    try {
      await createNotification({
        userId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking Confirmed!',
        body: `Your seat ${booking.seat.label} at ${booking.libraryName} is reserved for ${booking.slot.name} on ${booking.date}.`,
        data: { bookingId: booking.id, code: booking.code },
      });
    } catch (notifErr) {
      console.warn('[Bookings] Could not deliver notification (non-fatal):', notifErr);
    }

    sendSuccess(res, booking, undefined, 201);
  } catch (err: any) {
    if (err instanceof AppError) {
      return sendError(res, err.code, err.message, err.status, err.details);
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return sendError(
        res,
        'SEAT_UNAVAILABLE',
        'This seat was just reserved by another student. Please select an alternative.',
        409,
        { alternatives: [] }
      );
    }
    next(err);
  }
});

// GET /bookings/me
bookingsRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Active read auto-expiry: any confirmed booking whose 15-minute buffer has expired transitions to NO_SHOW immediately
    try {
      const expiredBookings = await query<any[]>(
        `SELECT b.id, b.library_id, b.seat_id, b.slot_id, b.booking_date, b.code, b.user_id
         FROM bookings b
         WHERE b.user_id = ? AND b.status = 'CONFIRMED'
           AND (b.grace_until <= UTC_TIMESTAMP() OR b.grace_until <= NOW())`,
        [userId]
      );

      if (expiredBookings.length > 0) {
        await query(
          `UPDATE bookings
           SET status = 'NO_SHOW', cancelled_at = NOW()
           WHERE user_id = ? AND status = 'CONFIRMED'
             AND (grace_until <= UTC_TIMESTAMP() OR grace_until <= NOW())`,
          [userId]
        );

        for (const exp of expiredBookings) {
          const dateStr =
            typeof exp.booking_date === 'string'
              ? exp.booking_date.substring(0, 10)
              : new Date(exp.booking_date).toISOString().substring(0, 10);

          emitSeatUpdated(exp.library_id, exp.seat_id, exp.slot_id, dateStr, 'AVAILABLE');
          emitBookingReleased(exp.user_id, {
            bookingId: exp.id,
            reason: 'NO_SHOW',
            message: `Your reservation (${exp.code}) was automatically cancelled because the 15-minute buffer wait time expired.`,
          });
          notifyNextInWaitlist(exp.seat_id, exp.slot_id, dateStr).catch(() => {});
          createNotification({
            userId,
            type: 'NO_SHOW',
            title: 'Slot Cancelled (15-Min Buffer Expired)',
            body: `Your reservation (${exp.code}) was automatically cancelled because 15 minutes elapsed without check-in. The seat has been released.`,
            data: { bookingId: exp.id },
          }).catch(() => {});
        }
      }
    } catch (expErr) {
      console.warn('[Bookings] Auto-expiry check error on /bookings/me:', expErr);
    }

    const { status, upcoming, page = 1, pageSize = 20 } = req.query;

    let sql = `${BOOKING_SELECT_SQL} WHERE b.user_id = ?`;
    const params: any[] = [userId];

    if (status) {
      sql += ` AND b.status = ?`;
      params.push(status);
    }

    if (upcoming === 'true') {
      const today = new Date().toISOString().substring(0, 10);
      sql += ` AND b.booking_date >= ? AND b.status IN ('CONFIRMED', 'CHECKED_IN')`;
      params.push(today);
    }

    sql += ` ORDER BY b.booking_date DESC, b.created_at DESC`;

    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const allRows = await query<any[]>(sql, params);
    const paginated = allRows.slice(offset, offset + limit);

    const bookings = paginated.map(mapBookingRow);
    sendSuccess(res, bookings, {
      page: Number(page),
      pageSize: limit,
      total: allRows.length,
      totalPages: Math.ceil(allRows.length / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /bookings/:id
bookingsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const rows = await query<any[]>(`${BOOKING_SELECT_SQL} WHERE b.id = ?`, [id]);
    if (rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Booking not found', 404);
    }

    const booking = rows[0];
    if (req.user!.role === 'USER' && booking.user_id !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this booking', 403);
    }

    sendSuccess(res, mapBookingRow(booking));
  } catch (err) {
    next(err);
  }
});

// GET /bookings/:id/qr
bookingsRouter.get('/:id/qr', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const rows = await query<any[]>(
      `SELECT b.*, sl.start_time, sl.end_time
       FROM bookings b
       JOIN time_slots sl ON sl.id = b.slot_id
       WHERE b.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Booking not found', 404);
    }

    const b = rows[0];
    if (req.user!.role === 'USER' && b.user_id !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied', 403);
    }

    if (b.status === 'CANCELLED' || b.status === 'NO_SHOW') {
      return sendError(res, 'BOOKING_EXPIRED', 'This booking is no longer valid', 410);
    }

    const dateStr = typeof b.booking_date === 'string' ? b.booking_date.substring(0, 10) : new Date(b.booking_date).toISOString().substring(0, 10);
    const [endH, endM] = b.end_time.split(':').map(Number);
    const expDate = new Date(`${dateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    const expUnix = Math.floor(expDate.getTime() / 1000);

    const token = generateQrToken({
      bookingId: b.id,
      libraryId: b.library_id,
      slotId: b.slot_id,
      date: dateStr,
      exp: expUnix,
    });

    const qrDataUrl = await generateQrDataUrl(token);

    sendSuccess(res, {
      qrToken: token,
      qrDataUrl,
      expiresAt: expDate.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /bookings/:id/cancel
bookingsRouter.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const rows = await query<any[]>(`${BOOKING_SELECT_SQL} WHERE b.id = ?`, [id]);
    if (rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Booking not found', 404);
    }

    const b = rows[0];
    if (req.user!.role === 'USER' && b.user_id !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied', 403);
    }

    if (b.status === 'CANCELLED' || b.status === 'COMPLETED') {
      return sendError(res, 'BAD_REQUEST', `Booking is already ${b.status.toLowerCase()}`, 400);
    }

    await query(
      `UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = ?`,
      [id]
    );

    const dateStr = typeof b.booking_date === 'string' ? b.booking_date.substring(0, 10) : new Date(b.booking_date).toISOString().substring(0, 10);

    // Notify waitlist
    await notifyNextInWaitlist(b.seat_id, b.slot_id, dateStr);

    const updated = await query<any[]>(`${BOOKING_SELECT_SQL} WHERE b.id = ?`, [id]);
    const mapped = mapBookingRow(updated[0]);
    emitSeatUpdated(b.library_id, b.seat_id, b.slot_id, dateStr, 'AVAILABLE');
    emitBookingUpdated(b.library_id, mapped);
    sendSuccess(res, mapped);
  } catch (err) {
    next(err);
  }
});

// POST /bookings/:id/confirm-arrival
bookingsRouter.post('/:id/confirm-arrival', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { coming } = req.body;

    const rows = await query<any[]>(`${BOOKING_SELECT_SQL} WHERE b.id = ?`, [id]);
    if (rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Booking not found', 404);
    }

    const b = rows[0];
    if (b.user_id !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied', 403);
    }

    const dateStr = typeof b.booking_date === 'string' ? b.booking_date.substring(0, 10) : new Date(b.booking_date).toISOString().substring(0, 10);

    if (coming === false) {
      // User tapped "not coming" -> directly cancel and release seat
      await query(
        `UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = ?`,
        [id]
      );
      await notifyNextInWaitlist(b.seat_id, b.slot_id, dateStr);
      const updated = await query<any[]>(`${BOOKING_SELECT_SQL} WHERE b.id = ?`, [id]);
      const mapped = mapBookingRow(updated[0]);
      emitSeatUpdated(b.library_id, b.seat_id, b.slot_id, dateStr, 'AVAILABLE');
      emitBookingUpdated(b.library_id, mapped);
      emitBookingReleased(userId, {
        bookingId: b.id,
        reason: 'CANCELLED',
        message: 'Your booking was cancelled as you indicated you are not coming.',
      });

      try {
        await createNotification({
          userId,
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled & Seat Released',
          body: `Your booking for seat ${b.seat_label} at ${b.library_name} was cancelled as requested and the seat has been released.`,
          data: { bookingId: b.id, seatLabel: b.seat_label, libraryName: b.library_name },
        });
      } catch (notifErr) {
        console.warn('[Bookings] Could not deliver cancellation notification:', notifErr);
      }

      return sendSuccess(res, mapped);
    }

    // coming === true -> 15 minutes buffer wait time granted irrespective of slot hours
    if (b.arrival_confirmed) {
      return sendError(res, 'BAD_REQUEST', 'Arrival buffer has already been confirmed for this booking', 409);
    }

    if (b.status !== 'CONFIRMED') {
      return sendError(res, 'BAD_REQUEST', `Cannot extend grace for booking with status ${b.status}`, 400);
    }

    await query(
      `UPDATE bookings
       SET grace_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE),
           arrival_confirmed = 1
       WHERE id = ?`,
      [id]
    );

    try {
      await createNotification({
        userId,
        type: 'GRACE_EXTENDED',
        title: '15-Minute Buffer Granted',
        body: `You have 15 minutes to arrive and check in for seat ${b.seat_label} at ${b.library_name}. If not checked in within 15 minutes, the slot will be cancelled automatically.`,
        data: { bookingId: b.id, seatLabel: b.seat_label, libraryName: b.library_name },
      });
    } catch (notifErr) {
      console.warn('[Bookings] Could not deliver grace notification:', notifErr);
    }

    const updated = await query<any[]>(`${BOOKING_SELECT_SQL} WHERE b.id = ?`, [id]);
    const mapped = mapBookingRow(updated[0]);
    emitBookingUpdated(b.library_id, mapped);
    sendSuccess(res, mapped);
  } catch (err) {
    next(err);
  }
});
