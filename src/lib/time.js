export const DAY_START = 9 * 60;
export const DAY_END = 18 * 60;
export const STEP = 15;
export const MAX_MINUTES = 240;

const pad = (n) => String(n).padStart(2, '0');
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const toTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const slots = (from, to) => {
  const out = [];
  for (let m = from; m <= to; m += STEP) out.push(toTime(m));
  return out;
};
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const isValidDate = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(new Date(`${s}T00:00:00`)) === s;
export const shiftDate = (s, days) => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
export const formatDate = (s) =>
  new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
export const formatDuration = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
};
export const sortBookings = (list) => [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
