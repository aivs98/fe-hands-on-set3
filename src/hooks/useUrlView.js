import { useCallback, useEffect, useState } from 'react';
import { isValidDate, todayISO } from '../lib/time.js';

const read = () => {
  const p = new URLSearchParams(window.location.search);
  return { room: p.get('room'), date: p.get('date') };
};

/** Keeps { room, date } in the URL (?room=…&date=…). Invalid values fall back to defaults. */
export function useUrlView(rooms) {
  const [raw, setRaw] = useState(read);

  useEffect(() => {
    const onPop = () => setRaw(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const room = rooms.some((r) => r.id === raw.room) ? raw.room : rooms[0]?.id ?? null;
  const date = isValidDate(raw.date) ? raw.date : todayISO();

  const write = useCallback((view, replace) => {
    const qs = new URLSearchParams(view).toString();
    window.history[replace ? 'replaceState' : 'pushState'](null, '', `?${qs}`);
    setRaw(view);
  }, []);

  // Rewrite a missing/invalid URL into its canonical form without adding history entries.
  useEffect(() => {
    if (room && (raw.room !== room || raw.date !== date)) write({ room, date }, true);
  }, [room, date, raw.room, raw.date, write]);

  const update = useCallback((patch) => write({ room, date, ...patch }, false), [room, date, write]);
  return { room, date, update };
}
