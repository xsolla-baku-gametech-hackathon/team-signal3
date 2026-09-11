import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectorService } from '../DirectorService.js';
import { RoomManager } from '../../rooms/RoomManager.js';
import { RuleEngine } from '../../rules/RuleEngine.js';
import { AiDirector } from '../../ai/AiDirector.js';

function setup(decide?: () => Promise<unknown>) {
  vi.useFakeTimers();
  const messages: { target: string; event: string; payload: any }[] = [];
  const io = { to: (target: string) => ({ emit: (event: string, payload: unknown) => messages.push({ target, event, payload }) }) };
  const rooms = new RoomManager();
  rooms.joinGame('DEMO-123', 'game');
  rooms.setGameState({ roomId: 'DEMO-123', hp: 80, shield: 0, score: 0, wave: 1 });
  const ai = { isAvailable: () => !!decide, decide } as unknown as AiDirector;
  const service = new DirectorService(io as unknown as ConstructorParameters<typeof DirectorService>[0], rooms, new RuleEngine(), 5000, ai);
  return { service, rooms, messages };
}

afterEach(() => vi.useRealTimers());

describe('vote window to arena decision', () => {
  it('aggregates votes and broadcasts one decision plus one gameplay event', async () => {
    const { service, messages } = setup();
    for (const participantId of ['a', 'b', 'c']) service.queueAction({ roomId: 'DEMO-123', action: 'LIGHTNING', participantId });
    await vi.advanceTimersByTimeAsync(4999);
    expect(messages).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ target: 'DEMO-123', event: 'DIRECTOR_DECISION', payload: { final: { event: 'LIGHTNING' }, crowdSnapshot: { totalActions: 3, uniqueParticipants: 3 } } });
    expect(messages[1]).toMatchObject({ target: 'game', event: 'GAME_EVENT', payload: { type: 'LIGHTNING' } });
  });

  it('ignores direct/chat votes while waiting and after the round is over', async () => {
    const { service, rooms, messages } = setup();
    for (const roundPhase of ['WAITING', 'WON', 'LOST'] as const) {
      rooms.setGameState({ roomId: 'DEMO-123', hp: 80, shield: 0, score: 0, wave: 1, roundPhase });
      service.queueAction({ roomId: 'DEMO-123', action: 'BOSS', participantId: 'chat:user' });
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(messages).toHaveLength(0);
  });

  it('discards a delayed AI result after the game disconnects and rejoins', async () => {
    let resolve!: (result: unknown) => void;
    const { service, rooms, messages } = setup(() => new Promise((done) => { resolve = done; }));
    service.queueAction({ roomId: 'DEMO-123', action: 'LIGHTNING', participantId: 'phone' });
    await vi.advanceTimersByTimeAsync(5000);
    service.clearRoom('DEMO-123');
    rooms.leave('game');
    rooms.joinGame('DEMO-123', 'new-game');
    resolve({ ok: true, output: { event: 'LIGHTNING', intensity: 0.5, reason: 'late' }, latencyMs: 100 });
    await vi.advanceTimersByTimeAsync(0);
    expect(messages).toHaveLength(0);
  });

  it('uses current game-over state after awaiting AI', async () => {
    let resolve!: (result: unknown) => void;
    const { service, rooms, messages } = setup(() => new Promise((done) => { resolve = done; }));
    service.queueAction({ roomId: 'DEMO-123', action: 'BOSS', participantId: 'phone' });
    await vi.advanceTimersByTimeAsync(5000);
    rooms.setGameState({ roomId: 'DEMO-123', hp: 0, shield: 0, score: 0, wave: 1, gameOver: true });
    resolve({ ok: true, output: { event: 'BOSS', intensity: 0.5, reason: 'late' }, latencyMs: 100 });
    await vi.advanceTimersByTimeAsync(0);
    expect(messages).toHaveLength(1);
    expect(messages[0].payload.final.event).toBe('NO_EVENT');
  });
});
