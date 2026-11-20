import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/mockApi';
import { createLatest } from '../lib/latest';
import type { Booking } from '../types';

const REFRESH_MS = 10_000;

interface Snapshot { key: string; bookings: Booking[]; at: number }

/**
 * Loads bookings for (date, people), refreshes every 10 s while the tab is visible,
 * and never lets an older response replace a newer one.
 */
export function useAvailability(date: string, personIds: string[]) {
  const key = `${date}|${[...personIds].sort().join(',')}`;
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [paused, setPaused] = useState(() => document.hidden);
  const latest = useRef(createLatest());

  const load = useCallback(async () => {
    const [d, idStr] = key.split('|');
    const ids = idStr ? idStr.split(',') : [];
    if (ids.length === 0) return;
    const token = latest.current.begin();
    setRefreshing(true);
    try {
      const bookings = await api.listBookingsForPeople(ids, d);
      if (!latest.current.isCurrent(token)) return; // a newer request owns the screen now
      setSnap({ key, bookings, at: Date.now() });
      setError(null);
    } catch (e) {
      if (!latest.current.isCurrent(token)) return;
      setError({ key, message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      if (latest.current.isCurrent(token)) setRefreshing(false);
    }
  }, [key]);

  useEffect(() => {
    const guard = latest.current;
    let timer: number | undefined;
    const stop = () => window.clearInterval(timer);
    const start = () => { stop(); timer = window.setInterval(load, REFRESH_MS); };
    const onVisibility = () => {
      setPaused(document.hidden);
      if (document.hidden) stop();
      else { void load(); start(); }
    };

    void load();
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      guard.cancel(); // drop anything still in flight for the previous selection
    };
  }, [load]);

  const hasPeople = personIds.length > 0;
  // Only expose data that belongs to the CURRENT selection — an extra guard on top of the token check.
  const current = snap?.key === key ? snap : null;
  const currentError = error?.key === key ? error.message : null;
  return {
    bookings: hasPeople ? current?.bookings ?? null : [],
    loading: hasPeople && !current && !currentError,
    error: currentError,
    refreshing,
    paused,
    updatedAt: current?.at ?? null,
    refresh: load,
  };
}
