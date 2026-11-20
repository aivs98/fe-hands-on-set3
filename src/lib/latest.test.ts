import { describe, it, expect } from 'vitest';
import { createLatest } from './latest';

const later = <T>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));

describe('createLatest', () => {
  it('ignores a slow, older response that arrives after a newer one', async () => {
    const latest = createLatest();
    let shown = '';
    const run = async (label: string, ms: number) => {
      const token = latest.begin();
      const result = await later(ms, label);
      if (latest.isCurrent(token)) shown = result;
    };
    await Promise.all([run('attendees A (slow)', 60), run('attendees B (fast)', 10)]);
    expect(shown).toBe('attendees B (fast)');
  });

  it('cancel() invalidates everything in flight', () => {
    const latest = createLatest();
    const t = latest.begin();
    latest.cancel();
    expect(latest.isCurrent(t)).toBe(false);
  });
});
