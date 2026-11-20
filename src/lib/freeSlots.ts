import type { Booking, Interval } from '../types';

export const DAY_START = 9 * 60;
export const DAY_END = 18 * 60;

/** Clips to [from, to], drops empty intervals, sorts and merges overlapping/touching ones. Input is not mutated. */
export function mergeIntervals(
  intervals: readonly Interval[],
  from: number = DAY_START,
  to: number = DAY_END,
): Interval[] {
  const clipped: Interval[] = [];
  for (const iv of intervals) {
    const start = Math.max(iv.start, from);
    const end = Math.min(iv.end, to);
    if (end > start) clipped.push({ start, end });
  }
  clipped.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Interval[] = [];
  for (const iv of clipped) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else merged.push(iv);
  }
  return merged;
}

/**
 * Every window of at least `minLength` minutes in which NOBODY is busy.
 * Busy intervals may be unsorted and may overlap each other (also within one person).
 * Runs in O(n log n) for n total busy intervals.
 */
export function findCommonFreeSlots(
  busyByPerson: readonly (readonly Interval[])[],
  minLength: number,
  from: number = DAY_START,
  to: number = DAY_END,
): Interval[] {
  const busy = mergeIntervals(busyByPerson.flat(), from, to);
  const need = Math.max(minLength, 1);
  const slots: Interval[] = [];

  let cursor = from;
  for (const b of busy) {
    if (b.start - cursor >= need) slots.push({ start: cursor, end: b.start });
    cursor = b.end; // `busy` is merged, so b.end is always >= cursor
  }
  if (to - cursor >= need) slots.push({ start: cursor, end: to });
  return slots;
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Groups bookings into one busy list per requested person (a booking counts for each of its attendees). */
export function groupBusyByPerson(
  bookings: readonly Booking[],
  personIds: readonly string[],
): Map<string, Interval[]> {
  const result = new Map<string, Interval[]>(personIds.map((id): [string, Interval[]] => [id, []]));
  for (const b of bookings) {
    const iv = { start: toMinutes(b.start), end: toMinutes(b.end) };
    for (const id of b.attendees) result.get(id)?.push(iv);
  }
  return result;
}
