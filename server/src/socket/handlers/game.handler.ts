import { Socket } from 'socket.io';
import { RoomManager } from '../../rooms/RoomManager.js';
import {
  ClientToServerEvents,
  GameJoinPayload,
  GameStatePayload,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from '../../types/events.js';

export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function handleGameJoin(socket: AppSocket, payload: GameJoinPayload, roomManager: RoomManager): string | undefined {
  if (!isJoinPayload(payload) || !isValidRoomId(payload.roomId)) {
    console.warn(`[ROOM] Rejected invalid game room from ${socket.id}`);
    return undefined;
  }

  if (socket.data.role && socket.data.role !== 'game') return undefined;
  if (socket.data.roomId && socket.data.roomId !== payload.roomId) return undefined;
  const owner = roomManager.getRoom(payload.roomId)?.gameSocketId;
  if (owner && owner !== socket.id) return undefined;
  socket.data.role = 'game';
  socket.data.roomId = payload.roomId;
  socket.join(payload.roomId);
  roomManager.joinGame(payload.roomId, socket.id);
  console.info(`[ROOM] Game joined ${payload.roomId}`);
  return payload.roomId;
}

export function handleGameState(payload: GameStatePayload, roomManager: RoomManager, socket: AppSocket): GameStatePayload | undefined {
  if (!isGameStatePayload(payload) || !isValidRoomId(payload.roomId)) {
    return undefined;
  }

  if (socket.data.role !== 'game' || socket.data.roomId !== payload.roomId ||
      roomManager.getRoom(payload.roomId)?.gameSocketId !== socket.id) return undefined;

  roomManager.setGameState(payload);
  return payload;
}

export function isValidRoomId(roomId: string): boolean {
  return /^[A-Z0-9-]{3,24}$/.test(roomId);
}

function isJoinPayload(payload: unknown): payload is GameJoinPayload {
  return isRecord(payload) && typeof payload.roomId === 'string';
}

function isGameStatePayload(payload: unknown): payload is GameStatePayload {
  return (
    isRecord(payload) &&
    typeof payload.roomId === 'string' &&
    isFiniteNumber(payload.hp) &&
    isFiniteNumber(payload.shield) &&
    isFiniteNumber(payload.score) &&
    isFiniteNumber(payload.wave) &&
    isOptionalNumber(payload.enemyCount) &&
    isOptionalBoolean(payload.bossActive) &&
    isOptionalBoolean(payload.stormActive) &&
    isOptionalBoolean(payload.gameOver) &&
    (payload.roundPhase === undefined || ['WAITING', 'RUNNING', 'WON', 'LOST'].includes(payload.roundPhase as string)) &&
    isOptionalNumber(payload.roundRemainingMs) &&
    (payload.roundRemainingMs === undefined || (payload.roundRemainingMs as number) >= 0)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
