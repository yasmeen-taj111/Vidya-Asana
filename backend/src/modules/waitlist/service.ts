import { query } from '../../config/db';
import { emitSeatUpdated, emitWaitlistAvailable } from '../../realtime/socket';
import { createNotification } from '../notifications/service';

export async function notifyNextInWaitlist(
  seatId: string,
  slotId: string,
  bookingDate: string
) {
  // Find oldest WAITING entry
  const rows = await query<any[]>(
    `SELECT w.*, s.library_id, s.label as seat_label, s.seat_type, s.facing,
            s.attr_window, s.attr_power_outlet, s.attr_quiet_zone, s.attr_near_door,
            l.name as library_name, f.label as floor_label
     FROM waitlist_entries w
     JOIN seats s ON s.id = w.seat_id
     JOIN libraries l ON l.id = s.library_id
     JOIN floors f ON f.id = s.floor_id
     WHERE w.seat_id = ? AND w.slot_id = ? AND w.booking_date = ? AND w.status = 'WAITING'
     ORDER BY w.created_at ASC
     LIMIT 1`,
    [seatId, slotId, bookingDate]
  );

  if (rows.length === 0) {
    // No one waiting, seat becomes AVAILABLE
    const seatInfo = await query<any[]>(
      `SELECT library_id FROM seats WHERE id = ?`,
      [seatId]
    );
    if (seatInfo.length > 0) {
      emitSeatUpdated(seatInfo[0].library_id, seatId, slotId, bookingDate, 'AVAILABLE');
    }
    return null;
  }

  const entry = rows[0];
  const claimExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await query(
    `UPDATE waitlist_entries
     SET status = 'NOTIFIED', claim_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
     WHERE id = ?`,
    [entry.id]
  );

  const seatObj = {
    id: entry.seat_id,
    floorId: entry.floor_id,
    label: entry.seat_label,
    seatType: entry.seat_type,
    facing: entry.facing,
    attributes: {
      window: Boolean(entry.attr_window),
      powerOutlet: Boolean(entry.attr_power_outlet),
      quietZone: Boolean(entry.attr_quiet_zone),
      nearDoor: Boolean(entry.attr_near_door),
    },
    isActive: true,
  };

  emitSeatUpdated(entry.library_id, seatId, slotId, bookingDate, 'HELD');

  emitWaitlistAvailable(entry.user_id, {
    waitlistId: entry.id,
    seat: seatObj,
    claimExpiresAt,
  });

  await createNotification({
    userId: entry.user_id,
    type: 'WAITLIST_AVAILABLE',
    title: 'Seat Available!',
    body: `A seat (${entry.seat_label}) at ${entry.library_name} is now available. You have 10 minutes to claim it!`,
    data: {
      waitlistId: entry.id,
      seatId,
      slotId,
      date: bookingDate,
      claimExpiresAt,
    },
  });

  return entry;
}
