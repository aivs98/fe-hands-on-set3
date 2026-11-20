import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/mockApi';
import { formatDuration, toTime } from '../lib/time';
import type { Booking, Interval, Person, Room } from '../types';

interface Props {
  slot: Interval;
  duration: number;
  date: string;
  attendees: Person[];
  onClose: () => void;
  onBooked: (booking: Booking, room: Room) => void;
  onConflict: (message: string) => void;
}

export default function BookingDialog({ slot, duration, date, attendees, onClose, onBooked, onConflict }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const startOptions = useMemo(() => {
    const out: number[] = [];
    for (let s = slot.start; s + duration <= slot.end; s += 15) out.push(s);
    return out;
  }, [slot, duration]);

  const [start, setStart] = useState(slot.start);
  const [title, setTitle] = useState('Team sync');
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { ref.current?.showModal(); }, []);

  // Rooms depend on the chosen start; ignore late answers for an older start.
  useEffect(() => {
    let live = true;
    setRooms(null); setError(null);
    api.findAvailableRooms(date, toTime(start), toTime(start + duration), attendees.length)
      .then((r) => { if (live) { setRooms(r); setRoomId(r[0]?.id ?? ''); } })
      .catch(() => { if (live) { setRooms([]); setError('Couldn’t check room availability. Try again.'); } });
    return () => { live = false; };
  }, [date, start, duration, attendees.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !roomId || !title.trim()) return;
    setSaving(true); setError(null);
    try {
      const booking = await api.createBooking({
        roomId, date, title: title.trim(), start: toTime(start), end: toTime(start + duration),
        attendees: attendees.map((a) => a.id),
      });
      onBooked(booking, rooms!.find((r) => r.id === roomId)!);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'CONFLICT' || err.code === 'NO_ROOM')) onConflict(err.message);
      else { setError(err instanceof Error ? err.message : 'Something went wrong.'); setSaving(false); }
    }
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="dlg-title">
      <form onSubmit={submit}>
        <h2 id="dlg-title">Book {toTime(start)}–{toTime(start + duration)}</h2>
        <p className="muted">{formatDuration(duration)} · {attendees.length} {attendees.length === 1 ? 'person' : 'people'}</p>

        <label className="field">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>

        {startOptions.length > 1 && (
          <label className="field">Start time
            <select value={start} onChange={(e) => setStart(Number(e.target.value))}>
              {startOptions.map((s) => <option key={s} value={s}>{toTime(s)} – {toTime(s + duration)}</option>)}
            </select>
          </label>
        )}

        <label className="field">Room
          {rooms === null ? <span className="muted">Finding a room that fits…</span> : rooms.length === 0 ? (
            <span className="err">No room for {attendees.length} people is free at this time.</span>
          ) : (
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} (seats {r.capacity})</option>)}
            </select>
          )}
        </label>

        {error && <p className="err" role="alert">{error}</p>}
        <div className="row end">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving || !roomId || !title.trim()}>{saving ? 'Booking…' : 'Book meeting'}</button>
        </div>
      </form>
    </dialog>
  );
}
