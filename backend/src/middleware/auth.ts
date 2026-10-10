import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export interface AuthUser {
  id: string;
  email: string;
  role: 'SITE_OWNER' | 'LIBRARY_ADMIN' | 'USER';
  libraryId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Access token is required', 401));
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch (err) {
    return next(new AppError('UNAUTHORIZED', 'Invalid or expired access token', 401));
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
      req.user = payload;
    } catch (e) {
      // ignore
    }
  }
  next();
}
