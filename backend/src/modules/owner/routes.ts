import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { query, execute } from '../../config/db';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { sendMail } from '../../config/mailer';
import { ensureLibraryDefaults } from '../library/initLibrary';
import { createNotification } from '../notifications/service';

export const ownerRouter = Router();

ownerRouter.use(authenticate, requireRole('SITE_OWNER'));

// Helper to map DB row to Library object
export function mapLibraryRow(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    address: r.address,
    city: r.city,
    latitude: parseFloat(r.latitude),
    longitude: parseFloat(r.longitude),
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone || undefined,
    status: r.status,
    rejectionReason: r.rejection_reason || undefined,
    amenities: {
      lockers: !!r.has_lockers,
      cctv: !!r.has_cctv,
      ac: !!r.has_ac,
      wifi: !!r.has_wifi,
      powerOutlets: !!r.has_power_outlets,
    },
    isFree: !!r.is_free,
    seatCounts: {
      INDIVIDUAL: parseInt(r.count_individual || '0', 10),
      GROUP: parseInt(r.count_group || '0', 10),
      ACCESSIBLE: parseInt(r.count_accessible || '0', 10),
      COMPUTER: parseInt(r.count_computer || '0', 10),
    },
    totalSeats: parseInt(r.total_seats || '0', 10),
    floorCount: parseInt(r.floor_count || '0', 10),
    distanceKm: r.distance_km !== undefined ? parseFloat(r.distance_km) : undefined,
    matchScore: r.match_score !== undefined ? parseInt(r.match_score, 10) : undefined,
    createdAt: r.created_at,
  };
}

// GET /owner/libraries
ownerRouter.get('/libraries', async (req, res, next) => {
  try {
    const { status, isFree, q, page = 1, pageSize = 20 } = req.query;
    let sql = `
      SELECT l.*,
        (SELECT COUNT(*) FROM floors f WHERE f.library_id = l.id) as floor_count,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.is_active = 1) as total_seats,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'INDIVIDUAL' AND s.is_active = 1) as count_individual,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'GROUP' AND s.is_active = 1) as count_group,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'ACCESSIBLE' AND s.is_active = 1) as count_accessible,
        (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id AND s.seat_type = 'COMPUTER' AND s.is_active = 1) as count_computer
      FROM libraries l WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }
    if (isFree === 'true') {
      sql += ' AND l.is_free = 1';
    } else if (isFree === 'false') {
      sql += ' AND l.is_free = 0';
    }
    if (q) {
      sql += ' AND (l.name LIKE ? OR l.city LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY l.created_at DESC';

    const rows = await query(sql, params);
    const libraries = rows.map(mapLibraryRow);

    sendSuccess(res, libraries, {
      page: Number(page),
      pageSize: Number(pageSize),
      total: libraries.length,
      totalPages: Math.ceil(libraries.length / Number(pageSize)) || 1,
    });
  } catch (err) {
    next(err);
  }
});

// GET /owner/libraries/:id
ownerRouter.get('/libraries/:id', async (req, res, next) => {
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

    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Library not found', 404);
    }

    const library = mapLibraryRow(rows[0]);
    const adminRows = await query('SELECT id, name, email, role, phone, created_at FROM users WHERE library_id = ?', [req.params.id]);
    const admin = adminRows[0] || {
      id: rows[0].admin_user_id || 'usr-unknown',
      name: 'Library Admin',
      email: rows[0].contact_email,
      role: 'LIBRARY_ADMIN',
      createdAt: rows[0].created_at,
    };

    sendSuccess(res, { library, admin });
  } catch (err) {
    next(err);
  }
});

// POST /owner/libraries/:id/approve
ownerRouter.post('/libraries/:id/approve', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM libraries WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Library not found', 404);
    }

    await execute('UPDATE libraries SET status = "APPROVED", rejection_reason = NULL WHERE id = ?', [req.params.id]);
    await ensureLibraryDefaults(req.params.id);

    const updated = await query('SELECT * FROM libraries WHERE id = ?', [req.params.id]);
    const library = mapLibraryRow(updated[0]);

    // Send SMTP email
    await sendMail({
      to: library.contactEmail,
      subject: `[Vidya Asana] Library Listing Approved: ${library.name}`,
      text: `Hello,\n\nYour library "${library.name}" has been approved by the platform administrator.\n\nYou can now log in to your Library Admin Dashboard to configure study floors, seat grids, and reservation slots.\n\nBest regards,\nThe Vidya Asana Team`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Library Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Vidya<span style="color: #f59e0b;">Asana</span></h1>
      <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Intelligent Library & Study Workspace Management</p>
    </div>
    <div style="padding: 28px 24px;">
      <span style="background-color: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">Listing Approved</span>
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 12px 0 8px 0;">Welcome, ${library.name}!</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
        Your library registration has been verified and approved by the platform administration. Your listing is now active on the Vidya Asana network.
      </p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #334155;">Next steps for your administrator account:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #64748b; line-height: 1.6;">
          <li>Configure your floor layouts and seating grid</li>
          <li>Set up operating hours and reservation time slots</li>
          <li>Monitor student reservations and QR check-ins</li>
        </ul>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        Vidya Asana automated platform notification.
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    // In-app notification to library administrator
    try {
      const adminUsers = await query('SELECT id FROM users WHERE library_id = ?', [req.params.id]);
      for (const a of adminUsers) {
        await createNotification({
          userId: a.id,
          type: 'LIBRARY_APPROVED',
          title: '🎉 Library Approved by Platform Administration!',
          body: `Congratulations! "${library.name}" has been approved. You can now build floors, design seat layouts, and accept reservations.`,
          data: { libraryId: req.params.id, type: 'LIBRARY_APPROVED' },
        });
      }
    } catch (notifErr) {
      console.warn('[OwnerRouter] Failed to dispatch approval notification:', notifErr);
    }

    sendSuccess(res, library);
  } catch (err) {
    next(err);
  }
});

// POST /owner/libraries/:id/reject
ownerRouter.post('/libraries/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      throw new AppError('BAD_REQUEST', 'Rejection reason is required', 400);
    }

    const rows = await query('SELECT * FROM libraries WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Library not found', 404);
    }

    await execute('UPDATE libraries SET status = "REJECTED", rejection_reason = ? WHERE id = ?', [reason, req.params.id]);

    const updated = await query('SELECT * FROM libraries WHERE id = ?', [req.params.id]);
    const library = mapLibraryRow(updated[0]);

    // Send SMTP email with rejection reason
    await sendMail({
      to: library.contactEmail,
      subject: `[Vidya Asana] Update on your library listing: ${library.name}`,
      text: `Hello,\n\nYour library listing for "${library.name}" was not approved at this time.\n\nReason:\n${reason}\n\nBest regards,\nThe Vidya Asana Team`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Library Listing Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Vidya<span style="color: #f59e0b;">Asana</span></h1>
      <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Intelligent Library & Study Workspace Management</p>
    </div>
    <div style="padding: 28px 24px;">
      <span style="background-color: #fff1f2; color: #e11d48; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">Listing Review</span>
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 12px 0 8px 0;">Update for ${library.name}</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
        Thank you for submitting your library listing. At this time, your application could not be approved due to the following reason:
      </p>
      <div style="background-color: #fef2f2; border-radius: 8px; padding: 14px; border: 1px solid #fecaca; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.6;">${reason}</p>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        Vidya Asana automated platform notification.
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    // In-app notification to library administrator
    try {
      const adminUsers = await query('SELECT id FROM users WHERE library_id = ?', [req.params.id]);
      for (const a of adminUsers) {
        await createNotification({
          userId: a.id,
          type: 'LIBRARY_REJECTED',
          title: '⚠️ Library Listing Decision: Rejected',
          body: `Your application for "${library.name}" was not approved. Decision notes: ${reason}`,
          data: { libraryId: req.params.id, reason, type: 'LIBRARY_REJECTED' },
        });
      }
    } catch (notifErr) {
      console.warn('[OwnerRouter] Failed to dispatch rejection notification:', notifErr);
    }

    sendSuccess(res, library);
  } catch (err) {
    next(err);
  }
});

// GET /owner/stats
ownerRouter.get('/stats', async (req, res, next) => {
  try {
    const [libCounts] = await query(`
      SELECT
        COUNT(*) as totalLibraries,
        SUM(status = 'PENDING') as pending,
        SUM(status = 'APPROVED') as approved,
        SUM(status = 'REJECTED') as rejected
      FROM libraries
    `);

    const [userCounts] = await query('SELECT COUNT(*) as totalUsers FROM users WHERE role = "USER"');
    const [bookingCounts] = await query('SELECT COUNT(*) as totalBookings FROM bookings');

    sendSuccess(res, {
      totalLibraries: parseInt(libCounts.totalLibraries || '0', 10),
      pending: parseInt(libCounts.pending || '0', 10),
      approved: parseInt(libCounts.approved || '0', 10),
      rejected: parseInt(libCounts.rejected || '0', 10),
      totalUsers: parseInt(userCounts.totalUsers || '0', 10),
      totalBookings: parseInt(bookingCounts.totalBookings || '0', 10),
    });
  } catch (err) {
    next(err);
  }
});
