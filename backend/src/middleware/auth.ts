import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { verifyToken, type TokenPayload } from '../lib/auth.js';

// Augment Express's Request so `req.user` is typed everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * requireAuth — verifies the Bearer token and attaches the decoded user.
 * Rejects with 401 if the token is missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * requireRole — gate a route to one or more roles.
 * Usage: router.get('/payroll', requireAuth, requireRole('OWNER', 'MANAGER'), handler)
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowed.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to do this' });
    }
    next();
  };
}
