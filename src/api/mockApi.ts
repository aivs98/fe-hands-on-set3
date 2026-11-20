import type { Booking, NewBooking, Person, Room } from '../types';
import { shiftDate, todayISO, toMin } from '../lib/time';

export type ApiErrorCode = 'CONFLICT' | 'NO_ROOM' | 'SERVER';
export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) { super(message); this.code = code; }
}

const delay = (min: number, max: number) =>
  new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)));
const CONFLICT_RATE = 0.25; // simulates a colleague booking the same time meanwhile

const NAMES = [
  'Alice Nair', 'Bob Singh', 'Chen Wei', 'Diya Rao', 'Emil Berg', 'Farah Khan', 'Gabriel Costa', 'Hana Sato',
  'Ivan Petrov', 'Jamal Reed', 'Kavya Menon', 'Liam Walsh', 'Maria Lopez', 'Noah Fischer', 'Omar Haddad',
  'Priya Iyer', 'Quinn Davis', 'Rohan Das', 'Sofia Rossi', 'Tariq Aziz', 'Uma Pillai', 'Victor Hugo',
  'Wendy Park', 'Xavier Dube', 'Yara Nasser', 'Zane Cole', 'Anita Joseph', 'Bruno Silva', 'Cleo Martin',
  'Dev Patel', 'Elena Ivanova', 'Felix Braun', 'Grace Okafor', 'Hugo Laurent', 'Isha Kapoor',
];
const people: Person[] = NAMES.map((name, i) => ({ id: `p${i + 1}`, name }));
const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;

const rooms: Room[] = [
  { id: 'huddle', name: 'Huddle', capacity: 4 },
  { id: 'harbor', name: 'Harbor', capacity: 8 },
  { id: 'aurora', name: 'Aurora', capacity: 12 },
  { id: 'summit', name: 'Summit', capacity: 20 },
  { id: 'forum', name: 'Forum', capacity: 40 },
];

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
let nextId = 1000;
const newId = () => `b${nextId++}`;

// ---- seed data (deterministic) -------------------------------------------------------------
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const today = todayISO();
const bookings: Booking[] = [];
const seed = (personId: string, date: string, start: string, end: string, title: string, roomId = 'aurora') =>
  bookings.push({ id: newId(), roomId, date, title, start, end, attendees: [personId] });

// Acceptance scenario for today: Alice (p1) has overlapping bookings, Bob (p2) too.
seed('p1', today, '10:00', '11:00', 'Design review');
seed('p1', today, '09:30', '10:30', 'Roadmap sync');
seed('p2', today, '13:00', '14:00', 'Vendor call');
seed('p2', today, '13:15', '13:45', 'Interview debrief');

const rand = mulberry32(42);
for (let day = 0; day < 7; day++) {
  const date = shiftDate(today, day);
  for (const p of people.slice(2)) {
    const count = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const start = 540 + Math.floor(rand() * 34) * 15;
      const end = Math.min(1080, start + 30 + Math.floor(rand() * 7) * 15);
      seed(p.id, date, hhmm(start), hhmm(end), 'Busy', rooms[Math.floor(rand() * rooms.length)].id);
    }
  }
}

// ---- endpoints -----------------------------------------------------------------------------
export const api = {
  async listPeople(): Promise<Person[]> { await delay(300, 600); return people.map((p) => ({ ...p })); },

  /** All bookings on `date` that include at least one of the given people. Deliberately slow & jittery. */
  async listBookingsForPeople(personIds: string[], date: string): Promise<Booking[]> {
    await delay(300, 1500);
    const ids = new Set(personIds);
    return bookings
      .filter((b) => b.date === date && b.attendees.some((a) => ids.has(a)))
      .map((b) => ({ ...b, attendees: [...b.attendees] }));
  },

  /** Rooms that fit `minCapacity` people and are free in the window, smallest first. */
  async findAvailableRooms(date: string, start: string, end: string, minCapacity: number): Promise<Room[]> {
    await delay(300, 700);
    const s = toMin(start), e = toMin(end);
    return rooms
      .filter((r) => r.capacity >= minCapacity)
      .filter((r) => !bookings.some((b) => b.roomId === r.id && b.date === date && s < toMin(b.end) && e > toMin(b.start)))
      .sort((a, b) => a.capacity - b.capacity)
      .map((r) => ({ ...r }));
  },

  async createBooking(input: NewBooking): Promise<Booking> {
    await delay(400, 900);
    const s = toMin(input.start), e = toMin(input.end);
    const overlaps = (b: Booking) => b.date === input.date && s < toMin(b.end) && e > toMin(b.start);

    const room = rooms.find((r) => r.id === input.roomId);
    if (!room || room.capacity < input.attendees.length)
      throw new ApiError('NO_ROOM', 'That room is too small for the group.');

    const roomClash = bookings.find((b) => b.roomId === room.id && overlaps(b));
    if (roomClash) throw new ApiError('CONFLICT', `${room.name} was just booked for ${roomClash.start}–${roomClash.end}.`);

    const personClash = bookings.find((b) => overlaps(b) && b.attendees.some((a) => input.attendees.includes(a)));
    if (personClash) {
      const who = personClash.attendees.find((a) => input.attendees.includes(a))!;
      throw new ApiError('CONFLICT', `${nameOf(who)} is no longer free — they now have "${personClash.title}" ${personClash.start}–${personClash.end}.`);
    }

    if (Math.random() < CONFLICT_RATE) {
      // A colleague "wins the race": their booking really lands, so the recalculation will show it.
      const victim = input.attendees[Math.floor(Math.random() * input.attendees.length)];
      const otherRoom = rooms.find((r) => r.id !== room.id)!;
      bookings.push({ id: newId(), roomId: otherRoom.id, date: input.date, title: 'Client call', start: input.start, end: input.end, attendees: [victim] });
      throw new ApiError('CONFLICT', `${nameOf(victim)} just accepted another meeting at ${input.start}–${input.end}.`);
    }

    const created: Booking = { ...input, id: newId() };
    bookings.push(created);
    return { ...created, attendees: [...created.attendees] };
  },
};
