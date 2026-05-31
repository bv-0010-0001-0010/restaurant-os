export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SEATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  dietaryNotes?: string | null;
  notes?: string | null;
  reservations?: Reservation[];
}

export interface Reservation {
  id: string;
  guestId: string;
  startsAt: string;
  partySize: number;
  status: ReservationStatus;
  notes?: string | null;
  guest: Guest;
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SEATED: 'Seated',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

// The status a booking can move to next, in order, for quick-action buttons.
export const NEXT_STATUS: Partial<Record<ReservationStatus, ReservationStatus>> =
  {
    PENDING: 'CONFIRMED',
    CONFIRMED: 'SEATED',
    SEATED: 'COMPLETED',
  };
