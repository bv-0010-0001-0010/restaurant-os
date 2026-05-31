// Small date helpers for the roster. Weeks start on Monday.

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function dayLabel(date: Date): string {
  const idx = (date.getDay() + 6) % 7; // Monday-indexed
  return DAY_NAMES[idx];
}

export function dateLabel(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${dateLabel(weekStart)} – ${dateLabel(end)}, ${end.getFullYear()}`;
}

// "09:00" style time from an ISO string.
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function hoursBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return ms / (1000 * 60 * 60);
}

// Builds an ISO datetime from a date + "HH:MM" time string, in local time.
export function isoFromDateAndTime(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
