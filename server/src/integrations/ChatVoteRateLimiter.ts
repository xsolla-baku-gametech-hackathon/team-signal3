export class ChatVoteRateLimiter {
  private readonly lastVoteAtMs = new Map<string, number>();

  constructor(private readonly minIntervalMs: number) {}

  tryConsume(userId: string, nowMs: number = Date.now()): boolean {
    const lastVoteAt = this.lastVoteAtMs.get(userId);

    if (lastVoteAt !== undefined && nowMs - lastVoteAt < this.minIntervalMs) {
      return false;
    }

    this.lastVoteAtMs.set(userId, nowMs);
    return true;
  }
}
