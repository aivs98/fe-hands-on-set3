import { describe, it, expect } from 'vitest';
import { findCommonFreeSlots } from './freeSlots';
import type { Interval } from '../types';

const m = (t: string) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
const iv = (s: string, e: string): Interval => ({ start: m(s), end: m(e) });
const show = (slots: Interval[]) =>
  slots.map((s) => `${String(Math.floor(s.start / 60)).padStart(2, '0')}:${String(s.start % 60).padStart(2, '0')}-${String(Math.floor(s.end / 60)).padStart(2, '0')}:${String(s.end % 60).padStart(2, '0')}`);

describe('findCommonFreeSlots', () => {
  it('empty day: the whole day is free', () => {
    expect(show(findCommonFreeSlots([[], []], 30))).toEqual(['09:00-18:00']);
    expect(show(findCommonFreeSlots([], 30))).toEqual(['09:00-18:00']);
  });

  it('fully booked day: nothing is free', () => {
    expect(findCommonFreeSlots([[iv('09:00', '18:00')]], 30)).toEqual([]);
    // booked by different people back-to-back
    expect(findCommonFreeSlots([[iv('09:00', '13:00')], [iv('13:00', '18:00')]], 15)).toEqual([]);
  });

  it('one booking inside another does not create a false gap', () => {
    expect(show(findCommonFreeSlots([[iv('10:00', '12:00'), iv('10:30', '11:00')]], 30))).toEqual(['09:00-10:00', '12:00-18:00']);
  });

  it('handles unsorted bookings', () => {
    const busy = [iv('15:00', '16:00'), iv('09:00', '10:00'), iv('12:00', '13:00')];
    expect(show(findCommonFreeSlots([busy], 30))).toEqual(['10:00-12:00', '13:00-15:00', '16:00-18:00']);
  });

  it('keeps a gap exactly equal to D and drops one minute shorter', () => {
    const busy = [iv('09:00', '10:00'), iv('10:30', '18:00')];
    expect(show(findCommonFreeSlots([busy], 30))).toEqual(['10:00-10:30']);
    expect(findCommonFreeSlots([busy], 31)).toEqual([]);
  });

  it('acceptance case: A and B with overlapping bookings, D = 30', () => {
    const a = [iv('10:00', '11:00'), iv('09:30', '10:30')];
    const b = [iv('13:00', '14:00'), iv('13:15', '13:45')];
    expect(show(findCommonFreeSlots([a, b], 30))).toEqual(['09:00-09:30', '11:00-13:00', '14:00-18:00']);
  });

  it('clips bookings that stick out of the working day and does not mutate input', () => {
    const busy = [iv('08:00', '09:30'), iv('17:30', '19:00')];
    const copy = JSON.stringify(busy);
    expect(show(findCommonFreeSlots([busy], 30))).toEqual(['09:30-17:30']);
    expect(JSON.stringify(busy)).toBe(copy);
  });

  it('stays fast with 30 attendees x 20 bookings', () => {
    const people: Interval[][] = Array.from({ length: 30 }, (_, p) =>
      Array.from({ length: 20 }, (_, i) => ({ start: 540 + ((p * 7 + i * 23) % 480), end: 540 + ((p * 7 + i * 23) % 480) + 20 })),
    );
    const t0 = performance.now();
    for (let d = 15; d <= 240; d += 15) findCommonFreeSlots(people, d);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});
