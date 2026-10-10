import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole, requireApprovedLibrary } from '../../middleware/rbac';
import { pool, query, execute, withTransaction } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { walkInLimiter } from '../../middleware/rateLimit';
import { AppError } from '../../utils/errors';
import { mapLibraryRow } from '../owner/routes';
import { generateUUID, generateBookingCode } from '../../utils/ids';
import { verifyQrToken } from '../../utils/qr';
import { notifyNextInWaitlist } from '../waitlist/service';
import { emitSeatUpdated, emitBookingCheckedIn, emitBookingUpdated, emitBookingReleased } from '../../realtime/socket';
import { createNotification } from '../notifications/service';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('LIBRARY_ADMIN'), requireApprovedLibrary);

// GET /admin/library
adminRouter.get('/library', async (req, res, next) => {
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
    `, [req.user!.libraryId]);

    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Library not found', 404);
    }

    sendSuccess(res, mapLibraryRow(rows[0]));
  } catch (err) {
    next(err);
  }
});

// PUT /admin/library
adminRouter.put('/library', async (req, res, next) => {
  try {
    const b = req.body;
    await execute(
      `UPDATE libraries SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        has_lockers = COALESCE(?, has_lockers),
        has_cctv = COALESCE(?, has_cctv),
        has_ac = COALESCE(?, has_ac),
        has_wifi = COALESCE(?, has_wifi),
        has_power_outlets = COALESCE(?, has_power_outlets),
        is_free = COALESCE(?, is_free)
      WHERE id = ?`,
      [
        b.name,
        b.description,
        b.address,
        b.city,
        b.amenities?.lockers,
        b.amenities?.cctv,
        b.amenities?.ac,
        b.amenities?.wifi,
        b.amenities?.powerOutlets,
        b.isFree,
        req.user!.libraryId,
      ]
    );

    const updated = await query('SELECT * FROM libraries WHERE id = ?', [req.user!.libraryId]);
    sendSuccess(res, mapLibraryRow(updated[0]));
  } catch (err) {
    next(err);
  }
});

// POST /admin/library/grid/generate
adminRouter.post('/library/grid/generate', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { floors } = req.body as {
      floors: Array<{
        floorNumber: number;
        label: string;
        rows: number;
        cols: number;
        counts: Record<string, number>;
      }>;
    };

    if (!floors || !Array.isArray(floors)) {
      throw new AppError('BAD_REQUEST', 'Floors array required', 400);
    }

    // Validate capacity
    for (const f of floors) {
      const sumSeats = Object.values(f.counts || {}).reduce((a, b) => a + b, 0);
      if (sumSeats > f.rows * f.cols) {
        throw new AppError(
          'VALIDATION_ERROR',
          `Total seats (${sumSeats}) exceeds floor capacity (${f.rows * f.cols})`,
          422,
          { fields: { counts: 'Total seats exceeds floor grid cells' } }
        );
      }
    }

    const libraryId = req.user!.libraryId!;

    // Check future active bookings
    const [futureBookings] = await conn.query(
      'SELECT id FROM bookings WHERE library_id = ? AND status IN ("CONFIRMED", "CHECKED_IN") AND booking_date >= CURDATE()',
      [libraryId]
    );
    if ((futureBookings as any[]).length > 0) {
      throw new AppError('BAD_REQUEST', 'Cannot regenerate grid while active future reservations exist', 409);
    }

    // Clean up dependent records that reference seats/floors for this library
    // (bookings and waitlist FK constraints don't cascade on seat delete)
    await conn.query(
      'DELETE w FROM waitlist_entries w INNER JOIN seats s ON w.seat_id = s.id WHERE s.library_id = ?',
      [libraryId]
    );
    await conn.query('DELETE FROM bookings WHERE library_id = ?', [libraryId]);

    // Clear old floors and layout for this library (cascades to seats and floor_cells)
    await conn.query('DELETE FROM floors WHERE library_id = ?', [libraryId]);

    const resultGrids: any[] = [];

    for (const f of floors) {
      const floorId = generateUUID();
      await conn.query(
        'INSERT INTO floors (id, library_id, floor_number, label, `rows`, `cols`) VALUES (?, ?, ?, ?, ?, ?)',
        [floorId, libraryId, f.floorNumber, f.label, f.rows, f.cols]
      );

      const cells: any[] = [];
      let seatIdx = 1;

      // Plan layout: aisles, door at bottom-left, computer in first row
      const counts = { ...f.counts };

      for (let r = 0; r < f.rows; r++) {
        for (let c = 0; c < f.cols; c++) {
          if (c === 2 && f.cols > 4) {
            await conn.query(
              'INSERT INTO floor_cells (id, floor_id, `row`, `col`, cell_type) VALUES (?, ?, ?, ?, ?)',
              [generateUUID(), floorId, r, c, 'AISLE']
            );
            cells.push({ row: r, col: c, type: 'AISLE' });
            continue;
          }
          if (r === f.rows - 1 && c === 0) {
            await conn.query(
              'INSERT INTO floor_cells (id, floor_id, `row`, `col`, cell_type) VALUES (?, ?, ?, ?, ?)',
              [generateUUID(), floorId, r, c, 'DOOR']
            );
            cells.push({ row: r, col: c, type: 'DOOR' });
            continue;
          }

          let seatType = 'INDIVIDUAL';
          if (counts.COMPUTER && counts.COMPUTER > 0) {
            seatType = 'COMPUTER';
            counts.COMPUTER--;
          } else if (counts.GROUP && counts.GROUP > 0) {
            seatType = 'GROUP';
            counts.GROUP--;
          } else if (counts.ACCESSIBLE && counts.ACCESSIBLE > 0) {
            seatType = 'ACCESSIBLE';
            counts.ACCESSIBLE--;
          } else if (counts.INDIVIDUAL && counts.INDIVIDUAL > 0) {
            seatType = 'INDIVIDUAL';
            counts.INDIVIDUAL--;
          } else {
            // Empty cell
            await conn.query(
              'INSERT INTO floor_cells (id, floor_id, `row`, `col`, cell_type) VALUES (?, ?, ?, ?, ?)',
              [generateUUID(), floorId, r, c, 'EMPTY']
            );
            cells.push({ row: r, col: c, type: 'EMPTY' });
            continue;
          }

          const isWindow = c === 0 || c === f.cols - 1;
          const seatId = generateUUID();
          const label = `F${f.floorNumber}-${String.fromCharCode(65 + r)}${c + 1}`;

          await conn.query(
            `INSERT INTO seats (
              id, floor_id, library_id, label, seat_type, facing,
              attr_window, attr_power_outlet, attr_quiet_zone, attr_near_door,
              group_capacity, is_active, grid_row, grid_col
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              seatId,
              floorId,
              libraryId,
              label,
              seatType,
              r % 2 === 0 ? 'N' : 'S',
              isWindow ? 1 : 0,
              seatType === 'COMPUTER' || r < 3 ? 1 : 0,
              r < 2 ? 1 : 0,
              r >= f.rows - 2 ? 1 : 0,
              seatType === 'GROUP' ? 4 : null,
              r,
              c,
            ]
          );

          cells.push({
            row: r,
            col: c,
            type: 'SEAT',
            seat: {
              id: seatId,
              floorId,
              label,
              seatType,
              facing: r % 2 === 0 ? 'N' : 'S',
              attributes: {
                window: isWindow,
                powerOutlet: seatType === 'COMPUTER' || r < 3,
                quietZone: r < 2,
                nearDoor: r >= f.rows - 2,
              },
              isActive: true,
              groupCapacity: seatType === 'GROUP' ? 4 : undefined,
            },
          });
          seatIdx++;
        }
      }

      resultGrids.push({
        floorId,
        floorNumber: f.floorNumber,
        label: f.label,
        rows: f.rows,
        cols: f.cols,
        cells,
      });
    }

    await conn.commit();
    sendSuccess(res, resultGrids);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// POST /admin/floors
adminRouter.post('/floors', async (req, res, next) => {
  try {
    const { floorNumber, label, rows, cols } = req.body;
    if (floorNumber === undefined || !label || !rows || !cols) {
      throw new AppError('BAD_REQUEST', 'Missing required fields', 400);
    }
    
    const floorId = generateUUID();
    const libraryId = req.user!.libraryId!;
    
    await query(
      'INSERT INTO floors (id, library_id, floor_number, label, `rows`, `cols`) VALUES (?, ?, ?, ?, ?, ?)',
      [floorId, libraryId, floorNumber, label, rows, cols]
    );
    
    sendSuccess(res, { id: floorId, floorNumber, label, rows, cols }, undefined, 201);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      next(new AppError('BAD_REQUEST', `Floor number ${req.body.floorNumber} already exists.`, 409));
    } else {
      next(err);
    }
  }
});

// DELETE /admin/floors/:floorId
adminRouter.delete('/floors/:floorId', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const libraryId = req.user!.libraryId!;
    const { floorId } = req.params;

    // Verify floor belongs to this library
    const rows = await query(
      'SELECT id FROM floors WHERE id = ? AND library_id = ?',
      [floorId, libraryId]
    );
    if ((rows as any[]).length === 0) {
      throw new AppError('NOT_FOUND', 'Floor not found', 404);
    }

    // Clean up bookings and waitlist referencing seats on this floor
    await conn.query(
      'DELETE b FROM bookings b INNER JOIN seats s ON b.seat_id = s.id WHERE s.floor_id = ?',
      [floorId]
    );
    await conn.query(
      'DELETE w FROM waitlist_entries w INNER JOIN seats s ON w.seat_id = s.id WHERE s.floor_id = ?',
      [floorId]
    );

    // Delete floor (cascades to seats and floor_cells)
    await conn.query('DELETE FROM floors WHERE id = ?', [floorId]);

    await conn.commit();
    sendSuccess(res, { deleted: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// GET /admin/floors
adminRouter.get('/floors', async (req, res, next) => {
  try {
    const floors = await query(
      'SELECT id, floor_number as floorNumber, label, `rows`, `cols` FROM floors WHERE library_id = ? ORDER BY floor_number ASC',
      [req.user!.libraryId]
    );
    sendSuccess(res, floors);
  } catch (err) {
    next(err);
  }
});

// GET /admin/floors/:floorId/grid
adminRouter.get('/floors/:floorId/grid', async (req, res, next) => {
  try {
    const [floor] = await query('SELECT * FROM floors WHERE id = ? AND library_id = ?', [req.params.floorId, req.user!.libraryId]);
    if (!floor) throw new AppError('NOT_FOUND', 'Floor not found', 404);

    const seatRows = await query('SELECT * FROM seats WHERE floor_id = ?', [req.params.floorId]);
    const cellRows = await query('SELECT * FROM floor_cells WHERE floor_id = ?', [req.params.floorId]);

    const cells: any[] = [];
    for (let r = 0; r < floor.rows; r++) {
      for (let c = 0; c < floor.cols; c++) {
        const seat = seatRows.find((s) => s.grid_row === r && s.grid_col === c);
        if (seat) {
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

// PUT /admin/floors/:floorId/layout
adminRouter.put('/floors/:floorId/layout', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { rows, cols, cells } = req.body;
    const floorId = req.params.floorId;

    const [floor] = (await conn.query('SELECT * FROM floors WHERE id = ? AND library_id = ?', [floorId, req.user!.libraryId])) as any[];
    if (floor.length === 0) throw new AppError('NOT_FOUND', 'Floor not found', 404);

    // Update dimensions
    await conn.query('UPDATE floors SET `rows` = ?, `cols` = ? WHERE id = ?', [rows, cols, floorId]);

    // 1. Identify which seats were removed in the new layout
    const [existingSeats] = (await conn.query('SELECT id, label FROM seats WHERE floor_id = ?', [floorId])) as any[];
    const keptSeatIds = new Set(cells.filter((c: any) => c.type === 'SEAT' && c.seat?.id).map((c: any) => c.seat.id));
    const seatsToDelete = (existingSeats as any[]).filter((es: any) => !keptSeatIds.has(es.id));

    // 2. Prevent deleting seats that have active upcoming reservations
    for (const ds of seatsToDelete) {
      const [futureB] = (await conn.query(
        'SELECT id FROM bookings WHERE seat_id = ? AND status IN ("CONFIRMED", "CHECKED_IN") AND booking_date >= CURDATE()',
        [ds.id]
      )) as any[];
      if (futureB.length > 0) {
        throw new AppError(
          'BAD_REQUEST',
          `Cannot delete seat ${ds.label}: has active upcoming reservations. Please reassign or cancel those reservations first.`,
          409,
          { details: { seatId: ds.id, label: ds.label } }
        );
      }
    }

    // 3. Clean up deleted seats (safely removing bookings and waitlist references so foreign keys don't fail)
    if (seatsToDelete.length > 0) {
      const delIds = seatsToDelete.map((s: any) => s.id);
      await conn.query('DELETE FROM bookings WHERE seat_id IN (?)', [delIds]);
      await conn.query('DELETE FROM waitlist_entries WHERE seat_id IN (?)', [delIds]);
      await conn.query('DELETE FROM seats WHERE id IN (?)', [delIds]);
    }

    // 4. Replace floor cells
    await conn.query('DELETE FROM floor_cells WHERE floor_id = ?', [floorId]);

    const resultCells: any[] = [];

    // 5. Upsert seats and insert floor cells
    for (const c of cells) {
      if (c.type === 'SEAT' && c.seat) {
        const seatId = c.seat.id || generateUUID();
        await conn.query(
          `INSERT INTO seats (
            id, floor_id, library_id, label, seat_type, facing,
            attr_window, attr_power_outlet, attr_quiet_zone, attr_near_door,
            group_capacity, is_active, grid_row, grid_col
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            seat_type = VALUES(seat_type),
            facing = VALUES(facing),
            attr_window = VALUES(attr_window),
            attr_power_outlet = VALUES(attr_power_outlet),
            attr_quiet_zone = VALUES(attr_quiet_zone),
            attr_near_door = VALUES(attr_near_door),
            group_capacity = VALUES(group_capacity),
            is_active = VALUES(is_active),
            grid_row = VALUES(grid_row),
            grid_col = VALUES(grid_col)`,
          [
            seatId,
            floorId,
            req.user!.libraryId,
            c.seat.label,
            c.seat.seatType,
            c.seat.facing || 'N',
            c.seat.attributes?.window ? 1 : 0,
            c.seat.attributes?.powerOutlet ? 1 : 0,
            c.seat.attributes?.quietZone ? 1 : 0,
            c.seat.attributes?.nearDoor ? 1 : 0,
            c.seat.groupCapacity || null,
            c.seat.isActive !== false ? 1 : 0,
            c.row,
            c.col,
          ]
        );
        resultCells.push({
          row: c.row,
          col: c.col,
          type: 'SEAT',
          seat: { ...c.seat, id: seatId, floorId },
        });
      } else {
        await conn.query(
          'INSERT INTO floor_cells (id, floor_id, `row`, `col`, cell_type) VALUES (?, ?, ?, ?, ?)',
          [generateUUID(), floorId, c.row, c.col, c.type || 'EMPTY']
        );
        resultCells.push({ row: c.row, col: c.col, type: c.type || 'EMPTY' });
      }
    }

    await conn.commit();
    sendSuccess(res, {
      floorId,
      floorNumber: floor[0].floor_number,
      label: floor[0].label,
      rows,
      cols,
      cells: resultCells,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// PATCH /admin/seats/:seatId
adminRouter.patch('/seats/:seatId', async (req, res, next) => {
  try {
    const patch = req.body;
    await execute(
      `UPDATE seats SET
        label = COALESCE(?, label),
        seat_type = COALESCE(?, seat_type),
        facing = COALESCE(?, facing),
        is_active = COALESCE(?, is_active),
        attr_window = COALESCE(?, attr_window),
        attr_power_outlet = COALESCE(?, attr_power_outlet),
        attr_quiet_zone = COALESCE(?, attr_quiet_zone),
        attr_near_door = COALESCE(?, attr_near_door)
      WHERE id = ? AND library_id = ?`,
      [
        patch.label,
        patch.seatType,
        patch.facing,
        patch.isActive,
        patch.attributes?.window,
        patch.attributes?.powerOutlet,
        patch.attributes?.quietZone,
        patch.attributes?.nearDoor,
        req.params.seatId,
        req.user!.libraryId,
      ]
    );

    const [seat] = await query('SELECT * FROM seats WHERE id = ?', [req.params.seatId]);
    sendSuccess(res, {
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
    });
  } catch (err) {
    next(err);
  }
});

// Slots CRUD
adminRouter.get('/slots', async (req, res, next) => {
  try {
    const slots = await query('SELECT * FROM time_slots WHERE library_id = ? ORDER BY start_time ASC', [req.user!.libraryId]);
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

adminRouter.post('/slots', async (req, res, next) => {
  try {
    const b = req.body;
    const id = generateUUID();
    await execute(
      'INSERT INTO time_slots (id, library_id, name, start_time, end_time, is_free, price_paise, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [id, req.user!.libraryId, b.name, b.startTime, b.endTime, b.isFree ? 1 : 0, b.pricePaise || 0]
    );

    sendSuccess(res, {
      id,
      libraryId: req.user!.libraryId,
      name: b.name,
      startTime: b.startTime,
      endTime: b.endTime,
      isFree: !!b.isFree,
      pricePaise: b.pricePaise || 0,
      isActive: true,
    }, undefined, 201);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/slots/:slotId', async (req, res, next) => {
  try {
    const b = req.body;
    await execute(
      `UPDATE time_slots SET
        name = COALESCE(?, name),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        is_free = COALESCE(?, is_free),
        price_paise = COALESCE(?, price_paise)
      WHERE id = ? AND library_id = ?`,
      [b.name, b.startTime, b.endTime, b.isFree !== undefined ? (b.isFree ? 1 : 0) : null, b.pricePaise, req.params.slotId, req.user!.libraryId]
    );
    const [s] = await query('SELECT * FROM time_slots WHERE id = ?', [req.params.slotId]);
    sendSuccess(res, {
      id: s.id,
      libraryId: s.library_id,
      name: s.name,
      startTime: s.start_time,
      endTime: s.end_time,
      isFree: !!s.is_free,
      pricePaise: s.price_paise,
      isActive: !!s.is_active,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/slots/:slotId', async (req, res, next) => {
  try {
    await execute('DELETE FROM time_slots WHERE id = ? AND library_id = ?', [req.params.slotId, req.user!.libraryId]);
    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /admin/bookings
adminRouter.get('/bookings', async (req, res, next) => {
  try {
    const { date, slotId, status, page = 1 } = req.query;
    let sql = `
      SELECT b.*,
        l.name as library_name,
        s.label as seat_label, s.seat_type, s.facing, s.attr_window, s.attr_power_outlet, s.attr_quiet_zone, s.attr_near_door,
        ts.name as slot_name, ts.start_time, ts.end_time, ts.is_free as slot_is_free, ts.price_paise as slot_price,
        f.label as floor_label,
        u.name as user_name
      FROM bookings b
      JOIN libraries l ON b.library_id = l.id
      JOIN seats s ON b.seat_id = s.id
      JOIN time_slots ts ON b.slot_id = ts.id
      JOIN floors f ON s.floor_id = f.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.library_id = ?
    `;
    const params: any[] = [req.user!.libraryId];

    if (date) {
      sql += ' AND b.booking_date = ?';
      params.push(date);
    }
    if (slotId) {
      sql += ' AND b.slot_id = ?';
      params.push(slotId);
    }
    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC';

    const rows = await query(sql, params);
    const bookings = rows.map((r) => ({
      id: r.id,
      code: r.code,
      libraryId: r.library_id,
      libraryName: r.library_name,
      seat: {
        id: r.seat_id,
        floorId: r.floor_id,
        label: r.seat_label,
        seatType: r.seat_type,
        facing: r.facing,
        attributes: {
          window: !!r.attr_window,
          powerOutlet: !!r.attr_power_outlet,
          quietZone: !!r.attr_quiet_zone,
          nearDoor: !!r.attr_near_door,
        },
        isActive: true,
      },
      floorLabel: r.floor_label,
      slot: {
        id: r.slot_id,
        libraryId: r.library_id,
        name: r.slot_name,
        startTime: r.start_time,
        endTime: r.end_time,
        isFree: !!r.slot_is_free,
        pricePaise: r.slot_price,
        isActive: true,
      },
      date: typeof r.booking_date === 'string' ? r.booking_date.split('T')[0] : r.booking_date.toISOString().split('T')[0],
      status: r.status,
      source: r.source,
      userId: r.user_id,
      guestName: r.guest_name || r.user_name || undefined,
      pricePaise: r.price_paise,
      paymentStatus: r.payment_status,
      graceUntil: r.grace_until,
      arrivalConfirmed: !!r.arrival_confirmed,
      checkedInAt: r.checked_in_at,
      cancelledAt: r.cancelled_at,
      createdAt: r.created_at,
    }));

    sendSuccess(res, bookings, { page: Number(page), pageSize: 20, total: bookings.length });
  } catch (err) {
    next(err);
  }
});

// POST /admin/checkin/scan
adminRouter.post('/checkin/scan', async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) throw new AppError('BAD_REQUEST', 'QR Token required', 400);

    const tokenClean = String(qrToken).trim();
    const verified = verifyQrToken(tokenClean);
    let bookingId = '';

    if (verified) {
      if (verified.libraryId !== req.user!.libraryId) {
        throw new AppError('BAD_REQUEST', 'This reservation pass belongs to another library', 400);
      }
      bookingId = verified.bookingId;
    } else {
      // Allow searching by human booking code (case-insensitive) or UUID fallback
      const [byCode] = await query(
        'SELECT id FROM bookings WHERE (UPPER(code) = ? OR id = ?) AND library_id = ?',
        [tokenClean.toUpperCase(), tokenClean, req.user!.libraryId]
      );
      if (byCode) {
        bookingId = byCode.id;
      } else {
        throw new AppError('NOT_FOUND', 'Invalid or unverified reservation pass or code', 404);
      }
    }

    const [bookingRow] = await query(`
      SELECT b.*, l.name as library_name, s.label as seat_label, s.seat_type, s.facing, f.label as floor_label,
             ts.name as slot_name, ts.start_time, ts.end_time, ts.is_free, ts.price_paise,
             u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN libraries l ON b.library_id = l.id
      JOIN seats s ON b.seat_id = s.id
      JOIN floors f ON s.floor_id = f.id
      JOIN time_slots ts ON b.slot_id = ts.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [bookingId]);

    if (!bookingRow) throw new AppError('NOT_FOUND', 'Booking record not found', 404);

    const guestDisplayName = bookingRow.guest_name || bookingRow.user_name || 'Student';

    if (bookingRow.status === 'CHECKED_IN') {
      return sendSuccess(res, {
        booking: {
          id: bookingRow.id,
          code: bookingRow.code,
          seat: { label: bookingRow.seat_label },
          floorLabel: bookingRow.floor_label,
          slot: { name: bookingRow.slot_name, startTime: bookingRow.start_time, endTime: bookingRow.end_time },
          status: 'CHECKED_IN',
          guestName: guestDisplayName,
        },
        result: 'ALREADY_CHECKED_IN',
      });
    }

    if (bookingRow.status !== 'CONFIRMED') {
      throw new AppError('BOOKING_EXPIRED', `Cannot check in booking with status ${bookingRow.status}`, 410);
    }

    await execute('UPDATE bookings SET status = "CHECKED_IN", checked_in_at = NOW(), arrival_confirmed = 1 WHERE id = ?', [bookingId]);

    // Realtime broadcast to library floor grid
    const dateStr = typeof bookingRow.booking_date === 'string'
      ? bookingRow.booking_date.substring(0, 10)
      : new Date(bookingRow.booking_date).toISOString().substring(0, 10);
    emitSeatUpdated(bookingRow.library_id, bookingRow.seat_id, bookingRow.slot_id, dateStr, 'OCCUPIED');
    emitBookingCheckedIn(bookingRow.library_id, { ...bookingRow, status: 'CHECKED_IN' });
    emitBookingUpdated(bookingRow.library_id, { ...bookingRow, status: 'CHECKED_IN' });

    // Notify student of successful check-in
    if (bookingRow.user_id) {
      createNotification({
        userId: bookingRow.user_id,
        type: 'SYSTEM',
        title: 'Checked In Successfully! 🎒',
        body: `Welcome to ${bookingRow.library_name}. Seat ${bookingRow.seat_label} is confirmed and active. Happy studying!`,
        data: { bookingId: bookingRow.id },
      }).catch((e) => console.error('[Notification error on check-in]:', e));
    }

    sendSuccess(res, {
      booking: {
        id: bookingRow.id,
        code: bookingRow.code,
        seat: { label: bookingRow.seat_label },
        floorLabel: bookingRow.floor_label,
        slot: { name: bookingRow.slot_name, startTime: bookingRow.start_time, endTime: bookingRow.end_time },
        status: 'CHECKED_IN',
        guestName: guestDisplayName,
      },
      result: 'CHECKED_IN',
    });
  } catch (err) {
    next(err);
  }
});

// POST /admin/bookings/walk-in (Idempotency-Key)
adminRouter.post('/bookings/walk-in', walkInLimiter, async (req, res, next) => {
  try {
    const { seatId, slotId, date, guestName } = req.body;
    const libraryId = req.user!.libraryId!;

    if (!seatId || !slotId || !date) {
      return sendError(res, 'VALIDATION_ERROR', 'seatId, slotId, and date are required', 422);
    }

    // Execute walk-in reservation within an ACID Transaction
    const walkInRecord = await withTransaction(async (tx) => {
      // 1. Lock seat row FOR UPDATE
      const [seat] = await tx.query<any[]>(
        'SELECT * FROM seats WHERE id = ? AND library_id = ? AND is_active = 1 FOR UPDATE',
        [seatId, libraryId]
      );
      if (!seat) throw new AppError('NOT_FOUND', 'Seat not found or inactive', 404);

      // 2. Lock slot row FOR UPDATE
      const [slot] = await tx.query<any[]>(
        'SELECT * FROM time_slots WHERE id = ? AND library_id = ? AND is_active = 1 FOR UPDATE',
        [slotId, libraryId]
      );
      if (!slot) throw new AppError('NOT_FOUND', 'Time slot not found or inactive', 404);

      // 3. Consistency invariant: Check active conflicting booking FOR UPDATE
      const activeBookings = await tx.query<any[]>(
        `SELECT id FROM bookings
         WHERE seat_id = ? AND slot_id = ? AND booking_date = ?
           AND status IN ('CONFIRMED', 'CHECKED_IN')
         FOR UPDATE`,
        [seatId, slotId, date]
      );
      if (activeBookings.length > 0) {
        throw new AppError('SEAT_UNAVAILABLE', 'This seat is already occupied or reserved for the selected session.', 409);
      }

      const code = generateBookingCode();
      const id = generateUUID();

      // 4. Atomicity: Insert walk-in booking record
      await tx.execute(
        `INSERT INTO bookings (
          id, code, library_id, seat_id, slot_id, guest_name, booking_date,
          status, source, price_paise, payment_status, grace_until, arrival_confirmed, qr_secret, checked_in_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CHECKED_IN', 'WALK_IN', ?, ?, NOW(), 1, ?, NOW(), NOW())`,
        [
          id,
          code,
          libraryId,
          seatId,
          slotId,
          guestName || 'Walk-in Guest',
          date,
          slot.price_paise,
          slot.is_free ? 'FREE' : 'PAID',
          generateUUID(),
        ]
      );

      return {
        id,
        code,
        libraryId,
        seat: { id: seat.id, label: seat.label, seatType: seat.seat_type },
        floorLabel: 'Floor',
        slot: { id: slot.id, name: slot.name, startTime: slot.start_time, endTime: slot.end_time },
        date,
        status: 'CHECKED_IN' as const,
        source: 'WALK_IN' as const,
        guestName: guestName || 'Walk-in Guest',
        pricePaise: slot.price_paise,
      };
    });

    // Durability & Side effects: Transaction committed successfully
    emitSeatUpdated(libraryId, seatId, slotId, date, 'OCCUPIED');
    emitBookingUpdated(libraryId, walkInRecord);

    sendSuccess(res, walkInRecord, undefined, 201);
  } catch (err: any) {
    if (err instanceof AppError) {
      return sendError(res, err.code, err.message, err.status, err.details);
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return sendError(res, 'SEAT_UNAVAILABLE', 'This seat was just reserved by another student.', 409);
    }
    next(err);
  }
});

// PATCH /admin/bookings/:id/status
adminRouter.patch('/bookings/:id/status', async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const libraryId = req.user!.libraryId!;

    const validStatuses = ['CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      throw new AppError('BAD_REQUEST', `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const [b] = await query('SELECT b.*, l.name as library_name, s.label as seat_label FROM bookings b JOIN libraries l ON b.library_id = l.id JOIN seats s ON b.seat_id = s.id WHERE b.id = ? AND b.library_id = ?', [req.params.id, libraryId]);
    if (!b) throw new AppError('NOT_FOUND', 'Booking not found', 404);

    const dateStr = typeof b.booking_date === 'string' ? b.booking_date.substring(0, 10) : new Date(b.booking_date).toISOString().substring(0, 10);

    if (status === 'COMPLETED') {
      await execute('UPDATE bookings SET status = "COMPLETED" WHERE id = ?', [req.params.id]);
      await notifyNextInWaitlist(b.seat_id, b.slot_id, dateStr);
      emitSeatUpdated(libraryId, b.seat_id, b.slot_id, dateStr, 'AVAILABLE');
      const updated = { ...b, status: 'COMPLETED' };
      emitBookingUpdated(libraryId, updated);
      if (b.user_id) {
        createNotification({
          userId: b.user_id,
          type: 'SYSTEM',
          title: 'Session Completed',
          body: `Your study session at ${b.library_name || 'the library'} has concluded. Thank you!`,
          data: { bookingId: b.id },
        }).catch(() => {});
      }
      return sendSuccess(res, updated);
    }

    if (status === 'CANCELLED') {
      await execute('UPDATE bookings SET status = "CANCELLED", cancelled_at = NOW() WHERE id = ?', [req.params.id]);
      await notifyNextInWaitlist(b.seat_id, b.slot_id, dateStr);
      emitSeatUpdated(libraryId, b.seat_id, b.slot_id, dateStr, 'AVAILABLE');
      const updated = { ...b, status: 'CANCELLED' };
      emitBookingUpdated(libraryId, updated);
      if (b.user_id) {
        createNotification({
          userId: b.user_id,
          type: 'SYSTEM',
          title: 'Booking Cancelled',
          body: reason ? `Your booking was cancelled: ${reason}` : 'Your booking was cancelled by library administration.',
          data: { bookingId: b.id },
        }).catch(() => {});
      }
      return sendSuccess(res, updated);
    }

    if (status === 'CHECKED_IN') {
      await execute('UPDATE bookings SET status = "CHECKED_IN", checked_in_at = NOW(), arrival_confirmed = 1 WHERE id = ?', [req.params.id]);
      emitSeatUpdated(libraryId, b.seat_id, b.slot_id, dateStr, 'OCCUPIED');
      const updated = { ...b, status: 'CHECKED_IN' };
      emitBookingCheckedIn(libraryId, updated);
      emitBookingUpdated(libraryId, updated);
      if (b.user_id) {
        createNotification({
          userId: b.user_id,
          type: 'SYSTEM',
          title: 'Checked In Successfully! 🎒',
          body: `You are checked in for Seat ${b.seat_label || ''}. Happy studying!`,
          data: { bookingId: b.id },
        }).catch(() => {});
      }
      return sendSuccess(res, updated);
    }

    if (status === 'NO_SHOW') {
      await execute('UPDATE bookings SET status = "NO_SHOW" WHERE id = ?', [req.params.id]);
      await notifyNextInWaitlist(b.seat_id, b.slot_id, dateStr);
      emitSeatUpdated(libraryId, b.seat_id, b.slot_id, dateStr, 'AVAILABLE');
      const updated = { ...b, status: 'NO_SHOW' };
      emitBookingUpdated(libraryId, updated);
      if (b.user_id) {
        emitBookingReleased(b.user_id, { bookingId: b.id, reason: 'CANCELLED_BY_ADMIN' });
        createNotification({
          userId: b.user_id,
          type: 'NO_SHOW',
          title: 'Marked as No-Show',
          body: 'Your reservation was marked as No-Show by library staff and released.',
          data: { bookingId: b.id },
        }).catch(() => {});
      }
      return sendSuccess(res, updated);
    }

    sendSuccess(res, { ...b, status });
  } catch (err) {
    next(err);
  }
});

// POST /admin/bookings/:id/release (alias for COMPLETED status)
adminRouter.post('/bookings/:id/release', async (req, res, next) => {
  try {
    const [b] = await query('SELECT * FROM bookings WHERE id = ? AND library_id = ?', [req.params.id, req.user!.libraryId]);
    if (!b) throw new AppError('NOT_FOUND', 'Booking not found', 404);

    await execute('UPDATE bookings SET status = "COMPLETED" WHERE id = ?', [req.params.id]);

    const dateStr = typeof b.booking_date === 'string' ? b.booking_date.substring(0, 10) : new Date(b.booking_date).toISOString().substring(0, 10);
    await notifyNextInWaitlist(b.seat_id, b.slot_id, dateStr);

    emitSeatUpdated(b.library_id, b.seat_id, b.slot_id, dateStr, 'AVAILABLE');
    emitBookingUpdated(b.library_id, { ...b, status: 'COMPLETED' });

    sendSuccess(res, { ...b, status: 'COMPLETED' });
  } catch (err) {
    next(err);
  }
});

// GET /admin/analytics/summary
adminRouter.get('/analytics/summary', async (req, res, next) => {
  try {
    const libraryId = req.user!.libraryId;
    const { from, to, date, slotId, floorId } = req.query as {
      from?: string;
      to?: string;
      date?: string;
      slotId?: string;
      floorId?: string;
    };

    // 1. Fetch exact total active seats for this library (or floor)
    const seatQuery = floorId
      ? 'SELECT COUNT(*) as total FROM seats WHERE library_id = ? AND floor_id = ? AND is_active = 1'
      : 'SELECT COUNT(*) as total FROM seats WHERE library_id = ? AND is_active = 1';
    const seatQueryParams = floorId ? [libraryId, floorId] : [libraryId];
    const [seats] = await query(seatQuery, seatQueryParams);
    const totalSeats = parseInt(seats.total || '0', 10);

    // 2. Build date condition (fallback to local server today date)
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const serverToday = `${curYear}-${curMonth}-${curDay}`;

    let dateCondition = 'b.booking_date = ?';
    const filterParams: any[] = [];

    if (from && to) {
      dateCondition = 'b.booking_date >= ? AND b.booking_date <= ?';
      filterParams.push(from, to);
    } else if (date) {
      dateCondition = 'b.booking_date = ?';
      filterParams.push(date);
    } else {
      filterParams.push(serverToday);
    }

    let slotCondition = '';
    if (slotId) {
      slotCondition = ' AND b.slot_id = ?';
      filterParams.push(slotId);
    }

    // 3. Count occupied seats (CONFIRMED, CHECKED_IN, or COMPLETED)
    let activeBookingsQuery: string;
    let countsQuery: string;
    let queryParams: any[];

    if (floorId) {
      activeBookingsQuery = `
        SELECT COUNT(DISTINCT b.seat_id) as booked
        FROM bookings b
        INNER JOIN seats s ON b.seat_id = s.id
        WHERE b.library_id = ?
          AND s.floor_id = ?
          AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
          AND ${dateCondition} ${slotCondition}
      `;
      countsQuery = `
        SELECT
          SUM(b.status = 'CHECKED_IN') as checkedIn,
          SUM(b.status = 'NO_SHOW') as noShows,
          SUM(b.source = 'WALK_IN') as walkIns,
          SUM(CASE WHEN b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED') THEN b.price_paise ELSE 0 END) as revenuePaise
        FROM bookings b
        INNER JOIN seats s ON b.seat_id = s.id
        WHERE b.library_id = ?
          AND s.floor_id = ?
          AND ${dateCondition} ${slotCondition}
      `;
      queryParams = [libraryId, floorId, ...filterParams];
    } else {
      activeBookingsQuery = `
        SELECT COUNT(DISTINCT b.seat_id) as booked
        FROM bookings b
        WHERE b.library_id = ?
          AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
          AND ${dateCondition} ${slotCondition}
      `;
      countsQuery = `
        SELECT
          SUM(b.status = 'CHECKED_IN') as checkedIn,
          SUM(b.status = 'NO_SHOW') as noShows,
          SUM(b.source = 'WALK_IN') as walkIns,
          SUM(CASE WHEN b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED') THEN b.price_paise ELSE 0 END) as revenuePaise
        FROM bookings b
        WHERE b.library_id = ?
          AND ${dateCondition} ${slotCondition}
      `;
      queryParams = [libraryId, ...filterParams];
    }

    const [activeBookings] = await query(activeBookingsQuery, queryParams);
    const bookedSeats = parseInt(activeBookings.booked || '0', 10);
    const availableSeats = Math.max(0, totalSeats - bookedSeats);
    const bookedPercent = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;
    const notBookedPercent = 100 - bookedPercent;

    const [counts] = await query(countsQuery, queryParams);

    // 4. Floor-by-floor breakdown directly from the Floors & Grid Builder
    const floorRows = await query(`
      SELECT f.id, f.floor_number as floorNumber, f.label, f.rows, f.cols,
             COUNT(s.id) as totalSeats
      FROM floors f
      LEFT JOIN seats s ON s.floor_id = f.id AND s.is_active = 1
      WHERE f.library_id = ?
      GROUP BY f.id
      ORDER BY f.floor_number ASC
    `, [libraryId]);

    const floors = await Promise.all((floorRows as any[]).map(async (f) => {
      const [fBooked] = await query(`
        SELECT COUNT(DISTINCT b.seat_id) as booked
        FROM bookings b
        INNER JOIN seats s ON b.seat_id = s.id
        WHERE b.library_id = ?
          AND s.floor_id = ?
          AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
          AND ${dateCondition} ${slotCondition}
      `, [libraryId, f.id, ...filterParams]);

      const fTotal = parseInt(f.totalSeats || '0', 10);
      const fBk = parseInt(fBooked.booked || '0', 10);
      const fAvail = Math.max(0, fTotal - fBk);
      const fOcc = fTotal > 0 ? Math.round((fBk / fTotal) * 100) : 0;

      const typeRows = await query(`
        SELECT seat_type, COUNT(*) as count
        FROM seats
        WHERE floor_id = ? AND is_active = 1
        GROUP BY seat_type
      `, [f.id]);
      const seatTypes: Record<string, number> = {};
      (typeRows as any[]).forEach((tr) => {
        seatTypes[tr.seat_type] = parseInt(tr.count || '0', 10);
      });

      return {
        id: f.id,
        floorNumber: f.floorNumber,
        label: f.label,
        rows: f.rows,
        cols: f.cols,
        totalSeats: fTotal,
        bookedSeats: fBk,
        availableSeats: fAvail,
        occupancyPercent: fOcc,
        seatTypes,
      };
    }));

    sendSuccess(res, {
      totalSeats,
      bookedSeats,
      availableSeats,
      bookedPercent,
      notBookedPercent,
      checkedIn: parseInt(counts.checkedIn || '0', 10),
      noShows: parseInt(counts.noShows || '0', 10),
      walkIns: parseInt(counts.walkIns || '0', 10),
      revenuePaise: parseInt(counts.revenuePaise || '0', 10),
      floors,
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/analytics/timeseries
adminRouter.get('/analytics/timeseries', async (req, res, next) => {
  try {
    const libraryId = req.user!.libraryId;
    const { from, to, date, groupBy = 'slot', floorId } = req.query as {
      from?: string;
      to?: string;
      date?: string;
      groupBy?: 'slot' | 'day' | 'seatType';
      floorId?: string;
    };

    // Total active seats for this library (or floor)
    const seatQuery = floorId
      ? 'SELECT COUNT(*) as total FROM seats WHERE library_id = ? AND floor_id = ? AND is_active = 1'
      : 'SELECT COUNT(*) as total FROM seats WHERE library_id = ? AND is_active = 1';
    const seatParams = floorId ? [libraryId, floorId] : [libraryId];
    const [seats] = await query(seatQuery, seatParams);
    const totalSeats = parseInt(seats.total || '0', 10);

    const nowTs = new Date();
    const tsYear = nowTs.getFullYear();
    const tsMonth = String(nowTs.getMonth() + 1).padStart(2, '0');
    const tsDay = String(nowTs.getDate()).padStart(2, '0');
    const serverTodayTs = `${tsYear}-${tsMonth}-${tsDay}`;

    let dateSql = 'b.booking_date = ?';
    const dateParams: any[] = [];
    if (from && to) {
      dateSql = 'b.booking_date >= ? AND b.booking_date <= ?';
      dateParams.push(from, to);
    } else if (date) {
      dateSql = 'b.booking_date = ?';
      dateParams.push(date);
    } else {
      dateParams.push(serverTodayTs);
    }

    if (groupBy === 'day') {
      let dayQuery: string;
      let dayParams: any[];

      if (floorId) {
        dayQuery = `
          SELECT b.booking_date, COUNT(*) as booked
          FROM bookings b
          INNER JOIN seats s ON b.seat_id = s.id
          WHERE b.library_id = ?
            AND s.floor_id = ?
            AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
            AND ${dateSql}
          GROUP BY b.booking_date
          ORDER BY b.booking_date ASC
        `;
        dayParams = [libraryId, floorId, ...dateParams];
      } else {
        dayQuery = `
          SELECT b.booking_date, COUNT(*) as booked
          FROM bookings b
          WHERE b.library_id = ?
            AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
            AND ${dateSql}
          GROUP BY b.booking_date
          ORDER BY b.booking_date ASC
        `;
        dayParams = [libraryId, ...dateParams];
      }

      const rows = await query(dayQuery, dayParams);

      const points = (rows as any[]).map((r) => {
        const booked = parseInt(r.booked || '0', 10);
        let label = '';
        if (r.booking_date instanceof Date) {
          label = r.booking_date.toISOString().split('T')[0];
        } else {
          label = String(r.booking_date).split('T')[0];
        }
        return {
          label,
          booked,
          capacity: totalSeats,
          percent: totalSeats > 0 ? Math.round((booked / totalSeats) * 100) : 0,
        };
      });

      return sendSuccess(res, { points });
    }

    if (groupBy === 'seatType') {
      const typeQuery = floorId
        ? 'SELECT seat_type, COUNT(*) as total FROM seats WHERE library_id = ? AND floor_id = ? AND is_active = 1 GROUP BY seat_type'
        : 'SELECT seat_type, COUNT(*) as total FROM seats WHERE library_id = ? AND is_active = 1 GROUP BY seat_type';
      const seatTypeCounts = await query(typeQuery, seatParams);

      const points = await Promise.all(
        (seatTypeCounts as any[]).map(async (st) => {
          let bQuery: string;
          let bParams: any[];
          if (floorId) {
            bQuery = `
              SELECT COUNT(*) as booked
              FROM bookings b
              INNER JOIN seats s ON b.seat_id = s.id
              WHERE b.library_id = ?
                AND s.floor_id = ?
                AND s.seat_type = ?
                AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
                AND ${dateSql}
            `;
            bParams = [libraryId, floorId, st.seat_type, ...dateParams];
          } else {
            bQuery = `
              SELECT COUNT(*) as booked
              FROM bookings b
              INNER JOIN seats s ON b.seat_id = s.id
              WHERE b.library_id = ?
                AND s.seat_type = ?
                AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
                AND ${dateSql}
            `;
            bParams = [libraryId, st.seat_type, ...dateParams];
          }

          const [b] = await query(bQuery, bParams);
          const booked = parseInt(b.booked || '0', 10);
          const capacity = parseInt(st.total || '0', 10);
          return {
            label: st.seat_type,
            booked,
            capacity,
            percent: capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
          };
        })
      );

      return sendSuccess(res, { points });
    }

    // Default: Group by slot
    const slots = await query('SELECT * FROM time_slots WHERE library_id = ? ORDER BY start_time ASC', [libraryId]);
    const points = await Promise.all(
      (slots as any[]).map(async (s) => {
        let bQuery: string;
        let bParams: any[];

        if (floorId) {
          bQuery = `
            SELECT COUNT(*) as booked
            FROM bookings b
            INNER JOIN seats s ON b.seat_id = s.id
            WHERE b.library_id = ?
              AND s.floor_id = ?
              AND b.slot_id = ?
              AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
              AND ${dateSql}
          `;
          bParams = [libraryId, floorId, s.id, ...dateParams];
        } else {
          bQuery = `
            SELECT COUNT(*) as booked
            FROM bookings b
            WHERE b.library_id = ?
              AND b.slot_id = ?
              AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
              AND ${dateSql}
          `;
          bParams = [libraryId, s.id, ...dateParams];
        }

        const [b] = await query(bQuery, bParams);
        const booked = parseInt(b.booked || '0', 10);
        return {
          label: `${s.name} (${s.start_time} - ${s.end_time})`,
          booked,
          capacity: totalSeats,
          percent: totalSeats > 0 ? Math.round((booked / totalSeats) * 100) : 0,
        };
      })
    );

    sendSuccess(res, { points });
  } catch (err) {
    next(err);
  }
});

// GET /admin/reports/export?format=csv|pdf
adminRouter.get('/reports/export', async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;
    const libraryId = req.user!.libraryId;

    const rows = await query(`
      SELECT b.code, s.label as seat, ts.name as slot, b.booking_date, b.status, b.source,
             COALESCE(b.guest_name, u.name, 'Student') as student, (b.price_paise / 100) as amount_rupees
      FROM bookings b
      JOIN seats s ON b.seat_id = s.id
      JOIN time_slots ts ON b.slot_id = ts.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.library_id = ? ORDER BY b.booking_date DESC
    `, [libraryId]);

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="vidya-asana-report.csv"');
      return res.send(csv);
    } else {
      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="vidya-asana-report.pdf"');
      doc.pipe(res);

      doc.fontSize(18).text('Vidya Asana — Library Utilization Audit Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown();

      rows.slice(0, 50).forEach((r, idx) => {
        doc.text(`${idx + 1}. Code: ${r.code} | Seat: ${r.seat} | Slot: ${r.slot} | Date: ${r.booking_date} | Status: ${r.status} | ₹${r.amount_rupees}`);
      });

      doc.end();
    }
  } catch (err) {
    next(err);
  }
});
