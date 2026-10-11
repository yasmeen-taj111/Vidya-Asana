import { Router } from 'express';
import { optionalAuth, authenticate } from '../../middleware/auth';
import { query } from '../../config/db';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { mapLibraryRow } from '../owner/routes';
import { calculateHaversineDistance, scoreLibrary, scoreSeat } from '../../utils/scoring';
import { ensureLibraryDefaults } from '../library/initLibrary';

export const discoveryRouter = Router();

// GET /libraries
discoveryRouter.get('/libraries', async (req, res, next) => {
  try {
    const { q, lat, lng, isFree, seatType, page = 1, pageSize = 20 } = req.query;

    let sql = `
      SELECT l.*,
        (SELECT COUNT(*) FROM floors f WHERE f.library_id = l.id) as floor_count,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.is_active = 1) as total_seats,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'INDIVIDUAL' AND s.is_active = 1) as count_individual,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'GROUP' AND s.is_active = 1) as count_group,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'ACCESSIBLE' AND s.is_active = 1) as count_accessible,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'COMPUTER' AND s.is_active = 1) as count_computer
      FROM libraries l WHERE l.status != 'REJECTED'
    `;
    const params: any[] = [];

    if (q) {
      sql += ' AND (l.name LIKE ? OR l.city LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (isFree === 'true') {
      sql += ' AND l.is_free = 1';
    } else if (isFree === 'false') {
      sql += ' AND l.is_free = 0';
    }

    const rows = await query(sql, params);
    let libraries = rows.map(mapLibraryRow);

    if (seatType) {
      libraries = libraries.filter((lib) => (lib.seatCounts as any)[seatType as string] > 0);
    }

    if (lat && lng) {
      const uLat = parseFloat(lat as string);
      const uLng = parseFloat(lng as string);
      libraries.forEach((lib) => {
        lib.distanceKm = calculateHaversineDistance(uLat, uLng, lib.latitude, lib.longitude);
      });
      libraries.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    sendSuccess(res, libraries, { page: Number(page), pageSize: Number(pageSize), total: libraries.length });
  } catch (err) {
    next(err);
  }
});

// GET /recommendations/libraries
discoveryRouter.get('/recommendations/libraries', optionalAuth, async (req, res, next) => {
  try {
    const { lat, lng, isFree } = req.query;
    let recSql = `
      SELECT l.*,
        (SELECT COUNT(*) FROM floors f WHERE f.library_id = l.id) as floor_count,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.is_active = 1) as total_seats,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'INDIVIDUAL' AND s.is_active = 1) as count_individual,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'GROUP' AND s.is_active = 1) as count_group,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'ACCESSIBLE' AND s.is_active = 1) as count_accessible,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'COMPUTER' AND s.is_active = 1) as count_computer
      FROM libraries l WHERE l.status != 'REJECTED'
    `;
    if (isFree === 'true') {
      recSql += ' AND l.is_free = 1';
    } else if (isFree === 'false') {
      recSql += ' AND l.is_free = 0';
    }
    const rows = await query(recSql);

    const libraries = rows.map(mapLibraryRow);
    const uLat = lat ? parseFloat(lat as string) : 12.9716;
    const uLng = lng ? parseFloat(lng as string) : 77.5946;

    libraries.forEach((lib) => {
      const dist = calculateHaversineDistance(uLat, uLng, lib.latitude, lib.longitude);
      lib.distanceKm = dist;
      lib.matchScore = scoreLibrary(dist, lib.amenities, lib.isFree);
    });

    libraries.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    sendSuccess(res, libraries);
  } catch (err) {
    next(err);
  }
});

// GET /libraries/:id
discoveryRouter.get('/libraries/:id', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT l.*,
        (SELECT COUNT(*) FROM floors f WHERE f.library_id = l.id) as floor_count,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.is_active = 1) as total_seats,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'INDIVIDUAL' AND s.is_active = 1) as count_individual,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'GROUP' AND s.is_active = 1) as count_group,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'ACCESSIBLE' AND s.is_active = 1) as count_accessible,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'COMPUTER' AND s.is_active = 1) as count_computer
      FROM libraries l WHERE l.id = ?
    `, [req.params.id]);

    if (rows.length === 0) throw new AppError('NOT_FOUND', 'Library not found', 404);
    sendSuccess(res, mapLibraryRow(rows[0]));
  } catch (err) {
    next(err);
  }
});

// GET /libraries/:id/slots
discoveryRouter.get('/libraries/:id/slots', async (req, res, next) => {
  try {
    await ensureLibraryDefaults(req.params.id);
    const slots = await query('SELECT * FROM time_slots WHERE library_id = ? AND is_active = 1 ORDER BY start_time ASC', [req.params.id]);
    sendSuccess(res, slots.map((s) => ({
      id: s.id,
      libraryId: s.library_id,
      name: s.name,
      startTime: s.start_time,
      endTime: s.end_time,
      isFree: !!s.is_free,
      pricePaise: s.price_paise,
      isActive: !!s.is_active,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /libraries/:id/floors
discoveryRouter.get('/libraries/:id/floors', async (req, res, next) => {
  try {
    await ensureLibraryDefaults(req.params.id);
    const floors = await query('SELECT id, floor_number as floorNumber, label, `rows`, `cols` FROM floors WHERE library_id = ? ORDER BY floor_number ASC', [req.params.id]);
    sendSuccess(res, floors);
  } catch (err) {
    next(err);
  }
});

// GET /libraries/:id/intervals?date=
discoveryRouter.get('/libraries/:id/intervals', async (req, res, next) => {
  try {
    const { date } = req.query;
    let sql = 'SELECT * FROM library_unbookable_intervals WHERE library_id = ?';
    const params: any[] = [req.params.id];
    if (date) {
      sql += ' AND (date IS NULL OR date = ?)';
      params.push(date);
    }
    sql += ' ORDER BY start_time ASC';
    const rows = await query<any[]>(sql, params);
    sendSuccess(
      res,
      rows.map((r) => ({
        id: r.id,
        libraryId: r.library_id,
        date: r.date ? (typeof r.date === 'string' ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10)) : null,
        startTime: r.start_time,
        endTime: r.end_time,
        reason: r.reason,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// GET /libraries/:id/floors/:floorId/grid?date=&slotId=&startTime=&endTime=
discoveryRouter.get('/libraries/:id/floors/:floorId/grid', optionalAuth, async (req, res, next) => {
  try {
    const { date, slotId, startTime, endTime } = req.query as {
      date?: string;
      slotId?: string;
      startTime?: string;
      endTime?: string;
    };
    const [floor] = await query('SELECT * FROM floors WHERE id = ? AND library_id = ?', [req.params.floorId, req.params.id]);
    if (!floor) throw new AppError('NOT_FOUND', 'Floor not found', 404);

    const seatRows = await query('SELECT * FROM seats WHERE floor_id = ?', [req.params.floorId]);
    const cellRows = await query('SELECT * FROM floor_cells WHERE floor_id = ?', [req.params.floorId]);

    // Active bookings for status computation
    let activeBookings: any[] = [];
    let heldWaitlist: any[] = [];
    let isClosed = false;
    let closureReason = '';

    if (date && (startTime && endTime)) {
      const closures = await query<any[]>(
        'SELECT reason FROM library_unbookable_intervals WHERE library_id = ? AND (date IS NULL OR date = ?) AND (start_time < ? AND end_time > ?)',
        [req.params.id, date, endTime, startTime]
      );
      if (closures.length > 0) {
        isClosed = true;
        closureReason = closures[0].reason;
      }

      activeBookings = await query(
        `SELECT b.seat_id, b.user_id, b.status
         FROM bookings b
         JOIN time_slots ts ON ts.id = b.slot_id
         WHERE b.library_id = ? AND b.booking_date = ? AND b.status IN ("CONFIRMED", "CHECKED_IN")
           AND (ts.start_time < ? AND ts.end_time > ?)`,
        [req.params.id, date, endTime, startTime]
      );
    } else if (date && slotId) {
      activeBookings = await query(
        'SELECT seat_id, user_id, status FROM bookings WHERE library_id = ? AND slot_id = ? AND booking_date = ? AND status IN ("CONFIRMED", "CHECKED_IN")',
        [req.params.id, slotId, date]
      );
      heldWaitlist = await query(
        'SELECT seat_id FROM waitlist_entries WHERE slot_id = ? AND booking_date = ? AND status = "NOTIFIED" AND claim_expires_at > UTC_TIMESTAMP()',
        [slotId, date]
      );
    }

    const currentUserId = req.user?.id;
    const cells: any[] = [];

    for (let r = 0; r < floor.rows; r++) {
      for (let c = 0; c < floor.cols; c++) {
        const seat = seatRows.find((s) => s.grid_row === r && s.grid_col === c);
        if (seat) {
          let status = 'AVAILABLE';
          if (!seat.is_active || isClosed) {
            status = 'MAINTENANCE';
          } else if (date && (slotId || (startTime && endTime))) {
            const booking = activeBookings.find((b) => b.seat_id === seat.id);
            if (booking) {
              status = currentUserId && booking.user_id === currentUserId ? 'YOURS' : 'BOOKED';
            } else if (heldWaitlist.some((w) => w.seat_id === seat.id)) {
              status = 'HELD';
            }
          }

          cells.push({
            row: r,
            col: c,
            type: 'SEAT',
            seat: {
              id: seat.id,
              floorId: seat.floor_id,
              label: seat.label,
              seatType: seat.seat_type,
              facing: seat.facing,
              attributes: {
                window: !!seat.attr_window,
                powerOutlet: !!seat.attr_power_outlet,
                quietZone: !!seat.attr_quiet_zone,
                nearDoor: !!seat.attr_near_door,
              },
              isActive: !!seat.is_active,
              groupCapacity: seat.group_capacity || undefined,
            },
            status,
          });
          continue;
        }

        const cell = cellRows.find((fc) => fc.row === r && fc.col === c);
        cells.push({
          row: r,
          col: c,
          type: cell ? cell.cell_type : 'EMPTY',
        });
      }
    }

    sendSuccess(res, {
      floorId: floor.id,
      floorNumber: floor.floor_number,
      label: floor.label,
      rows: floor.rows,
      cols: floor.cols,
      cells,
    });
  } catch (err) {
    next(err);
  }
});

// POST /libraries/:id/suggest-seats
discoveryRouter.post('/libraries/:id/suggest-seats', optionalAuth, async (req, res, next) => {
  try {
    const { date, slotId, preferences = {} } = req.body;
    const libraryId = req.params.id;

    let userPrefs = { ...preferences };
    if (Object.keys(userPrefs).length === 0 && req.user?.id) {
      const prefRows = await query<any[]>(
        `SELECT * FROM user_preferences WHERE user_id = ?`,
        [req.user.id]
      );
      if (prefRows.length > 0) {
        userPrefs = {
          seatType: prefRows[0].seat_type,
          window: Boolean(prefRows[0].window),
          powerOutlet: Boolean(prefRows[0].power_outlet),
          quietZone: Boolean(prefRows[0].quiet_zone),
          preferredSlot: prefRows[0].preferred_slot,
        };
      }
    }

    // Get available seats for that date & slot
    const seats = await query(`
      SELECT s.*, f.label as floor_label FROM seats s
      JOIN floors f ON s.floor_id = f.id
      WHERE s.library_id = ? AND s.is_active = 1
      AND s.id NOT IN (
        SELECT seat_id FROM bookings
        WHERE library_id = ? AND slot_id = ? AND booking_date = ? AND status IN ("CONFIRMED", "CHECKED_IN")
      )
    `, [libraryId, libraryId, slotId, date]);

    const scored = seats.map((s) => {
      const candidate = {
        id: s.id,
        floorId: s.floor_id,
        label: s.label,
        seatType: s.seat_type,
        facing: s.facing,
        attributes: {
          window: !!s.attr_window,
          powerOutlet: !!s.attr_power_outlet,
          quietZone: !!s.attr_quiet_zone,
          nearDoor: !!s.attr_near_door,
        },
      };
      const result = scoreSeat(candidate, userPrefs);
      return {
        seat: candidate,
        floorLabel: s.floor_label,
        score: result.score,
        reasons: result.reasons,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const suggestions = scored.slice(0, 5);

    sendSuccess(res, { suggestions });
  } catch (err) {
    next(err);
  }
});
