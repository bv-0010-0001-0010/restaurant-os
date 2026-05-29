import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Role, Position } from '@prisma/client';
import { config } from '../config/index.js';

export interface TokenPayload {
  sub: string; // user id
  role: Role;
  position: Position;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
