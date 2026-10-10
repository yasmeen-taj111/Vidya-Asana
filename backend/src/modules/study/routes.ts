import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { generateUUID } from '../../utils/ids';

export const studyRouter = Router();

// POST /study/sessions
studyRouter.post('/sessions', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { type, startedAt, endedAt, focusSeconds, breakSeconds = 0, bookingId } = req.body;

    if (!type || !startedAt || !endedAt || focusSeconds === undefined) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required session parameters', 422);
    }

    const id = generateUUID();
    await query(
      `INSERT INTO study_sessions (id, user_id, type, started_at, ended_at, focus_seconds, break_seconds, booking_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        userId,
        type,
        new Date(startedAt),
        new Date(endedAt),
        focusSeconds,
        breakSeconds,
        bookingId || null,
      ]
    );

    sendSuccess(res, { id }, undefined, 201);
  } catch (err) {
    next(err);
  }
});

// GET /study/reports?range=week|month
studyRouter.get('/reports', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { range = 'week' } = req.query;

    const daysCount = range === 'month' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);

    const rows = await query<any[]>(
      `SELECT DATE(started_at) as session_date, type, SUM(focus_seconds) as total_seconds
       FROM study_sessions
       WHERE user_id = ? AND started_at >= ?
       GROUP BY DATE(started_at), type
       ORDER BY session_date ASC`,
      [userId, startDate]
    );

    const bySessionType: Record<string, number> = {
      POMODORO: 0,
      CUSTOM: 0,
      STOPWATCH: 0,
    };

    const dailyMap: Record<string, number> = {};
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().substring(0, 10);
      dailyMap[ds] = 0;
    }

    let totalFocusSeconds = 0;
    const activeDatesSet = new Set<string>();

    rows.forEach((r) => {
      const sec = Number(r.total_seconds || 0);
      totalFocusSeconds += sec;
      const dateStr = typeof r.session_date === 'string'
        ? r.session_date.substring(0, 10)
        : new Date(r.session_date).toISOString().substring(0, 10);

      activeDatesSet.add(dateStr);
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += sec;
      } else {
        dailyMap[dateStr] = sec;
      }

      if (bySessionType[r.type] !== undefined) {
        bySessionType[r.type] += sec;
      }
    });

    const activeDays = activeDatesSet.size;
    const consistencyPercent = Math.min(100, Math.round((activeDays / daysCount) * 100));

    // Daily array
    const daily = Object.keys(dailyMap)
      .sort()
      .map((date) => ({
        date,
        focusSeconds: dailyMap[date],
      }));

    // Streak calculation
    const allDateRows = await query<any[]>(
      `SELECT DISTINCT DATE(started_at) as study_date
       FROM study_sessions
       WHERE user_id = ?
       ORDER BY study_date DESC`,
      [userId]
    );

    let streakDays = 0;
    if (allDateRows.length > 0) {
      const dates = allDateRows.map((r) => {
        const d = new Date(r.study_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oneDayMs = 24 * 60 * 60 * 1000;

      let lastDate = today.getTime();
      if (dates[0] === today.getTime() || dates[0] === today.getTime() - oneDayMs) {
        lastDate = dates[0];
        streakDays = 1;
        for (let i = 1; i < dates.length; i++) {
          if (dates[i] === lastDate - oneDayMs) {
            streakDays++;
            lastDate = dates[i];
          } else {
            break;
          }
        }
      }
    }

    sendSuccess(res, {
      totalFocusSeconds,
      activeDays,
      consistencyPercent,
      streakDays,
      daily,
      bySessionType,
    });
  } catch (err) {
    next(err);
  }
});

// GET /study/leaderboard?scope=library|global&period=week|month&libraryId=
studyRouter.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { scope = 'global', period = 'week', libraryId } = req.query;

    const daysCount = period === 'month' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);

    let sql = `
      SELECT u.id as user_id, u.name, COALESCE(SUM(s.focus_seconds), 0) as focus_seconds
      FROM users u
      LEFT JOIN study_sessions s ON s.user_id = u.id AND s.started_at >= ?
      WHERE u.role = 'USER'
    `;
    const params: any[] = [startDate];

    if (scope === 'library' && libraryId) {
      sql += ` AND u.id IN (
        SELECT DISTINCT b.user_id FROM bookings b WHERE b.library_id = ? AND b.user_id IS NOT NULL
      )`;
      params.push(libraryId);
    }

    sql += ` GROUP BY u.id, u.name ORDER BY focus_seconds DESC LIMIT 50`;

    const rows = await query<any[]>(sql, params);

    let myRank: number | undefined = undefined;

    const entries = rows.map((r, index) => {
      const isMe = r.user_id === userId;
      const rank = index + 1;
      if (isMe) myRank = rank;
      return {
        rank,
        userId: r.user_id,
        name: r.name,
        focusSeconds: Number(r.focus_seconds),
        isMe,
      };
    });

    sendSuccess(res, {
      entries,
      myRank,
    });
  } catch (err) {
    next(err);
  }
});
