import type { Request, Response, NextFunction } from 'express';

// Wraps an async route handler so thrown errors / rejected promises
// flow into Express's error handler instead of crashing the process.
type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
