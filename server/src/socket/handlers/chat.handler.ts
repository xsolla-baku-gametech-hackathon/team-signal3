import { RoomManager } from '../../rooms/RoomManager.js';
import { ChatBroadcast, ChatMessagePayload } from '../../types/events.js';
import { AppSocket, isValidRoomId } from './game.handler.js';

const MAX_MESSAGE_LENGTH = 240;
const MAX_MESSAGES_PER_WINDOW = 4;
const WINDOW_MS = 3000;

type RateLimitState = {
  windowStartedAt: number;
  count: number;
};

export class ChatHandler {
  private readonly messageWindows = new Map<string, RateLimitState>();

  constructor(private readonly roomManager: RoomManager) {}

  handleMessage(socket: AppSocket, payload: unknown): ChatBroadcast | undefined {
    if (!this.isChatPayload(payload) || !isValidRoomId(payload.roomId)) {
      console.warn(`[CHAT] Rejected invalid payload from ${socket.id}`);
      return undefined;
    }

    const room = this.roomManager.getRoom(payload.roomId);
    if (socket.data.role !== 'crowd' || socket.data.roomId !== payload.roomId ||
        !room?.crowdSocketIds.has(socket.id)) {
      return undefined;
    }

    const text = payload.text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return undefined;

    if (!this.consumeRateLimit(socket.id)) {
      console.warn(`[CHAT] Rate limited ${socket.id}`);
      return undefined;
    }

    return {
      roomId: payload.roomId,
      voterId: socket.data.voterId ?? socket.id,
      nickname: socket.data.nickname ?? 'Anonymous',
      text,
      timestamp: Date.now()
    };
  }

  removeSocket(socketId: string): void {
    this.messageWindows.delete(socketId);
  }

  private consumeRateLimit(socketId: string): boolean {
    const now = Date.now();
    const current = this.messageWindows.get(socketId);

    if (!current || now - current.windowStartedAt >= WINDOW_MS) {
      this.messageWindows.set(socketId, { windowStartedAt: now, count: 1 });
      return true;
    }

    if (current.count >= MAX_MESSAGES_PER_WINDOW) {
      return false;
    }

    current.count += 1;
    return true;
  }

  private isChatPayload(payload: unknown): payload is ChatMessagePayload {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return false;
    }

    const record = payload as Record<string, unknown>;
    return typeof record.roomId === 'string' && typeof record.text === 'string';
  }
}
