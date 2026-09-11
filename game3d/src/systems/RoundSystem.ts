export const ROUND_DURATION_MS = 180_000;
export type RoundPhase = 'WAITING' | 'RUNNING' | 'WON' | 'LOST';
export type RoundSnapshot = { phase: RoundPhase; remainingMs: number; elapsedMs: number; wave: number };

export class RoundSystem {
  private phase: RoundPhase = 'WAITING';
  private startedAt = 0;
  private elapsedMs = 0;

  start(now: number): boolean {
    if (this.phase !== 'WAITING') return false;
    this.startedAt = now;
    this.phase = 'RUNNING';
    return true;
  }

  update(now: number, isDead: boolean): RoundSnapshot {
    if (this.phase === 'RUNNING') {
      this.elapsedMs = Math.min(ROUND_DURATION_MS, Math.max(this.elapsedMs, now - this.startedAt));
      if (isDead) this.phase = 'LOST';
      else if (this.elapsedMs >= ROUND_DURATION_MS) this.phase = 'WON';
    }
    return this.getSnapshot();
  }

  isRunning(): boolean {
    return this.phase === 'RUNNING';
  }

  getSnapshot(): RoundSnapshot {
    return { phase: this.phase, elapsedMs: this.elapsedMs, remainingMs: ROUND_DURATION_MS - this.elapsedMs,
      wave: Math.min(6, Math.floor(this.elapsedMs / 30_000) + 1) };
  }
}
