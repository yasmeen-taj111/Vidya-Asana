import { query, execute } from '../../config/db';
import { generateUUID } from '../../utils/ids';

/**
 * Ensures that an approved library has default operating time slots
 * and at least one floor grid with seats so student booking works immediately.
 */
export async function ensureLibraryDefaults(libraryId: string): Promise<void> {
  try {
    const libs = await query('SELECT * FROM libraries WHERE id = ?', [libraryId]);
    if (!libs || libs.length === 0) return;
    const lib = libs[0];
    const isFree = !!lib.is_free;

    // 1. Ensure time slots exist
    const existingSlots = await query('SELECT id FROM time_slots WHERE library_id = ?', [libraryId]);
    if (existingSlots.length === 0) {
      const defaultSlots = [
        { name: 'MORNING', startTime: '06:00', endTime: '12:00', isFree: true, pricePaise: 0 },
        { name: 'AFTERNOON', startTime: '12:00', endTime: '17:00', isFree: isFree, pricePaise: isFree ? 0 : 5000 },
        { name: 'EVENING', startTime: '17:00', endTime: '21:00', isFree: isFree, pricePaise: isFree ? 0 : 6000 },
        { name: 'NIGHT', startTime: '21:00', endTime: '23:59', isFree: isFree, pricePaise: isFree ? 0 : 8000 },
      ];

      for (const slot of defaultSlots) {
        await execute(
          'INSERT INTO time_slots (id, library_id, name, start_time, end_time, is_free, price_paise, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
          [generateUUID(), libraryId, slot.name, slot.startTime, slot.endTime, slot.isFree ? 1 : 0, slot.pricePaise]
        );
      }
    }

    // 2. Ensure floor and seats exist
    const existingFloors = await query('SELECT id FROM floors WHERE library_id = ?', [libraryId]);
    let floorId: string;
    const rows = 4;
    const cols = 5;

    if (existingFloors.length === 0) {
      floorId = generateUUID();
      await execute(
        'INSERT INTO floors (id, library_id, floor_number, label, `rows`, `cols`) VALUES (?, ?, 1, ?, ?, ?)',
        [floorId, libraryId, 'Floor 1 - Main Study Hall', rows, cols]
      );

      // Floor cells: Door at (0, 0), Window Wall at (0, 4)
      await execute('INSERT INTO floor_cells (id, floor_id, `row`, `col`, cell_type) VALUES (?, ?, 0, 0, "DOOR")', [generateUUID(), floorId]);
      await execute('INSERT INTO floor_cells (id, floor_id, `row`, `col`, cell_type) VALUES (?, ?, 0, 4, "WINDOW_WALL")', [generateUUID(), floorId]);
    } else {
      floorId = existingFloors[0].id;
    }

    const existingSeats = await query('SELECT id FROM seats WHERE floor_id = ?', [floorId]);
    if (existingSeats.length === 0) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r === 0 && c === 0) || (r === 0 && c === cols - 1)) continue;

          const seatId = generateUUID();
          const label = `F1-${String.fromCharCode(65 + r)}${c + 1}`;
          const seatType = r === 0 ? 'COMPUTER' : r === rows - 1 && c === 1 ? 'ACCESSIBLE' : 'INDIVIDUAL';
          const isWindow = c === 0 || c === cols - 1;

          await execute(
            'INSERT INTO seats (id, floor_id, library_id, label, seat_type, facing, attr_window, attr_power_outlet, attr_quiet_zone, attr_near_door, is_active, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, "N", ?, 1, 1, ?, 1, ?, ?)',
            [seatId, floorId, libraryId, label, seatType, isWindow ? 1 : 0, r >= rows - 2 ? 1 : 0, r, c]
          );
        }
      }
    }
  } catch (err) {
    console.warn(`[ensureLibraryDefaults] Non-fatal initialization warning for ${libraryId}:`, err);
  }
}
