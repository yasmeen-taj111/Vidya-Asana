import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { query, execute } from '../../config/db';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { sendMail } from '../../config/mailer';
import { ensureLibraryDefaults } from '../library/initLibrary';

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
    const { status, q, page = 1, pageSize = 20 } = req.query;
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
    sendMail({
      to: library.contactEmail,
      subject: `Vidya Asana: Your library listing for "${library.name}" is Approved!`,
      html: `<h2>Congratulations!</h2><p>Your library <strong>${library.name}</strong> has been approved by the platform administrator. You can now configure study floors, seat grids, and reservation slots.</p>`,
    });

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
    sendMail({
      to: library.contactEmail,
      subject: `Vidya Asana: Update on your library listing for "${library.name}"`,
      html: `<h2>Listing Update</h2><p>Your listing for <strong>${library.name}</strong> was not approved at this time.</p><p><strong>Reason:</strong> ${reason}</p>`,
    });

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
