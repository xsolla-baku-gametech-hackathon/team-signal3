import { describe, expect, it } from 'vitest';
import { ChatVoteRateLimiter } from '../ChatVoteRateLimiter.js';

describe('ChatVoteRateLimiter', () => {
  it('allows the first vote from a user', () => {
    const limiter = new ChatVoteRateLimiter(2000);

    expect(limiter.tryConsume('user-1', 0)).toBe(true);
  });

  it('blocks a second vote from the same user within the interval', () => {
    const limiter = new ChatVoteRateLimiter(2000);

    limiter.tryConsume('user-1', 0);

    expect(limiter.tryConsume('user-1', 1000)).toBe(false);
  });

  it('allows a vote again once the interval has elapsed', () => {
    const limiter = new ChatVoteRateLimiter(2000);

    limiter.tryConsume('user-1', 0);

    expect(limiter.tryConsume('user-1', 2000)).toBe(true);
  });

  it('tracks each user independently', () => {
    const limiter = new ChatVoteRateLimiter(2000);

    limiter.tryConsume('user-1', 0);

    expect(limiter.tryConsume('user-2', 0)).toBe(true);
  });
});
