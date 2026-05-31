import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const guestsRouter = Router();

// Reservations are front-of-house: owner, manager, and floor staff (hosts).
// Kitchen is excluded.
guestsRouter.use(requireAuth, requireRole('OWNER', 'MANAGER', 'FLOOR'));

// ── GET /api/guests?q=search ────────────────────────────────────
// Search by name or phone. Used by the booking form's guest picker.
guestsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const guests = await prisma.guest.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { lastName: 'asc' },
      take: 20,
    });
    res.json({ guests });
  })
);

// ── GET /api/guests/:id ── one guest + their visit history ──────
guestsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const guest = await prisma.guest.findUnique({
      where: { id: req.params.id },
      include: {
        reservations: { orderBy: { startsAt: 'desc' }, take: 50 },
      },
    });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json({ guest });
  })
);

const guestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal('')),
  dietaryNotes: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

// ── POST /api/guests ────────────────────────────────────────────
guestsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = guestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }
    const d = parsed.data;
    const guest = await prisma.guest.create({
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone || null,
        email: d.email || null,
        dietaryNotes: d.dietaryNotes || null,
        notes: d.notes || null,
      },
    });
    res.status(201).json({ guest });
  })
);

// ── PATCH /api/guests/:id ───────────────────────────────────────
guestsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = guestSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    const d = parsed.data;
    const guest = await prisma.guest.update({
      where: { id: req.params.id },
      data: {
        ...(d.firstName !== undefined ? { firstName: d.firstName } : {}),
        ...(d.lastName !== undefined ? { lastName: d.lastName } : {}),
        ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
        ...(d.email !== undefined ? { email: d.email || null } : {}),
        ...(d.dietaryNotes !== undefined
          ? { dietaryNotes: d.dietaryNotes || null }
          : {}),
        ...(d.notes !== undefined ? { notes: d.notes || null } : {}),
      },
    });
    res.json({ guest });
  })
);
