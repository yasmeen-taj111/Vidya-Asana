import cron from 'node-cron';
import { query } from '../config/db';
import { emitBookingReminder, emitBookingReleased, emitSeatUpdated } from '../realtime/socket';
import { createNotification } from '../modules/notifications/service';
import { notifyNextInWaitlist } from '../modules/waitlist/service';
import { sendMail } from '../config/mailer';

export function startNoShowCron() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processSlotStartReminders();
      await processNoShows();
      await processExpiredWaitlists();
      await processSlotCompletions();
    } catch (err) {
      console.error('[Cron] Error in no-show scheduler:', err);
    }
  });
  console.log('[Cron] No-show and waitlist automation scheduler started');
}

async function processSlotStartReminders() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const currentH = String(now.getHours()).padStart(2, '0');
  const currentM = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentH}:${currentM}`;

  const rows = await query<any[]>(
    `SELECT b.*, u.email as user_email, u.name as user_name,
            l.name as library_name, s.label as seat_label,
            sl.start_time, sl.end_time
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     JOIN libraries l ON l.id = b.library_id
     JOIN seats s ON s.id = b.seat_id
     JOIN time_slots sl ON sl.id = b.slot_id
     WHERE b.booking_date = ?
       AND b.status = 'CONFIRMED'
       AND b.reminder_sent_at IS NULL
       AND sl.start_time <= ?
       AND sl.end_time > ?`,
    [todayStr, currentTime, currentTime]
  );

  for (const b of rows) {
    await query(`UPDATE bookings SET reminder_sent_at = UTC_TIMESTAMP() WHERE id = ?`, [b.id]);

    const graceUntilIso = new Date(b.grace_until).toISOString();
    const message = `Your study slot at ${b.library_name} (Seat ${b.seat_label}) has started. Please scan your check-in QR or confirm your arrival.`;

    emitBookingReminder(b.user_id, {
      bookingId: b.id,
      message,
      graceUntil: graceUntilIso,
    });

    await createNotification({
      userId: b.user_id,
      type: 'REMINDER',
      title: 'Slot Started — Check-in Required',
      body: message,
      data: { bookingId: b.id, graceUntil: graceUntilIso },
    });

    if (b.user_email) {
      sendMail({
        to: b.user_email,
        subject: `[Vidya Asana] Check-in Reminder for Seat ${b.seat_label}`,
        text: `Hi ${b.user_name},\n\nYour study session at ${b.library_name} has started. Please check in with your QR pass before ${graceUntilIso}.\n\nIf you are on your way, open Vidya Asana to extend your grace window by 30 minutes!`,
      }).catch((e) => console.error('[Mailer] Reminder email error:', e));
    }
  }
}

async function processNoShows() {
  const expiredBookings = await query<any[]>(
    `SELECT b.*, u.email as user_email, u.name as user_name,
            l.name as library_name, s.label as seat_label
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     JOIN libraries l ON l.id = b.library_id
     JOIN seats s ON s.id = b.seat_id
     WHERE b.status = 'CONFIRMED'
       AND b.grace_until <= UTC_TIMESTAMP()`
  );

  for (const b of expiredBookings) {
    await query(`UPDATE bookings SET status = 'NO_SHOW' WHERE id = ?`, [b.id]);

    emitBookingReleased(b.user_id, {
      bookingId: b.id,
      reason: 'NO_SHOW',
    });

    await createNotification({
      userId: b.user_id,
      type: 'NO_SHOW',
      title: 'Booking Cancelled (No-Show)',
      body: `Your booking for Seat ${b.seat_label} at ${b.library_name} was released because the check-in grace period expired.`,
      data: { bookingId: b.id },
    });

    if (b.user_email) {
      sendMail({
        to: b.user_email,
        subject: `[Vidya Asana] Booking Released (No-Show)`,
        text: `Hi ${b.user_name},\n\nYour booking for Seat ${b.seat_label} at ${b.library_name} was marked as No-Show and released to the community.`,
      }).catch((e) => console.error('[Mailer] No-show email error:', e));
    }

    const dateStr =
      typeof b.booking_date === 'string'
        ? b.booking_date.substring(0, 10)
        : new Date(b.booking_date).toISOString().substring(0, 10);

    // Free seat and notify next person on the waitlist
    await notifyNextInWaitlist(b.seat_id, b.slot_id, dateStr);
  }
}

async function processExpiredWaitlists() {
  const expiredWaitlists = await query<any[]>(
    `SELECT * FROM waitlist_entries
     WHERE status = 'NOTIFIED' AND claim_expires_at <= UTC_TIMESTAMP()`
  );

  for (const w of expiredWaitlists) {
    await query(`UPDATE waitlist_entries SET status = 'EXPIRED' WHERE id = ?`, [w.id]);

    const dateStr =
      typeof w.booking_date === 'string'
        ? w.booking_date.substring(0, 10)
        : new Date(w.booking_date).toISOString().substring(0, 10);

    // Notify next in line
    await notifyNextInWaitlist(w.seat_id, w.slot_id, dateStr);
  }
}

async function processSlotCompletions() {
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const currentH = String(now.getHours()).padStart(2, '0');
  const currentM = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentH}:${currentM}`;

  // Find active bookings that have passed their slot end time
  const completedBookings = await query<any[]>(
    `SELECT b.id, b.seat_id, b.slot_id, b.library_id, b.booking_date
     FROM bookings b
     JOIN time_slots sl ON sl.id = b.slot_id
     WHERE b.status IN ('CHECKED_IN', 'CONFIRMED')
       AND (
         b.booking_date < ?
         OR (b.booking_date = ? AND sl.end_time <= ?)
       )`,
    [todayStr, todayStr, currentTime]
  );

  for (const b of completedBookings) {
    await query(`UPDATE bookings SET status = 'COMPLETED' WHERE id = ?`, [b.id]);
    const dateStr =
      typeof b.booking_date === 'string'
        ? b.booking_date.substring(0, 10)
        : new Date(b.booking_date).toISOString().substring(0, 10);
    // Release the seat in real-time
    emitSeatUpdated(b.library_id, b.seat_id, b.slot_id, dateStr, 'AVAILABLE');
  }
}
