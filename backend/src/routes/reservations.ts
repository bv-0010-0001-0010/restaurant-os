import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const reservationsRouter = Router();
reservationsRouter.use(requireAuth, requireRole('OWNER', 'MANAGER', 'FLOOR'));

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SEATED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

// ── GET /api/reservations?date=YYYY-MM-DD ───────────────────────
// All bookings for a single day, earliest first, with guest details.
reservationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
    }
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const reservations = await prisma.reservation.findMany({
      where: { startsAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { startsAt: 'asc' },
      include: { guest: true },
    });

    // Covers = sum of party sizes for bookings that aren't cancelled/no-show.
    const covers = reservations
      .filter((r) => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW')
      .reduce((sum, r) => sum + r.partySize, 0);

    res.json({ reservations, covers });
  })
);

// A booking can attach to an existing guest (guestId) OR carry a new guest
// to create inline (newGuest). Exactly one must be present.
const createSchema = z
  .object({
    guestId: z.string().optional(),
    newGuest: z
      .object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().max(40).optional(),
        email: z.string().email().optional().or(z.literal('')),
        dietaryNotes: z.string().max(500).optional(),
      })
      .optional(),
    startsAt: z.string().datetime(),
    partySize: z.number().int().min(1).max(100),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => !!d.guestId !== !!d.newGuest, {
    message: 'Provide either an existing guest or new guest details',
  });

// ── POST /api/reservations ──────────────────────────────────────
reservationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }
    const d = parsed.data;

    // Resolve the guest: use existing, or create a new one.
    let guestId = d.guestId;
    if (!guestId && d.newGuest) {
      const g = await prisma.guest.create({
        data: {
          firstName: d.newGuest.firstName,
          lastName: d.newGuest.lastName,
          phone: d.newGuest.phone || null,
          email: d.newGuest.email || null,
          dietaryNotes: d.newGuest.dietaryNotes || null,
        },
      });
      guestId = g.id;
    }

    const reservation = await prisma.reservation.create({
      data: {
        guestId: guestId!,
        startsAt: new Date(d.startsAt),
        partySize: d.partySize,
        notes: d.notes || null,
      },
      include: { guest: true },
    });

    res.status(201).json({ reservation });
  })
);

const updateSchema = z.object({
  startsAt: z.string().datetime().optional(),
  partySize: z.number().int().min(1).max(100).optional(),
  status: z.enum(STATUSES).optional(),
  notes: z.string().max(500).optional(),
});

// ── PATCH /api/reservations/:id ─────────────────────────────────
// Used both for editing details and for quick status changes.
reservationsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    const d = parsed.data;
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: {
        ...(d.startsAt ? { startsAt: new Date(d.startsAt) } : {}),
        ...(d.partySize ? { partySize: d.partySize } : {}),
        ...(d.status ? { status: d.status } : {}),
        ...(d.notes !== undefined ? { notes: d.notes || null } : {}),
      },
      include: { guest: true },
    });
    res.json({ reservation });
  })
);
