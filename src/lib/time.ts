export { DAY_START, DAY_END } from './freeSlots';

const pad = (n: number) => String(n).padStart(2, '0');
export const toMin = (t: string): number => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const toTime = (m: number): string => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const toISO = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = (): string => toISO(new Date());
export const shiftDate = (s: string, days: number): string => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
export const formatDate = (s: string): string =>
  new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const formatDuration = (mins: number): string => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
};
