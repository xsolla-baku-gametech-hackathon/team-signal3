import { describe, expect, it } from 'vitest';
import { RoomManager } from '../../../rooms/RoomManager.js';
import { ChatHandler } from '../chat.handler.js';
import { AppSocket } from '../game.handler.js';

function setup() {
  const rooms = new RoomManager();
  const handler = new ChatHandler(rooms);
  rooms.joinGame('DEMO-123', 'game');
  const socket = {
    id: 'phone',
    data: { role: 'crowd', roomId: 'DEMO-123', nickname: 'Alice', voterId: 'alice-1' }
  } as unknown as AppSocket;
  rooms.joinCrowd('DEMO-123', 'phone');
  return { rooms, handler, socket };
}

describe('chat flow', () => {
  it('relays a trimmed message with the sender nickname and voterId', () => {
    const { handler, socket } = setup();
    const message = handler.handleMessage(socket, { roomId: 'DEMO-123', text: '  kill him!  ' });
    expect(message).toMatchObject({ roomId: 'DEMO-123', voterId: 'alice-1', nickname: 'Alice', text: 'kill him!' });
    expect(message?.timestamp).toBeTypeOf('number');
  });

  it('falls back to socket id and Anonymous when no identity was set', () => {
    const { handler, socket } = setup();
    socket.data.nickname = undefined;
    socket.data.voterId = undefined;
    const message = handler.handleMessage(socket, { roomId: 'DEMO-123', text: 'hi' });
    expect(message).toMatchObject({ voterId: 'phone', nickname: 'Anonymous' });
  });

  it('rejects empty text, non-crowd sockets, and cross-room messages', () => {
    const { handler, socket } = setup();
    expect(handler.handleMessage(socket, { roomId: 'DEMO-123', text: '   ' })).toBeUndefined();
    expect(handler.handleMessage(socket, { roomId: 'OTHER-123', text: 'hi' })).toBeUndefined();

    const gameSocket = { id: 'game', data: { role: 'game', roomId: 'DEMO-123' } } as unknown as AppSocket;
    expect(handler.handleMessage(gameSocket, { roomId: 'DEMO-123', text: 'hi' })).toBeUndefined();
  });

  it('truncates messages over the length cap', () => {
    const { handler, socket } = setup();
    const message = handler.handleMessage(socket, { roomId: 'DEMO-123', text: 'x'.repeat(500) });
    expect(message?.text.length).toBe(240);
  });

  it('rate-limits a burst of messages from the same socket', () => {
    const { handler, socket } = setup();
    for (let i = 0; i < 4; i++) expect(handler.handleMessage(socket, { roomId: 'DEMO-123', text: `msg ${i}` })).toBeDefined();
    expect(handler.handleMessage(socket, { roomId: 'DEMO-123', text: 'one too many' })).toBeUndefined();
  });
});
