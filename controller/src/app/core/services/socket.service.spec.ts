import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketService } from './socket.service';

const fake = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => void>(),
  managerHandlers: new Map<string, (...args: any[]) => void>(),
  socket: { connected: false, on: vi.fn(), emit: vi.fn(), timeout: vi.fn(), disconnect: vi.fn(), io: { on: vi.fn() } }
}));
vi.mock('socket.io-client', () => ({ io: () => fake.socket }));

function connect(service: SocketService) {
  service.joinCrowd('DEMO-123', 'Guest');
  fake.socket.connected = true;
  fake.handlers.get('connect')!();
  fake.handlers.get('ROOM_STATE')!({ roomId: 'DEMO-123', gameConnected: true, crowdCount: 1 });
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.handlers.clear();
  fake.managerHandlers.clear();
  fake.socket.connected = false;
  fake.socket.on.mockImplementation((event, handler) => fake.handlers.set(event, handler));
  fake.socket.io.on.mockImplementation((event, handler) => fake.managerHandlers.set(event, handler));
  fake.socket.timeout.mockReturnValue(fake.socket);
});

describe('phone vote connection', () => {
  it('joins once per connection and clears stale room state on disconnect', () => {
    const service = new SocketService();
    connect(service);
    expect(fake.socket.emit).toHaveBeenCalledTimes(1);
    fake.handlers.get('disconnect')!();
    expect(service.roomState()).toBeUndefined();
    fake.managerHandlers.get('reconnect')?.();
    fake.handlers.get('connect')!();
    expect(fake.socket.emit).toHaveBeenCalledTimes(2);
  });

  it('only confirms a vote after the server acknowledges it', () => {
    const service = new SocketService();
    connect(service);
    service.sendAction('HEAL');
    expect(service.pendingAction()).toBe('HEAL');
    expect(service.actionResult()).toBeUndefined();
    service.sendAction('BOSS');
    expect(fake.socket.emit).toHaveBeenCalledTimes(2);
    const ack = fake.socket.emit.mock.calls.at(-1)![2];
    ack(null, { ok: true, action: 'HEAL' });
    expect(service.actionResult()).toEqual({ status: 'sent', action: 'HEAL' });
    expect(service.pendingAction()).toBeUndefined();
  });

  it('reports acknowledgement timeout without resending the vote', () => {
    const service = new SocketService();
    connect(service);
    service.sendAction('BOSS');
    fake.socket.emit.mock.calls.at(-1)![2](new Error('timeout'));
    expect(service.actionResult()?.status).toBe('rejected');
    expect(service.pendingAction()).toBeUndefined();
    expect(fake.socket.emit).toHaveBeenCalledTimes(2);
  });

  it('ignores a late acknowledgement from a previous connection', () => {
    const service = new SocketService();
    connect(service);
    service.sendAction('HEAL');
    const ack = fake.socket.emit.mock.calls.at(-1)![2];
    fake.handlers.get('disconnect')!();
    ack(null, { ok: true, action: 'HEAL' });
    expect(service.actionResult()).toBeUndefined();
  });

  it('blocks votes outside the round and accepts them once the round starts', () => {
    const service = new SocketService();
    connect(service);
    fake.handlers.get('GAME_STATE_UPDATE')!({ roomId: 'DEMO-123', roundPhase: 'WAITING' });
    service.sendAction('HEAL');
    expect(fake.socket.emit).toHaveBeenCalledTimes(1);
    expect(service.actionResult()?.status).toBe('rejected');
    fake.handlers.get('GAME_STATE_UPDATE')!({ roomId: 'DEMO-123', roundPhase: 'RUNNING', roundRemainingMs: 180_000 });
    service.sendAction('HEAL');
    expect(fake.socket.emit).toHaveBeenCalledTimes(2);
    expect(service.liveGameState()?.roundRemainingMs).toBe(180_000);
  });

  it('shows only decisions for the joined room', () => {
    const service = new SocketService();
    connect(service);
    fake.handlers.get('DIRECTOR_DECISION')!({ roomId: 'OTHER-123' });
    expect(service.latestDecision()).toBeUndefined();
    const decision = { roomId: 'DEMO-123', final: { event: 'HEAL' } };
    fake.handlers.get('DIRECTOR_DECISION')!(decision);
    expect(service.latestDecision()).toEqual(decision);
  });

  it('keeps this device\'s DP/tier visible after the round ends, unlike latestDecision', () => {
    const service = new SocketService();
    connect(service);
    const status = { voterId: service.voterId, dp: 65, tier: 1, tierLabel: 'Novice Director', voteWeight: 1, tierStartDp: 0, nextTierAt: 101 };
    fake.handlers.get('DIRECTOR_DECISION')!({ roomId: 'DEMO-123', final: { event: 'HEAL' }, voterStatuses: { [service.voterId]: status } });
    expect(service.voterStatus()).toEqual(status);

    fake.handlers.get('GAME_STATE_UPDATE')!({ roomId: 'DEMO-123', roundPhase: 'WON' });
    expect(service.latestDecision()).toBeUndefined();
    expect(service.voterStatus()).toEqual(status);
  });

  it('restores DP/tier from a VOTER_STATUS push right after (re)joining, e.g. after a page reload', () => {
    const service = new SocketService();
    connect(service);
    expect(service.voterStatus()).toBeUndefined();

    const status = { voterId: service.voterId, dp: 65, tier: 1, tierLabel: 'Novice Director', voteWeight: 1, tierStartDp: 0, nextTierAt: 101 };
    fake.handlers.get('VOTER_STATUS')!(status);
    expect(service.voterStatus()).toEqual(status);
  });
});
