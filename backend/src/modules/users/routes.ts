import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/db';
import { sendSuccess } from '../../utils/response';
import { mapBookingRow } from '../bookings/routes';

export const usersRouter = Router();

// GET /users/me/dashboard
usersRouter.get('/me/dashboard', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Upcoming booking
    const upcomingRows = await query<any[]>(
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
      WHERE b.user_id = ? AND b.booking_date >= CURRENT_DATE AND b.status IN ('CONFIRMED', 'CHECKED_IN')
      ORDER BY b.booking_date ASC, sl.start_time ASC
      LIMIT 1`,
      [userId]
    );

    const upcomingBooking = upcomingRows.length > 0 ? mapBookingRow(upcomingRows[0]) : undefined;

    // Preferred seat
    const prefSeatRows = await query<any[]>(
      `SELECT b.seat_id, COUNT(*) as times_booked,
              l.id as library_id, l.name as library_name,
              s.label as seat_label, s.seat_type, s.facing, s.attr_window, s.attr_power_outlet,
              s.attr_quiet_zone, s.attr_near_door, s.group_capacity, s.floor_id
       FROM bookings b
       JOIN seats s ON s.id = b.seat_id
       JOIN libraries l ON l.id = b.library_id
       WHERE b.user_id = ? AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
       GROUP BY b.seat_id, l.id, l.name, s.label, s.seat_type, s.facing, s.attr_window, s.attr_power_outlet, s.attr_quiet_zone, s.attr_near_door, s.group_capacity, s.floor_id
       ORDER BY times_booked DESC
       LIMIT 1`,
      [userId]
    );

    let preferredSeat: any = undefined;
    if (prefSeatRows.length > 0) {
      const ps = prefSeatRows[0];
      preferredSeat = {
        libraryId: ps.library_id,
        libraryName: ps.library_name,
        timesBooked: Number(ps.times_booked),
        seat: {
          id: ps.seat_id,
          floorId: ps.floor_id,
          label: ps.seat_label,
          seatType: ps.seat_type,
          facing: ps.facing,
          attributes: {
            window: Boolean(ps.attr_window),
            powerOutlet: Boolean(ps.attr_power_outlet),
            quietZone: Boolean(ps.attr_quiet_zone),
            nearDoor: Boolean(ps.attr_near_door),
          },
          isActive: true,
          groupCapacity: ps.group_capacity || undefined,
        },
      };
    }

    // Booking counts
    const countRows = await query<any[]>(
      `SELECT COUNT(*) as total_bookings FROM bookings WHERE user_id = ?`,
      [userId]
    );
    const totalBookings = Number(countRows[0]?.total_bookings || 0);

    // Study focus hours
    const focusRows = await query<any[]>(
      `SELECT COALESCE(SUM(focus_seconds), 0) as total_focus_seconds FROM study_sessions WHERE user_id = ?`,
      [userId]
    );
    const totalFocusSeconds = Number(focusRows[0]?.total_focus_seconds || 0);
    const totalFocusHours = Math.round((totalFocusSeconds / 3600) * 10) / 10;

    // Study streak
    const dateRows = await query<any[]>(
      `SELECT DISTINCT DATE(started_at) as study_date
       FROM study_sessions
       WHERE user_id = ?
       ORDER BY study_date DESC`,
      [userId]
    );

    let currentStreakDays = 0;
    let longestStreakDays = 0;

    if (dateRows.length > 0) {
      const dates = dateRows.map((r) => {
        const d = new Date(r.study_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Check if user studied today or yesterday for current streak
      let lastDate = today.getTime();
      if (dates[0] === today.getTime() || dates[0] === today.getTime() - oneDayMs) {
        lastDate = dates[0];
        currentStreakDays = 1;
        for (let i = 1; i < dates.length; i++) {
          if (dates[i] === lastDate - oneDayMs) {
            currentStreakDays++;
            lastDate = dates[i];
          } else {
            break;
          }
        }
      }

      // Compute longest streak
      let tempStreak = 1;
      longestStreakDays = 1;
      for (let i = 1; i < dates.length; i++) {
        if (dates[i] === dates[i - 1] - oneDayMs) {
          tempStreak++;
          if (tempStreak > longestStreakDays) longestStreakDays = tempStreak;
        } else {
          tempStreak = 1;
        }
      }
      if (currentStreakDays > longestStreakDays) {
        longestStreakDays = currentStreakDays;
      }
    }

    sendSuccess(res, {
      upcomingBooking,
      preferredSeat,
      stats: {
        totalBookings,
        totalFocusHours,
        currentStreakDays,
        longestStreakDays,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /users/me/preferences
usersRouter.get('/me/preferences', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const rows = await query<any[]>(`SELECT * FROM user_preferences WHERE user_id = ?`, [userId]);

    if (rows.length === 0) {
      return sendSuccess(res, {
        seatType: 'INDIVIDUAL',
        window: true,
        powerOutlet: true,
        quietZone: true,
        studyMode: 'SOLO',
        preferredSlot: 'MORNING',
      });
    }

    const p = rows[0];
    sendSuccess(res, {
      seatType: p.seat_type,
      window: Boolean(p.window),
      powerOutlet: Boolean(p.power_outlet),
      quietZone: Boolean(p.quiet_zone),
      studyMode: p.study_mode,
      preferredSlot: p.preferred_slot,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /users/me/preferences
usersRouter.put('/me/preferences', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { seatType, window: win, powerOutlet, quietZone, studyMode, preferredSlot } = req.body;

    await query(
      `INSERT INTO user_preferences (user_id, seat_type, \`window\`, power_outlet, quiet_zone, study_mode, preferred_slot, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         seat_type = COALESCE(?, seat_type),
         \`window\` = COALESCE(?, \`window\`),
         power_outlet = COALESCE(?, power_outlet),
         quiet_zone = COALESCE(?, quiet_zone),
         study_mode = COALESCE(?, study_mode),
         preferred_slot = COALESCE(?, preferred_slot),
         updated_at = NOW()`,
      [
        userId,
        seatType || 'INDIVIDUAL',
        win !== undefined ? (win ? 1 : 0) : 1,
        powerOutlet !== undefined ? (powerOutlet ? 1 : 0) : 1,
        quietZone !== undefined ? (quietZone ? 1 : 0) : 1,
        studyMode || 'SOLO',
        preferredSlot || 'MORNING',
        seatType,
        win !== undefined ? (win ? 1 : 0) : null,
        powerOutlet !== undefined ? (powerOutlet ? 1 : 0) : null,
        quietZone !== undefined ? (quietZone ? 1 : 0) : null,
        studyMode,
        preferredSlot,
      ]
    );

    const rows = await query<any[]>(`SELECT * FROM user_preferences WHERE user_id = ?`, [userId]);
    const p = rows[0];

    sendSuccess(res, {
      seatType: p.seat_type,
      window: Boolean(p.window),
      powerOutlet: Boolean(p.power_outlet),
      quietZone: Boolean(p.quiet_zone),
      studyMode: p.study_mode,
      preferredSlot: p.preferred_slot,
    });
  } catch (err) {
    next(err);
  }
});
