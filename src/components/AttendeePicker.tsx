import { useMemo, useState } from 'react';
import type { Person } from '../types';

interface Props { people: Person[]; selected: string[]; onChange: (ids: string[]) => void }

export default function AttendeePicker({ people, selected, onChange }: Props) {
  const [filter, setFilter] = useState('');
  const chosen = useMemo(() => new Set(selected), [selected]);
  const visible = people.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const toggle = (id: string) =>
    onChange(people.filter((p) => (p.id === id ? !chosen.has(id) : chosen.has(p.id))).map((p) => p.id));
  const selectVisible = () =>
    onChange(people.filter((p) => chosen.has(p.id) || visible.includes(p)).map((p) => p.id));

  return (
    <fieldset className="picker">
      <legend>Attendees <span className="muted">({selected.length} selected)</span></legend>
      <input type="search" placeholder="Search people…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search people" />
      <div className="row tight">
        <button type="button" className="btn small" onClick={selectVisible}>Select {filter ? 'matches' : 'all'}</button>
        <button type="button" className="btn small ghost" onClick={() => onChange([])}>Clear</button>
      </div>
      <ul>
        {visible.map((p) => (
          <li key={p.id}>
            <label><input type="checkbox" checked={chosen.has(p.id)} onChange={() => toggle(p.id)} /> {p.name}</label>
          </li>
        ))}
        {visible.length === 0 && <li className="muted">No one matches “{filter}”.</li>}
      </ul>
    </fieldset>
  );
}
