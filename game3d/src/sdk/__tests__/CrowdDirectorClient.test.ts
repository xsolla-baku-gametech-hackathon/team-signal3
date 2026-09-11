import { describe, expect, it, vi } from 'vitest';
import { CrowdDirectorClient, SocketFactory } from '../CrowdDirectorClient';

it('joins once per connection and does not buffer offline game state', () => {
  const handlers = new Map<string, () => void>();
  const managerHandlers = new Map<string, () => void>();
  const socket = { connected: false, emit: vi.fn(), on: (event: string, handler: () => void) => handlers.set(event, handler),
    io: { on: (event: string, handler: () => void) => managerHandlers.set(event, handler) } };
  const client = new CrowdDirectorClient({ roomId: 'DEMO-123', serverUrl: 'http://localhost' }, (() => socket) as unknown as SocketFactory);
  const onConnected = vi.fn();
  client.onConnected(onConnected);
  client.connect();
  client.reportGameState({ hp: 100, shield: 0, score: 0, wave: 1, enemyCount: 0, bossActive: false, stormActive: false, gameOver: false });
  expect(socket.emit).not.toHaveBeenCalled();
  socket.connected = true;
  handlers.get('connect')!();
  managerHandlers.get('reconnect')?.();
  handlers.get('connect')!();
  expect(socket.emit).toHaveBeenCalledTimes(2);
  expect(onConnected).toHaveBeenCalledTimes(2);
});
