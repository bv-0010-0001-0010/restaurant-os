import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  calcPayslip,
  hoursBetween,
  DEFAULT_TAX_RATE_PCT,
  DEFAULT_SUPER_RATE_PCT,
} from '../lib/payroll.js';

export const payrollRouter = Router();
payrollRouter.use(requireAuth);

// Sums each active user's completed (clocked-out) hours within a period,
// then runs the pay calc. Returns one line per user who worked.
async function buildPayslips(
  from: Date,
  to: Date,
  taxRatePct: number,
  superRatePct: number
) {
  // Only completed entries (clockOut set) within the window count.
  const entries = await prisma.timeEntry.findMany({
    where: {
      clockIn: { gte: from },
      clockOut: { not: null, lte: to },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          hourlyRateCents: true,
        },
      },
    },
  });

  // Group hours by user.
  const byUser = new Map<
    string,
    {
      user: (typeof entries)[number]['user'];
      hours: number;
    }
  >();

  for (const e of entries) {
    if (!e.clockOut) continue;
    const hrs = hoursBetween(e.clockIn, e.clockOut);
    const existing = byUser.get(e.userId);
    if (existing) {
      existing.hours += hrs;
    } else {
      byUser.set(e.userId, { user: e.user, hours: hrs });
    }
  }

  return Array.from(byUser.values()).map(({ user, hours }) => {
    const calc = calcPayslip(
      hours,
      user.hourlyRateCents,
      taxRatePct,
      superRatePct
    );
    return {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      position: user.position,
      ...calc,
    };
  });
}

const previewSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  taxRatePct: z.number().min(0).max(100).optional(),
  superRatePct: z.number().min(0).max(100).optional(),
});

// ── POST /api/payroll/preview ── manager only ───────────────────
// Computes payslips for a period WITHOUT saving. Used to review before
// committing a pay run.
payrollRouter.post(
  '/preview',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'from and to are required' });
    }
    const taxRatePct = parsed.data.taxRatePct ?? DEFAULT_TAX_RATE_PCT;
    const superRatePct = parsed.data.superRatePct ?? DEFAULT_SUPER_RATE_PCT;

    const lines = await buildPayslips(
      new Date(parsed.data.from),
      new Date(parsed.data.to),
      taxRatePct,
      superRatePct
    );

    const totals = lines.reduce(
      (acc, l) => ({
        grossCents: acc.grossCents + l.grossCents,
        taxCents: acc.taxCents + l.taxCents,
        superCents: acc.superCents + l.superCents,
        netCents: acc.netCents + l.netCents,
        hours: acc.hours + l.hoursWorked,
      }),
      { grossCents: 0, taxCents: 0, superCents: 0, netCents: 0, hours: 0 }
    );

    res.json({ lines, totals, taxRatePct, superRatePct });
  })
);

// ── POST /api/payroll/commit ── owner only ──────────────────────
// Saves a pay run + payslips. Owner-only since it freezes payment figures.
payrollRouter.post(
  '/commit',
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'from and to are required' });
    }
    const from = new Date(parsed.data.from);
    const to = new Date(parsed.data.to);
    const taxRatePct = parsed.data.taxRatePct ?? DEFAULT_TAX_RATE_PCT;
    const superRatePct = parsed.data.superRatePct ?? DEFAULT_SUPER_RATE_PCT;

    const lines = await buildPayslips(from, to, taxRatePct, superRatePct);
    if (lines.length === 0) {
      return res
        .status(400)
        .json({ error: 'No completed hours found in that period' });
    }

    const payRun = await prisma.payRun.create({
      data: {
        periodStart: from,
        periodEnd: to,
        taxRatePct,
        superRatePct,
        payslips: {
          create: lines.map((l) => ({
            userId: l.userId,
            hoursWorked: l.hoursWorked,
            hourlyRateCents: l.hourlyRateCents,
            grossCents: l.grossCents,
            taxCents: l.taxCents,
            superCents: l.superCents,
            netCents: l.netCents,
          })),
        },
      },
      include: { payslips: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'payrun.commit',
        target: payRun.id,
      },
    });

    res.status(201).json({ payRun });
  })
);

// ── GET /api/payroll/runs ── manager only ───────────────────────
payrollRouter.get(
  '/runs',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (_req, res) => {
    const runs = await prisma.payRun.findMany({
      orderBy: { periodStart: 'desc' },
      include: {
        payslips: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, position: true },
            },
          },
        },
      },
    });
    res.json({ runs });
  })
);

// ── GET /api/payroll/my-payslips ── any logged-in user ──────────
// Staff see only their own payslips.
payrollRouter.get(
  '/my-payslips',
  asyncHandler(async (req, res) => {
    const payslips = await prisma.payslip.findMany({
      where: { userId: req.user!.sub },
      orderBy: { payRun: { periodStart: 'desc' } },
      include: { payRun: true },
    });
    res.json({ payslips });
  })
);
