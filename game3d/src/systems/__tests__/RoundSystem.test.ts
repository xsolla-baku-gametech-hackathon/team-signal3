import { describe, expect, it } from 'vitest';
import { ROUND_DURATION_MS, RoundSystem } from '../RoundSystem';

describe('three-minute survival round', () => {
  it('waits for explicit start and does not include loading time', () => {
    const round = new RoundSystem();
    expect(round.update(90_000, false)).toMatchObject({ phase: 'WAITING', remainingMs: 180_000 });
    expect(round.start(90_000)).toBe(true);
    expect(round.update(91_000, false)).toMatchObject({ phase: 'RUNNING', remainingMs: 179_000 });
    expect(round.start(91_000)).toBe(false);
  });

  it('wins at exactly three minutes, including after a delayed frame', () => {
    const round = new RoundSystem();
    round.start(500);
    expect(round.update(ROUND_DURATION_MS + 499, false).phase).toBe('RUNNING');
    expect(round.update(ROUND_DURATION_MS + 500, false)).toMatchObject({ phase: 'WON', remainingMs: 0, elapsedMs: 180_000 });
    expect(round.update(999_999, true).phase).toBe('WON');
  });

  it('loses on death and freezes the survival time', () => {
    const round = new RoundSystem();
    round.start(0);
    expect(round.update(52_000, true)).toMatchObject({ phase: 'LOST', elapsedMs: 52_000 });
    expect(round.update(180_000, false)).toMatchObject({ phase: 'LOST', elapsedMs: 52_000 });
    expect(round.start(180_000)).toBe(false);
  });

  it('does not grant victory to a player already dead at the deadline', () => {
    const round = new RoundSystem();
    round.start(0);
    expect(round.update(180_000, true).phase).toBe('LOST');
  });

  it('advances six waves and never runs the clock backwards', () => {
    const round = new RoundSystem();
    round.start(1000);
    expect(round.update(31_000, false).wave).toBe(2);
    expect(round.update(30_000, false).elapsedMs).toBe(30_000);
    expect(round.update(151_000, false)).toMatchObject({ wave: 6, remainingMs: 30_000 });
    expect(round.update(500_000, false)).toMatchObject({ wave: 6, remainingMs: 0 });
  });
});
