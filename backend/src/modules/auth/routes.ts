import { Router } from 'express';
import { authService } from './service';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimit';
import { registerSchema, loginSchema, registerLibrarySchema } from './schema';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/errors';

export const authRouter = Router();

// POST /auth/register
authRouter.post('/register', authRateLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const result = await authService.registerUser(name, email, password, phone);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });
    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, undefined, 201);
  } catch (err) {
    next(err);
  }
});

// POST /auth/register-library
authRouter.post('/register-library', authRateLimiter, validate(registerLibrarySchema), async (req, res, next) => {
  try {
    const { admin, library } = req.body;
    const result = await authService.registerLibrary(admin, library);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });
    sendSuccess(res, { user: result.user, accessToken: result.accessToken, library: result.library }, undefined, 201);
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
authRouter.post('/login', authRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });
    sendSuccess(res, { user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new AppError('UNAUTHORIZED', 'Refresh token cookie required', 401);
    }
    const result = await authService.refresh(refreshToken);
    sendSuccess(res, { accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
authRouter.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  sendSuccess(res, { ok: true });
});

// GET /auth/me
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
});
