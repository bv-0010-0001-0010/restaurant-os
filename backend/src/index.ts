import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { join } from 'node:path';
import { config } from './config/index.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { shiftsRouter } from './routes/shifts.js';
import { timeRouter } from './routes/time.js';
import { payrollRouter } from './routes/payroll.js';
import { guestsRouter } from './routes/guests.js';
import { reservationsRouter } from './routes/reservations.js';

const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' })); // photos arrive as base64

// Serve clock-in photos in local dev. In production these live in object
// storage and this line goes away.
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

// Health check — handy for confirming the server is up.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/time', timeRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/guests', guestsRouter);
app.use('/api/reservations', reservationsRouter);

// 404 for anything else under /api
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

app.listen(config.port, () => {
  console.log(`API running at http://localhost:${config.port}`);
});
