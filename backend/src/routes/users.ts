import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const usersRouter = Router();

// Everything in this router requires a logged-in OWNER or MANAGER.
usersRouter.use(requireAuth, requireRole('OWNER', 'MANAGER'));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['OWNER', 'MANAGER', 'KITCHEN', 'FLOOR']),
  position: z.enum(['KITCHEN', 'BAR', 'WAIT', 'MANAGEMENT']),
  phone: z.string().optional(),
  hourlyRateCents: z.number().int().min(0).optional(),
});

// GET /api/users — list all staff
usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { firstName: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        position: true,
        phone: true,
        hourlyRateCents: true,
        isActive: true,
        createdAt: true,
      },
    });
    res.json({ users });
  })
);

// POST /api/users — create a staff member
usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }
    const data = parsed.data;

    // Only an OWNER can create another OWNER.
    if (data.role === 'OWNER' && req.user!.role !== 'OWNER') {
      return res
        .status(403)
        .json({ error: 'Only an owner can create another owner' });
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return res.status(409).json({ error: 'A user with that email exists' });
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await hashPassword(data.password),
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        position: data.position,
        phone: data.phone,
        hourlyRateCents: data.hourlyRateCents ?? 0,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        position: true,
      },
    });

    await prisma.auditLog.create({
      data: { actorId: req.user!.sub, action: 'user.create', target: user.id },
    });

    res.status(201).json({ user });
  })
);

// PATCH /api/users/:id/deactivate — soft-disable a staff member
usersRouter.patch(
  '/:id/deactivate',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (id === req.user!.sub) {
      return res.status(400).json({ error: 'You cannot deactivate yourself' });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
    await prisma.auditLog.create({
      data: { actorId: req.user!.sub, action: 'user.deactivate', target: id },
    });
    res.json({ user });
  })
);
