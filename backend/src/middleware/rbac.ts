import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { query } from '../config/db';

export function requireRole(...allowedRoles: Array<'SITE_OWNER' | 'LIBRARY_ADMIN' | 'USER'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 'Insufficient permissions for this resource', 403));
    }

    next();
  };
}

export async function requireApprovedLibrary(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'LIBRARY_ADMIN' || !req.user.libraryId) {
    return next(new AppError('FORBIDDEN', 'Library administrator account required', 403));
  }

  // Exempt GET /admin/library from approved check so admin can inspect profile
  if (req.method === 'GET' && req.path === '/library') {
    return next();
  }

  try {
    const libs = await query('SELECT status FROM libraries WHERE id = ?', [req.user.libraryId]);
    if (!libs || libs.length === 0 || libs[0].status !== 'APPROVED') {
      return next(
        new AppError(
          'LIBRARY_NOT_APPROVED',
          'This library is still awaiting site owner approval',
          403
        )
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}
