import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, execute } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { generateUUID } from '../../utils/ids';
import { AuthUser } from '../../middleware/auth';

export const authService = {
  generateTokens(user: AuthUser) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, libraryId: user.libraryId },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
  },

  async registerUser(name: string, email: string, password: string, phone?: string) {
    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      throw new AppError('EMAIL_TAKEN', 'An account with this email address already exists.', 409);
    }

    const id = generateUUID();
    const hash = await bcrypt.hash(password, 10);

    await execute(
      'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, email.toLowerCase(), hash, 'USER', phone || null]
    );

    const user = { id, name, email: email.toLowerCase(), role: 'USER' as const, phone, createdAt: new Date().toISOString() };
    const tokens = this.generateTokens(user);

    return { user, ...tokens };
  },

  async registerLibrary(adminData: any, libData: any) {
    const existing = await query('SELECT id FROM users WHERE email = ?', [adminData.email.toLowerCase()]);
    if (existing.length > 0) {
      throw new AppError('EMAIL_TAKEN', 'An account with this email address already exists.', 409);
    }

    const userId = generateUUID();
    const libId = generateUUID();
    const hash = await bcrypt.hash(adminData.password, 10);

    // Create admin user with libraryId
    await execute(
      'INSERT INTO users (id, name, email, password_hash, role, phone, library_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, adminData.name, adminData.email.toLowerCase(), hash, 'LIBRARY_ADMIN', adminData.phone || null, libId]
    );

    // Create library with PENDING status
    await execute(
      `INSERT INTO libraries (
        id, name, description, address, city, latitude, longitude, contact_email, contact_phone,
        status, has_lockers, has_cctv, has_ac, has_wifi, has_power_outlets, is_free, admin_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        libId,
        libData.name,
        libData.description || null,
        libData.address,
        libData.city,
        libData.latitude,
        libData.longitude,
        libData.contactEmail,
        libData.contactPhone || null,
        'PENDING',
        libData.amenities?.lockers ? 1 : 0,
        libData.amenities?.cctv ? 1 : 0,
        libData.amenities?.ac ? 1 : 0,
        libData.amenities?.wifi ? 1 : 0,
        libData.amenities?.powerOutlets ? 1 : 0,
        libData.isFree ? 1 : 0,
        userId,
      ]
    );

    const user = {
      id: userId,
      name: adminData.name,
      email: adminData.email.toLowerCase(),
      role: 'LIBRARY_ADMIN' as const,
      phone: adminData.phone,
      libraryId: libId,
      createdAt: new Date().toISOString(),
    };

    const library = {
      id: libId,
      name: libData.name,
      description: libData.description,
      address: libData.address,
      city: libData.city,
      latitude: libData.latitude,
      longitude: libData.longitude,
      contactEmail: libData.contactEmail,
      contactPhone: libData.contactPhone,
      status: 'PENDING' as const,
      amenities: libData.amenities,
      isFree: libData.isFree,
      seatCounts: { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 },
      totalSeats: 0,
      floorCount: 0,
      createdAt: new Date().toISOString(),
    };

    const tokens = this.generateTokens(user);
    return { user, library, ...tokens };
  },

  async login(email: string, password: string) {
    const users = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
    }

    const userRow = users[0];
    const match = await bcrypt.compare(password, userRow.password_hash);
    if (!match) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
    }

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      phone: userRow.phone,
      libraryId: userRow.library_id,
      createdAt: userRow.created_at,
    };

    const tokens = this.generateTokens(user);
    return { user, ...tokens };
  },

  async refresh(refreshTokenStr: string) {
    try {
      const decoded = jwt.verify(refreshTokenStr, env.JWT_REFRESH_SECRET) as { id: string };
      const users = await query('SELECT * FROM users WHERE id = ?', [decoded.id]);
      if (users.length === 0) {
        throw new AppError('UNAUTHORIZED', 'User not found', 401);
      }
      const userRow = users[0];
      const accessToken = jwt.sign(
        { id: userRow.id, email: userRow.email, role: userRow.role, libraryId: userRow.library_id },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      return { accessToken };
    } catch (err) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    }
  },

  async getMe(userId: string) {
    const users = await query('SELECT id, name, email, role, phone, library_id, created_at FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }
    const u = users[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      libraryId: u.library_id,
      createdAt: u.created_at,
    };
  },
};
