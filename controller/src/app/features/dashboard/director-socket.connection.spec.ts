import { describe, expect, it, vi } from 'vitest';
import { AppSocket } from './director-socket.connection';
import { DirectorSocketConnection } from './director-socket.connection';

type Handler = (...args: unknown[]) => void;

class FakeSocket {
  readonly emit = vi.fn();
  readonly disconnect = vi.fn();
  private readonly handlers = new Map<string, Handler[]>();

  on(event: string, handler: Handler): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  trigger(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }
}

function createFakeFactory(): { factory: () => AppSocket; socket: FakeSocket } {
  const socket = new FakeSocket();
  return { factory: () => socket as unknown as AppSocket, socket };
}

describe('DirectorSocketConnection', () => {
  it('TEST 6: handles connect, disconnect and reconnect without throwing', () => {
    const { factory, socket } = createFakeFactory();
    const connection = new DirectorSocketConnection('http://localhost:3000', factory);

    expect(() => connection.connect('DEMO-123')).not.toThrow();
    expect(connection.connectionState()).toBe('CONNECTING');

    expect(() => socket.trigger('connect')).not.toThrow();
    expect(connection.connectionState()).toBe('ONLINE');
    expect(socket.emit).toHaveBeenCalledWith('DASHBOARD_JOIN', { roomId: 'DEMO-123' });

    expect(() => socket.trigger('disconnect')).not.toThrow();
    expect(connection.connectionState()).toBe('OFFLINE');

    expect(() => socket.trigger('connect')).not.toThrow();
    expect(connection.connectionState()).toBe('ONLINE');

    expect(() => connection.disconnect()).not.toThrow();
    expect(connection.connectionState()).toBe('OFFLINE');
  });

  it('never emits any gameplay-affecting event, only DASHBOARD_JOIN', () => {
    const { factory, socket } = createFakeFactory();
    const connection = new DirectorSocketConnection('http://localhost:3000', factory);

    connection.connect('DEMO-123');
    socket.trigger('connect');

    const emittedEvents = socket.emit.mock.calls.map((call) => call[0]);
    expect(emittedEvents).toEqual(['DASHBOARD_JOIN']);
  });

  it('updates latestDecision when a DIRECTOR_DECISION event arrives', () => {
    const { factory, socket } = createFakeFactory();
    const connection = new DirectorSocketConnection('http://localhost:3000', factory);

    connection.connect('DEMO-123');
    socket.trigger('connect');

    expect(connection.latestDecision()).toBeUndefined();

    const decision = { roomId: 'DEMO-123', timestamp: 1 } as never;
    socket.trigger('DIRECTOR_DECISION', decision);

    expect(connection.latestDecision()).toBe(decision);
  });

  it('updates liveGameState when a GAME_STATE_UPDATE event arrives', () => {
    const { factory, socket } = createFakeFactory();
    const connection = new DirectorSocketConnection('http://localhost:3000', factory);

    connection.connect('DEMO-123');
    socket.trigger('connect');

    expect(connection.liveGameState()).toBeUndefined();

    const state = { roomId: 'DEMO-123', hp: 80, shield: 0, score: 4450, wave: 1 };
    socket.trigger('GAME_STATE_UPDATE', state);

    expect(connection.liveGameState()).toBe(state);
  });
});
