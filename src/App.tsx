import { useEffect, useMemo, useState } from 'react';
import { api } from './api/mockApi';
import { useAvailability } from './hooks/useAvailability';
import { findCommonFreeSlots, groupBusyByPerson } from './lib/freeSlots';
import { formatDate, shiftDate, toTime, todayISO } from './lib/time';
import AttendeePicker from './components/AttendeePicker';
import BookingDialog from './components/BookingDialog';
import Timeline, { type Row } from './components/Timeline';
import type { Interval, Person } from './types';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const NO_BUSY: Interval[] = [];
interface Notice { type: 'success' | 'error'; text: string }

export default function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [date, setDate] = useState(todayISO);
  const [duration, setDuration] = useState(30);
  const [selected, setSelected] = useState<string[]>(['p1', 'p2']);
  const [slot, setSlot] = useState<Interval | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => { void api.listPeople().then(setPeople); }, []);
  useEffect(() => {
    if (notice?.type !== 'success') return;
    const id = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(id);
  }, [notice]);

  const av = useAvailability(date, selected);
  const chosen = useMemo(() => people.filter((p) => selected.includes(p.id)), [people, selected]);
  const busy = useMemo(() => groupBusyByPerson(av.bookings ?? [], selected), [av.bookings, selected]);
  // Changing the meeting length only re-runs this cheap memo; the per-person rows stay untouched.
  const slots = useMemo(
    () => (av.bookings ? findCommonFreeSlots([...busy.values()], duration) : []),
    [av.bookings, busy, duration],
  );
  const rows: Row[] = useMemo(
    () => chosen.map((p) => ({ id: p.id, name: p.name, busy: busy.get(p.id) ?? NO_BUSY })),
    [chosen, busy],
  );

  return (
    <main className="app">
      <header>
        <h1>Find a time that works for everyone</h1>
        <p className="muted">Pick people, a date and a length. Green slots are free for the whole group.</p>
      </header>

      <div className="layout">
        <aside className="panel">
          <label className="field">Date
            <div className="row tight">
              <button className="btn" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>‹</button>
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
              <button className="btn" aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}>›</button>
            </div>
          </label>
          <label className="field">Meeting length
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d >= 60 ? `${d / 60} h` : `${d} min`}</option>)}
            </select>
          </label>
          <AttendeePicker people={people} selected={selected} onChange={setSelected} />
        </aside>

        <section className="panel" aria-busy={av.loading}>
          <div className="head">
            <h2>{formatDate(date)}</h2>
            <p className="status muted" aria-live="off">
              {av.paused ? 'Paused while this tab is hidden' : av.refreshing ? 'Updating…' : av.updatedAt ? `Live · updated ${new Date(av.updatedAt).toLocaleTimeString()}` : ''}
            </p>
          </div>

          <div aria-live="polite">
            {notice && (
              <div className={`banner ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
                {notice.text}<button aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
              </div>
            )}
            {av.error && <div className="banner error" role="alert">Couldn’t load availability: {av.error} <button className="btn small" onClick={() => void av.refresh()}>Retry</button></div>}
          </div>

          {selected.length === 0 ? (
            <p className="empty">Choose at least one attendee to see when they’re free.</p>
          ) : av.loading ? (
            <div className="skeleton" role="status">Loading availability…</div>
          ) : (
            <>
              <Timeline rows={rows} slots={slots} minLength={duration} onBook={setSlot} />
              {slots.length > 0 && (
                <p className="summary" aria-hidden="true">
                  <strong>{slots.length} free {slots.length === 1 ? 'slot' : 'slots'}:</strong>{' '}
                  {slots.map((s) => `${toTime(s.start)}–${toTime(s.end)}`).join(' · ')}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {slot && (
        <BookingDialog
          slot={slot} duration={duration} date={date} attendees={chosen}
          onClose={() => setSlot(null)}
          onBooked={(b, room) => {
            setSlot(null);
            setNotice({ type: 'success', text: `Booked “${b.title}” ${b.start}–${b.end} in ${room.name}.` });
            void av.refresh();
          }}
          onConflict={(msg) => {
            setSlot(null);
            setNotice({ type: 'error', text: `${msg} Availability has been recalculated — pick another slot.` });
            void av.refresh();
          }}
        />
      )}
    </main>
  );
}
