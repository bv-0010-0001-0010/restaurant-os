import type { Position } from './index';
import type { Shift } from './shift';

export interface TimeEntryUser {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
}

export interface TimeEntry {
  id: string;
  userId: string;
  shiftId?: string | null;
  clockIn: string;
  clockOut?: string | null;
  clockInPhoto: string;
  clockOutPhoto?: string | null;
  lateByMinutes?: number | null;
  shift?: Shift | null;
  user?: TimeEntryUser;
}
