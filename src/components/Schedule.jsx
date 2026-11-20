import { useState } from 'react';
import { DAY_START, DAY_END, toMin, toTime, formatDuration, sortBookings } from '../lib/time.js';

function buildTimeline(bookings) {
  const items = [];
  let cursor = DAY_START;
  for (const b of sortBookings(bookings)) {
    if (toMin(b.start) > cursor) items.push({ type: 'free', start: cursor, end: toMin(b.start) });
    items.push({ type: 'booking', b });
    cursor = Math.max(cursor, toMin(b.end));
  }
  if (cursor < DAY_END) items.push({ type: 'free', start: cursor, end: DAY_END });
  return items;
}

function BookingCard({ b, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  const mins = toMin(b.end) - toMin(b.start);
  return (
    <li className="slot booked">
      <div className="slot-time">{b.start}<span>{b.end}</span></div>
      <div className="slot-body">
        <strong>{b.title}</strong>
        <span className="muted">{formatDuration(mins)}{b.attendees.length > 0 && ` · ${b.attendees.join(', ')}`}</span>
        {confirming ? (
          <div className="confirm" role="alertdialog" aria-label={`Cancel ${b.title}?`}>
            <span>Cancel “{b.title}”?</span>
            <button className="btn danger" onClick={() => onCancel(b)} autoFocus>Yes, cancel meeting</button>
            <button className="btn ghost" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        ) : (
          <button className="btn ghost small" onClick={() => setConfirming(true)}>Cancel meeting</button>
        )}
      </div>
    </li>
  );
}

export default function Schedule({ bookings, error, onRetry, onCancel, onPickGap }) {
  if (error)
    return (
      <div className="state error" role="alert">
        <p>Couldn’t load the schedule: {error}</p>
        <button className="btn" onClick={onRetry}>Try again</button>
      </div>
    );
  if (!bookings)
    return (
      <ul className="timeline" aria-busy="true" aria-label="Loading schedule">
        {[0, 1, 2].map((i) => <li key={i} className="slot skeleton" />)}
      </ul>
    );
  return (
    <ul className="timeline">
      {buildTimeline(bookings).map((it) =>
        it.type === 'booking' ? (
          <BookingCard key={it.b.id} b={it.b} onCancel={onCancel} />
        ) : (
          <li key={`f${it.start}`} className="slot free">
            <div className="slot-time">{toTime(it.start)}<span>{toTime(it.end)}</span></div>
            <button className="free-btn" onClick={() => onPickGap(toTime(it.start), toTime(Math.min(it.end, it.start + 60)))}>
              Free for {formatDuration(it.end - it.start)} — book this slot
            </button>
          </li>
        ),
      )}
      {bookings.length === 0 && <li className="hint">Nothing booked yet — the whole day is open.</li>}
    </ul>
  );
}
