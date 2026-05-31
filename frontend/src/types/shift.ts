import type { Position } from './index';

export interface ShiftUser {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
}

export interface Shift {
  id: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  position: Position;
  notes?: string | null;
  published: boolean;
  user: ShiftUser;
}
