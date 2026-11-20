import { describe, it, expect } from 'vitest';
import { validateBooking, validateEmail } from './validation.js';

const existing = [{ id: '1', title: 'Design review', start: '10:00', end: '11:00' }];
const draft = (start, end, extra = {}) => ({ title: 'Sync', start, end, attendees: [], ...extra });

describe('validateBooking', () => {
  it('blocks a partial overlap (10:30–11:30 over 10:00–11:00)', () => {
    expect(validateBooking(draft('10:30', '11:30'), existing).end).toMatch(/Overlaps "Design review"/);
  });
  it('allows back-to-back bookings (11:00–12:00 and 09:00–10:00)', () => {
    expect(validateBooking(draft('11:00', '12:00'), existing)).toEqual({});
    expect(validateBooking(draft('09:00', '10:00'), existing)).toEqual({});
  });
  it('blocks a booking that completely covers an existing one', () => {
    const e = [{ id: '2', title: 'Standup', start: '10:00', end: '10:30' }];
    expect(validateBooking(draft('09:00', '12:00'), e).end).toBeDefined();
  });
  it('enforces hours, ordering and the 4 hour limit', () => {
    expect(validateBooking(draft('08:45', '09:30'), []).start).toBeDefined();
    expect(validateBooking(draft('17:30', '18:15'), []).end).toBeDefined();
    expect(validateBooking(draft('11:00', '11:00'), []).end).toBeDefined();
    expect(validateBooking(draft('09:00', '13:15'), []).end).toMatch(/4 hours/);
    expect(validateBooking(draft('09:00', '13:00'), [])).toEqual({});
  });
  it('requires a title and valid, unique emails', () => {
    expect(validateBooking(draft('09:00', '10:00', { title: ' ' }), []).title).toBeDefined();
    expect(validateBooking(draft('09:00', '10:00', { attendees: ['nope'] }), []).attendees).toBeDefined();
    expect(validateBooking(draft('09:00', '10:00', { attendees: ['a@x.io', 'A@x.io'] }), []).attendees).toMatch(/already/);
  });
});

describe('validateEmail', () => {
  it('accepts valid and rejects invalid / duplicate addresses', () => {
    expect(validateEmail('ana@corp.com', [])).toBeNull();
    expect(validateEmail('ana@corp', [])).not.toBeNull();
    expect(validateEmail('ana@corp.com', ['ANA@corp.com'])).not.toBeNull();
  });
});
