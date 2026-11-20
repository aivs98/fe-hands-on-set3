import { DAY_START, DAY_END, MAX_MINUTES, toMin } from './time.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns an error message, or null when `raw` can be added to `list`. */
export function validateEmail(raw, list = []) {
  const email = raw.trim();
  if (!email) return 'Enter an email address.';
  if (!EMAIL.test(email)) return `"${email}" isn't a valid email address.`;
  if (list.some((e) => e.toLowerCase() === email.toLowerCase())) return `${email} is already on the list.`;
  return null;
}

/** First existing booking that overlaps [start, end). Touching edges do NOT overlap. */
export function findOverlap(start, end, bookings) {
  const s = toMin(start), e = toMin(end);
  return bookings.find((b) => s < toMin(b.end) && e > toMin(b.start));
}

/** Returns { title?, start?, end?, attendees? } — an empty object means valid. */
export function validateBooking({ title, start, end, attendees }, existing) {
  const errors = {};
  if (!title.trim()) errors.title = 'Give the meeting a title.';
  else if (title.trim().length > 80) errors.title = 'Keep the title under 80 characters.';

  if (!start) errors.start = 'Choose a start time.';
  if (!end) errors.end = 'Choose an end time.';
  if (start && end) {
    const s = toMin(start), e = toMin(end);
    if (s < DAY_START) errors.start = 'Rooms open at 09:00.';
    else if (e > DAY_END) errors.end = 'Rooms close at 18:00.';
    else if (s >= e) errors.end = 'The end time must be after the start time.';
    else if (e - s > MAX_MINUTES) errors.end = 'Meetings can last 4 hours at most.';
    else {
      const clash = findOverlap(start, end, existing);
      if (clash)
        errors.end = `Overlaps "${clash.title}" (${clash.start}–${clash.end}). Back-to-back is fine — try starting at ${clash.end} or ending at ${clash.start}.`;
    }
  }

  const seen = [];
  for (const email of attendees) {
    const err = validateEmail(email, seen);
    if (err) { errors.attendees = err; break; }
    seen.push(email);
  }
  return errors;
}
