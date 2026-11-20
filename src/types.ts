/** Minutes since midnight, half-open: [start, end). */
export interface Interval { start: number; end: number }

export interface Person { id: string; name: string }
export interface Room { id: string; name: string; capacity: number }

export interface Booking {
  id: string;
  roomId: string;
  date: string;       // YYYY-MM-DD
  title: string;
  start: string;      // HH:MM
  end: string;        // HH:MM
  attendees: string[]; // person ids
}

export type NewBooking = Omit<Booking, 'id'>;
