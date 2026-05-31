import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { shiftsRouter } from './routes/shifts.js';

const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());

// Health check — handy for confirming the server is up.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/shifts', shiftsRouter);

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
