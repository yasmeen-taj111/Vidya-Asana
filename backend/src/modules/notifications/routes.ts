import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';

export const notificationsRouter = Router();

function mapNotificationRow(r: any) {
  let parsedData: any = undefined;
  if (r.data) {
    try {
      parsedData = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    } catch (e) {
      parsedData = undefined;
    }
  }

  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    isRead: Boolean(r.is_read),
    data: parsedData,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

// GET /notifications
notificationsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { unread, page = 1, pageSize = 20 } = req.query;

    let sql = `SELECT * FROM notifications WHERE user_id = ?`;
    const params: any[] = [userId];

    if (unread === 'true') {
      sql += ` AND is_read = 0`;
    }

    sql += ` ORDER BY created_at DESC`;

    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const allRows = await query<any[]>(sql, params);
    const paginated = allRows.slice(offset, offset + limit);

    const notifications = paginated.map(mapNotificationRow);

    sendSuccess(res, notifications, {
      page: Number(page),
      pageSize: limit,
      total: allRows.length,
      totalPages: Math.ceil(allRows.length / limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /notifications/:id/read
notificationsRouter.post('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /notifications/read-all
notificationsRouter.post('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    await query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);

    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});
