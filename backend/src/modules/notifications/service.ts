import { query } from '../../config/db';
import { generateId } from '../../utils/ids';
import { emitNotification } from '../../realtime/socket';

export interface NotificationPayload {
  userId: string;
  type:
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_CANCELLED'
    | 'GRACE_EXTENDED'
    | 'REMINDER'
    | 'NO_SHOW'
    | 'WAITLIST_AVAILABLE'
    | 'LIBRARY_APPROVED'
    | 'LIBRARY_REJECTED'
    | 'SYSTEM';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  data,
}: NotificationPayload) {
  const id = generateId();
  const dataJson = data ? JSON.stringify(data) : null;

  await query(
    `INSERT INTO notifications (id, user_id, type, title, body, is_read, data, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, NOW())`,
    [id, userId, type, title, body, dataJson]
  );

  const notification = {
    id,
    type,
    title,
    body,
    isRead: false,
    data: data || undefined,
    createdAt: new Date().toISOString(),
  };

  emitNotification(userId, notification);
  return notification;
}
