import { memo, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { DAY_START, DAY_END, mergeIntervals } from '../lib/freeSlots';
import { toTime } from '../lib/time';
import type { Interval } from '../types';

export interface Row { id: string; name: string; busy: Interval[] }

const SPAN = DAY_END - DAY_START;
const pct = (m: number) => `${((m - DAY_START) / SPAN) * 100}%`;
const widthPct = (a: number, b: number) => `${((b - a) / SPAN) * 100}%`;
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i);

const PersonRow = memo(function PersonRow({ name, busy }: { name: string; busy: Interval[] }) {
  const label = useMemo(() => {
    const merged = mergeIntervals(busy);
    return merged.length
      ? `${name}: busy ${merged.map((b) => `${toTime(b.start)} to ${toTime(b.end)}`).join(', ')}`
      : `${name}: no bookings`;
  }, [name, busy]);
  return (
    <div className="trow">
      <div className="who" title={name}>{name}</div>
      <div className="track" role="img" aria-label={label}>
        {busy.map((b, i) => {
          const s = Math.max(b.start, DAY_START), e = Math.min(b.end, DAY_END);
          return e > s ? <span key={i} className="busy" style={{ left: pct(s), width: widthPct(s, e) }} title={`Busy ${toTime(s)}–${toTime(e)}`} /> : null;
        })}
      </div>
    </div>
  );
});

interface Props { rows: Row[]; slots: Interval[]; minLength: number; onBook: (slot: Interval) => void }

export default function Timeline({ rows, slots, minLength, onBook }: Props) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const cur = Math.min(active, Math.max(slots.length - 1, 0));

  const move = (i: number) => {
    const n = Math.max(0, Math.min(slots.length - 1, i));
    setActive(n);
    refs.current[n]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const next: Record<string, number> = {
      ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur - 1, ArrowUp: cur - 1, Home: 0, End: slots.length - 1,
    };
    if (e.key in next) { e.preventDefault(); move(next[e.key]); }
  };

  return (
    <div className="timeline">
      <div className="trow ruler" aria-hidden="true">
        <div className="who" />
        <div className="track">
          {HOURS.map((h) => <span key={h} className="tick" style={{ left: pct(h * 60) }}>{String(h).padStart(2, '0')}:00</span>)}
        </div>
      </div>

      <div className="trow common">
        <div className="who"><strong>Everyone is free</strong></div>
        <div className="track" role="listbox" aria-label="Common free slots. Use the arrow keys to move and Enter to book."
          onKeyDown={onKeyDown}>
          {slots.map((s, i) => (
            <button
              key={s.start}
              ref={(el) => { refs.current[i] = el; }}
              role="option"
              aria-selected={i === cur}
              tabIndex={i === cur ? 0 : -1}
              aria-label={`Free ${toTime(s.start)} to ${toTime(s.end)}`}
              className={`free${s.end - s.start >= 90 ? ' wide' : ''}`}
              style={{ left: pct(s.start), width: widthPct(s.start, s.end) }}
              title={`Free ${toTime(s.start)}–${toTime(s.end)} — click to book`}
              onFocus={() => setActive(i)}
              onClick={() => onBook(s)}
            >
              <span>{toTime(s.start)}–{toTime(s.end)}</span>
            </button>
          ))}
        </div>
      </div>
      {slots.length === 0 && (
        <p className="empty">Nobody can meet for {minLength} minutes on this day. Try a shorter meeting, another date, or fewer attendees.</p>
      )}

      <div className="people">{rows.map((r) => <PersonRow key={r.id} name={r.name} busy={r.busy} />)}</div>
    </div>
  );
}
