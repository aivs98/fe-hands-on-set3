import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api/mockApi.js';
import { useUrlView } from './hooks/useUrlView.js';
import { formatDate, shiftDate, todayISO, sortBookings } from './lib/time.js';
import Schedule from './components/Schedule.jsx';
import BookingForm from './components/BookingForm.jsx';

export default function App() {
  const [rooms, setRooms] = useState([]);
  const [roomsError, setRoomsError] = useState(null);
  const { room, date, update } = useUrlView(rooms);
  const [bookings, setBookings] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const viewKey = useRef('');
  viewKey.current = `${room}|${date}`;

  useEffect(() => { api.listRooms().then(setRooms).catch((e) => setRoomsError(e.message)); }, []);

  useEffect(() => {
    if (!room) return;
    let stale = false;
    setBookings(null); setLoadError(null);
    api.listBookings(room, date)
      .then((b) => !stale && setBookings(b))
      .catch((e) => !stale && setLoadError(e.message));
    return () => { stale = true; };
  }, [room, date, reloadKey]);

  useEffect(() => {
    if (notice?.type !== 'success') return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  const create = useCallback(async (input) => {
    const key = viewKey.current;
    try {
      const created = await api.createBooking({ roomId: room, date, ...input });
      if (viewKey.current === key) setBookings((p) => sortBookings([...(p ?? []), created]));
      setNotice({ type: 'success', text: `Booked “${created.title}” ${created.start}–${created.end}.` });
    } catch (err) {
      if (err.code === 'CONFLICT') api.listBookings(room, date).then((b) => viewKey.current === key && setBookings(b)); // show what changed
      throw err;
    }
  }, [room, date]);

  const cancel = useCallback(async (b) => {
    const key = viewKey.current;
    setBookings((p) => p.filter((x) => x.id !== b.id)); // optimistic
    try {
      await api.cancelBooking(b.id);
      setNotice({ type: 'success', text: `Cancelled “${b.title}”.` });
    } catch (err) {
      if (viewKey.current === key) setBookings((p) => sortBookings([...p, b])); // roll back
      setNotice({ type: 'error', text: `Couldn’t cancel “${b.title}” — it’s back on the schedule. ${err.message}` });
    }
  }, []);

  const current = rooms.find((r) => r.id === room);
  if (roomsError) return <main className="app"><div className="banner error">Couldn’t load rooms: {roomsError}</div></main>;

  return (
    <main className="app">
      <header>
        <h1>{current ? current.name : 'Room bookings'}</h1>
        {current && <p className="muted">{current.floor} · seats {current.capacity} · open 09:00–18:00</p>}
      </header>

      <section className="controls" aria-label="Choose room and date">
        <div className="field">
          <label htmlFor="room">Room</label>
          <select id="room" value={room ?? ''} onChange={(e) => update({ room: e.target.value })} disabled={!rooms.length}>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <div className="row tight">
            <button className="btn" aria-label="Previous day" onClick={() => update({ date: shiftDate(date, -1) })}>‹</button>
            <input id="date" type="date" value={date} onChange={(e) => e.target.value && update({ date: e.target.value })} />
            <button className="btn" aria-label="Next day" onClick={() => update({ date: shiftDate(date, 1) })}>›</button>
            <button className="btn ghost" onClick={() => update({ date: todayISO() })}>Today</button>
          </div>
        </div>
      </section>

      {notice && (
        <div className={`banner ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
          <button aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <div className="layout">
        <section className="panel">
          <h2>{formatDate(date)}</h2>
          <Schedule bookings={bookings} error={loadError} onRetry={() => setReloadKey((k) => k + 1)}
            onCancel={cancel} onPickGap={(start, end) => setPrefill({ start, end })} />
        </section>
        {room && <BookingForm bookings={bookings ?? []} onCreate={create} prefill={prefill} />}
      </div>
    </main>
  );
}
