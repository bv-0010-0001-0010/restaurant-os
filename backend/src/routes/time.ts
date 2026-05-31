import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { savePhoto } from '../lib/photoStorage.js';

export const timeRouter = Router();
timeRouter.use(requireAuth);

const isManager = (role: string) => role === 'OWNER' || role === 'MANAGER';

// Finds the shift a clock-in most likely belongs to: a shift for this user
// that starts within a window around now (from 6h before to 6h after).
async function findMatchingShift(userId: string, when: Date) {
  const sixHours = 6 * 60 * 60 * 1000;
  return prisma.shift.findFirst({
    where: {
      userId,
      startsAt: {
        gte: new Date(when.getTime() - sixHours),
        lte: new Date(when.getTime() + sixHours),
      },
    },
    orderBy: { startsAt: 'asc' },
  });
}

// ── GET /api/time/status ────────────────────────────────────────
// The current user's open entry (if clocked in) and today's shift.
timeRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const open = await prisma.timeEntry.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
      include: { shift: true },
    });

    // Today's shift (00:00 to 24:00 local-ish, using server day).
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const todayShift = await prisma.shift.findFirst({
      where: {
        userId,
        published: true,
        startsAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { startsAt: 'asc' },
    });

    res.json({ openEntry: open, todayShift });
  })
);

const clockInSchema = z.object({
  photo: z.string().min(1), // base64 data URL
});

// ── POST /api/time/clock-in ─────────────────────────────────────
timeRouter.post(
  '/clock-in',
  asyncHandler(async (req, res) => {
    const parsed = clockInSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'A photo is required to clock in' });
    }
    const userId = req.user!.sub;

    // Can't clock in twice.
    const existing = await prisma.timeEntry.findFirst({
      where: { userId, clockOut: null },
    });
    if (existing) {
      return res.status(409).json({ error: 'You are already clocked in' });
    }

    const now = new Date();
    const shift = await findMatchingShift(userId, now);

    // Late by how many minutes vs the scheduled start? Null if no shift.
    let lateByMinutes: number | null = null;
    if (shift) {
      lateByMinutes = Math.round(
        (now.getTime() - shift.startsAt.getTime()) / 60000
      );
    }

    const photoPath = await savePhoto(parsed.data.photo, `in-${userId}`);

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        shiftId: shift?.id ?? null,
        clockIn: now,
        clockInPhoto: photoPath,
        lateByMinutes,
      },
      include: { shift: true },
    });

    res.status(201).json({ entry });
  })
);

// ── POST /api/time/clock-out ────────────────────────────────────
timeRouter.post(
  '/clock-out',
  asyncHandler(async (req, res) => {
    const parsed = clockInSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'A photo is required to clock out' });
    }
    const userId = req.user!.sub;

    const open = await prisma.timeEntry.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });
    if (!open) {
      return res.status(409).json({ error: 'You are not clocked in' });
    }

    const photoPath = await savePhoto(parsed.data.photo, `out-${userId}`);

    const entry = await prisma.timeEntry.update({
      where: { id: open.id },
      data: { clockOut: new Date(), clockOutPhoto: photoPath },
      include: { shift: true },
    });

    res.json({ entry });
  })
);

// ── GET /api/time/on-now ── manager only ────────────────────────
// Everyone currently clocked in.
timeRouter.get(
  '/on-now',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (_req, res) => {
    const entries = await prisma.timeEntry.findMany({
      where: { clockOut: null },
      orderBy: { clockIn: 'asc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
        shift: true,
      },
    });
    res.json({ entries });
  })
);

// ── GET /api/time/entries ───────────────────────────────────────
// Timesheet log. Managers see everyone (optionally filtered by ?userId=);
// staff see only their own.
const listSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.string().optional(),
});

timeRouter.get(
  '/entries',
  asyncHandler(async (req, res) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query' });
    }
    const { from, to, userId } = parsed.data;
    const manager = isManager(req.user!.role);

    const entries = await prisma.timeEntry.findMany({
      where: {
        // Staff are locked to their own entries regardless of query.
        userId: manager ? userId : req.user!.sub,
        clockIn: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      },
      orderBy: { clockIn: 'desc' },
      take: 200,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
        shift: true,
      },
    });
    res.json({ entries });
  })
);
