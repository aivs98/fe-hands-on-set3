import { todayISO, shiftDate } from '../lib/time.js';
import { findOverlap } from '../lib/validation.js';

export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const wait = () => new Promise((r) => setTimeout(r, 300 + Math.random() * 500)); // 300–800 ms
const FAIL_RATE = 0.1;

const rooms = [
  { id: 'aurora', name: 'Aurora', capacity: 8, floor: 'Floor 2' },
  { id: 'harbor', name: 'Harbor', capacity: 4, floor: 'Floor 2' },
  { id: 'summit', name: 'Summit', capacity: 14, floor: 'Floor 5' },
];

const t = todayISO(), tm = shiftDate(t, 1);
let nextId = 100;
let bookings = [
  { id: 'b1', roomId: 'aurora', date: t, title: 'Design review', start: '10:00', end: '11:00', attendees: ['maya@corp.com', 'li@corp.com'] },
  { id: 'b2', roomId: 'aurora', date: t, title: 'Sprint planning', start: '13:00', end: '14:30', attendees: ['dev@corp.com'] },
  { id: 'b3', roomId: 'aurora', date: t, title: 'Standup', start: '09:00', end: '09:30', attendees: [] },
  { id: 'b4', roomId: 'harbor', date: t, title: '1:1 with Sam', start: '11:00', end: '11:45', attendees: ['sam@corp.com'] },
  { id: 'b5', roomId: 'aurora', date: tm, title: 'Customer demo', start: '15:00', end: '16:00', attendees: ['sales@corp.com'] },
];

export const api = {
  async listRooms() { await wait(); return rooms.map((r) => ({ ...r })); },

  async listBookings(roomId, date) {
    await wait();
    return bookings.filter((b) => b.roomId === roomId && b.date === date).map((b) => ({ ...b }));
  },

  async createBooking(input) {
    await wait();
    if (Math.random() < FAIL_RATE)
      throw new ApiError('SERVER', 'The booking service had a hiccup. Nothing was saved — please try again.');
    const sameDay = bookings.filter((b) => b.roomId === input.roomId && b.date === input.date);
    const clash = findOverlap(input.start, input.end, sameDay);
    if (clash)
      throw new ApiError('CONFLICT', `Someone just booked this room: "${clash.title}" runs ${clash.start}–${clash.end}.`);
    const created = { ...input, id: `b${nextId++}` };
    bookings.push(created);
    return { ...created };
  },

  async cancelBooking(id) {
    await wait();
    if (Math.random() < FAIL_RATE) throw new ApiError('SERVER', 'The booking service had a hiccup.');
    bookings = bookings.filter((b) => b.id !== id);
  },
};
