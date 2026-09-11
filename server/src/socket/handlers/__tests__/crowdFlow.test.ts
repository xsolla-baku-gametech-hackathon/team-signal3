import { describe, expect, it, vi } from 'vitest';
import { RoomManager } from '../../../rooms/RoomManager.js';
import { CrowdActionProcessor } from '../../../services/CrowdActionProcessor.js';
import { DirectorService } from '../../../director/DirectorService.js';
import { VoterScoreService } from '../../../voters/VoterScoreService.js';
import { CrowdHandler } from '../crowd.handler.js';
import { AppSocket, handleGameJoin, handleGameState } from '../game.handler.js';

function setup(voterScores = new VoterScoreService()) {
  const rooms = new RoomManager();
  const queueAction = vi.fn();
  const handler = new CrowdHandler(rooms, new CrowdActionProcessor(), { queueAction } as unknown as DirectorService, 2, voterScores);
  const socket = { id: 'phone', data: {}, join: vi.fn(), leave: vi.fn(), emit: vi.fn() } as unknown as AppSocket;
  rooms.joinGame('DEMO-123', 'game');
  return { rooms, handler, socket, queueAction, voterScores };
}

describe('crowd room and action flow', () => {
  it('accepts a joined vote exactly once and keeps repeated joins idempotent', () => {
    const { rooms, handler, socket, queueAction } = setup();
    handler.join(socket, { roomId: 'DEMO-123' });
    handler.join(socket, { roomId: 'DEMO-123' });
    expect(rooms.getRoomState('DEMO-123').crowdCount).toBe(1);
    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'LIGHTNING' })).toEqual({ ok: true, action: 'LIGHTNING' });
    expect(queueAction).toHaveBeenCalledExactlyOnceWith({ roomId: 'DEMO-123', participantId: 'phone', action: 'LIGHTNING', voterId: 'phone' });
  });

  it('rejects unjoined and cross-room votes without queuing anything', () => {
    const { rooms, handler, socket, queueAction } = setup();
    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'HEAL' }).ok).toBe(false);
    rooms.joinGame('OTHER-123', 'other-game');
    handler.join(socket, { roomId: 'OTHER-123' });
    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'HEAL' }).ok).toBe(false);
    expect(queueAction).not.toHaveBeenCalled();
  });

  it('leaves the old room when a phone switches rooms', () => {
    const { rooms, handler, socket } = setup();
    handler.join(socket, { roomId: 'DEMO-123' });
    handler.join(socket, { roomId: 'OTHER-123' });
    expect(socket.leave).toHaveBeenCalledWith('DEMO-123');
    expect(rooms.getRoomState('DEMO-123').crowdCount).toBe(0);
    expect(rooms.getRoomState('OTHER-123').crowdCount).toBe(1);
  });

  it('rejects offline games, invalid actions and excess votes', () => {
    const { rooms, handler, socket } = setup();
    handler.join(socket, { roomId: 'DEMO-123' });
    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'INVALID' }).ok).toBe(false);
    for (let i = 0; i < 2; i++) expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'HEAL' }).ok).toBe(true);
    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'HEAL' })).toEqual({ ok: false, reason: 'RATE_LIMITED' });
    handler.removeSocket(socket.id);
    rooms.leave('game');
    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'HEAL' })).toEqual({ ok: false, reason: 'GAME_OFFLINE' });
  });

  it.each(['WAITING', 'WON', 'LOST'] as const)('blocks votes during %s', (roundPhase) => {
    const { rooms, handler, socket, queueAction } = setup();
    handler.join(socket, { roomId: 'DEMO-123' });
    rooms.setGameState({ roomId: 'DEMO-123', hp: 80, shield: 0, score: 0, wave: 1, roundPhase });
    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'HEAL' })).toEqual({ ok: false, reason: 'ROUND_INACTIVE' });
    expect(queueAction).not.toHaveBeenCalled();
  });

  it('gates VIP_SHIELD to Master Director voters only', () => {
    const voterScores = new VoterScoreService();
    const { handler, socket, queueAction } = setup(voterScores);
    handler.join(socket, { roomId: 'DEMO-123' });
    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'VIP_SHIELD', voterId: 'phone' })).toEqual({ ok: false, reason: 'INVALID_ACTION' });
    expect(queueAction).not.toHaveBeenCalled();

    for (let i = 0; i < 13; i++) voterScores.scoreVote('DEMO-123', 'phone', 'HEAL', 'HEAL', 15);

    expect(handler.handleAction(socket, { roomId: 'DEMO-123', action: 'VIP_SHIELD', voterId: 'phone' })).toEqual({ ok: true, action: 'VIP_SHIELD' });
    expect(queueAction).toHaveBeenCalledExactlyOnceWith({ roomId: 'DEMO-123', participantId: 'phone', action: 'VIP_SHIELD', voterId: 'phone' });
  });

  it('sends this voter their current DP/tier right on join, so a page reload restores it', () => {
    const voterScores = new VoterScoreService();
    const { handler, socket } = setup(voterScores);
    voterScores.scoreVote('DEMO-123', 'friend-1', 'HEAL', 'HEAL', 15);

    handler.join(socket, { roomId: 'DEMO-123', voterId: 'friend-1' });

    expect(socket.emit).toHaveBeenCalledWith('VOTER_STATUS', expect.objectContaining({ voterId: 'friend-1', dp: 40 }));
  });

  it('skips the VOTER_STATUS push when no persistent voterId was given', () => {
    const { handler, socket } = setup();
    handler.join(socket, { roomId: 'DEMO-123' });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('only accepts state from the game that owns the room', () => {
    const { rooms, handler, socket } = setup();
    const state = { roomId: 'DEMO-123', hp: 90, shield: 0, score: 0, wave: 1 };
    handler.join(socket, { roomId: 'DEMO-123' });
    expect(handleGameJoin(socket, { roomId: 'DEMO-123' }, rooms)).toBeUndefined();
    expect(handleGameState(state, rooms, socket)).toBeUndefined();
    const game = { id: 'game', data: { role: 'game', roomId: 'DEMO-123' } } as AppSocket;
    expect(handleGameState(state, rooms, game)).toEqual(state);
    expect(handleGameState({ ...state, hp: Infinity }, rooms, game)).toBeUndefined();
    expect(handleGameState({ ...state, roundPhase: 'INVALID' } as never, rooms, game)).toBeUndefined();
    expect(handleGameState({ ...state, roundRemainingMs: -1 }, rooms, game)).toBeUndefined();
    expect(handleGameState({ ...state, roomId: 'OTHER-123' }, rooms, game)).toBeUndefined();
  });
});
