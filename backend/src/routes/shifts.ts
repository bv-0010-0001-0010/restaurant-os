import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const shiftsRouter = Router();

// All roster routes need a logged-in user.
shiftsRouter.use(requireAuth);

const isManager = (role: string) => role === 'OWNER' || role === 'MANAGER';

// ── GET /api/shifts?from=ISO&to=ISO ─────────────────────────────
// Managers see every shift in the range (draft + published).
// Staff see only their own, and only once published.
const rangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

shiftsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = rangeSchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'from and to (ISO datetimes) are required' });
    }
    const { from, to } = parsed.data;
    const manager = isManager(req.user!.role);

    const shifts = await prisma.shift.findMany({
      where: {
        startsAt: { gte: new Date(from), lte: new Date(to) },
        ...(manager ? {} : { userId: req.user!.sub, published: true }),
      },
      orderBy: { startsAt: 'asc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
      },
    });

    res.json({ shifts });
  })
);

// ── Create / update shared validation ───────────────────────────
const shiftBodySchema = z
  .object({
    userId: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    position: z.enum(['KITCHEN', 'BAR', 'WAIT', 'MANAGEMENT']),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: 'End time must be after start time',
  });

// Returns an overlapping shift for the same user, if any (ignores `excludeId`
// so editing a shift doesn't conflict with itself).
async function findOverlap(
  userId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
) {
  return prisma.shift.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
}

// ── POST /api/shifts ── manager only ────────────────────────────
shiftsRouter.post(
  '/',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const parsed = shiftBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }
    const data = parsed.data;
    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);

    const clash = await findOverlap(data.userId, start, end);
    if (clash) {
      return res
        .status(409)
        .json({ error: 'This staff member already has a shift then' });
    }

    const shift = await prisma.shift.create({
      data: {
        userId: data.userId,
        startsAt: start,
        endsAt: end,
        position: data.position,
        notes: data.notes,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: { actorId: req.user!.sub, action: 'shift.create', target: shift.id },
    });

    res.status(201).json({ shift });
  })
);

// ── PATCH /api/shifts/:id ── manager only ───────────────────────
shiftsRouter.patch(
  '/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const parsed = shiftBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }
    const data = parsed.data;
    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);

    const clash = await findOverlap(data.userId, start, end, req.params.id);
    if (clash) {
      return res
        .status(409)
        .json({ error: 'This staff member already has a shift then' });
    }

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        userId: data.userId,
        startsAt: start,
        endsAt: end,
        position: data.position,
        notes: data.notes,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
      },
    });

    res.json({ shift });
  })
);

// ── DELETE /api/shifts/:id ── manager only ──────────────────────
shiftsRouter.delete(
  '/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    await prisma.shift.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'shift.delete',
        target: req.params.id,
      },
    });
    res.status(204).end();
  })
);

// ── POST /api/shifts/publish ── manager only ────────────────────
// Publishes every draft shift in a date range, making them visible to staff.
shiftsRouter.post(
  '/publish',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const parsed = rangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'from and to are required' });
    }
    const result = await prisma.shift.updateMany({
      where: {
        startsAt: { gte: new Date(parsed.data.from), lte: new Date(parsed.data.to) },
        published: false,
      },
      data: { published: true },
    });
    res.json({ published: result.count });
  })
);
