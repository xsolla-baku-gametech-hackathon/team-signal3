import { RoomManager } from '../../rooms/RoomManager.js';
import { DirectorService } from '../../director/DirectorService.js';
import { CrowdActionProcessor } from '../../services/CrowdActionProcessor.js';
import { CrowdActionResponse, SOCKET_EVENTS } from '../../types/events.js';
import { AppSocket, isValidRoomId } from './game.handler.js';
import { VoterScoreService } from '../../voters/VoterScoreService.js';

const MASTER_DIRECTOR_TIER = 3;

type RateLimitState = {
  windowStartedAt: number;
  count: number;
};

export class CrowdHandler {
  private readonly actionWindows = new Map<string, RateLimitState>();

  constructor(
    private readonly roomManager: RoomManager,
    private readonly processor: CrowdActionProcessor,
    private readonly directorService: DirectorService,
    private readonly maxActionsPerSecond: number,
    private readonly voterScores: VoterScoreService = new VoterScoreService()
  ) {}

  join(socket: AppSocket, payload: unknown): string | undefined {
    if (!this.isJoinPayload(payload) || !isValidRoomId(payload.roomId)) {
      console.warn(`[ROOM] Rejected invalid crowd room from ${socket.id}`);
      return undefined;
    }

    if (socket.data.role && socket.data.role !== 'crowd') return undefined;
    if (socket.data.roomId && socket.data.roomId !== payload.roomId) {
      socket.leave(socket.data.roomId);
      this.roomManager.leave(socket.id);
    }
    socket.data.role = 'crowd';
    socket.data.roomId = payload.roomId;
    if (typeof payload.nickname === 'string' && payload.nickname.trim()) socket.data.nickname = payload.nickname.trim().slice(0, 24);
    if (typeof payload.voterId === 'string' && payload.voterId) socket.data.voterId = payload.voterId;
    if (socket.data.nickname && socket.data.voterId) this.voterScores.setNickname(payload.roomId, socket.data.voterId, socket.data.nickname);
    socket.join(payload.roomId);
    this.roomManager.joinCrowd(payload.roomId, socket.id);
    if (socket.data.voterId) {
      socket.emit(SOCKET_EVENTS.VOTER_STATUS, this.voterScores.getStatus(payload.roomId, socket.data.voterId));
    }
    console.info(`[ROOM] Crowd joined ${payload.roomId}`);
    return payload.roomId;
  }

  handleAction(socket: AppSocket, payload: unknown): CrowdActionResponse {
    const validation = this.processor.validate(payload);

    if (!validation.valid) {
      console.warn(`[ACTION] Rejected from ${socket.id}: ${validation.reason}`);
      return { ok: false, reason: 'INVALID_ACTION' };
    }

    const room = this.roomManager.getRoom(validation.payload.roomId);
    if (socket.data.role !== 'crowd' || socket.data.roomId !== validation.payload.roomId ||
        !room?.crowdSocketIds.has(socket.id)) {
      return { ok: false, reason: 'INVALID_ACTION' };
    }

    if (!this.consumeRateLimit(socket.id)) {
      console.warn(`[ACTION] Rate limited ${socket.id}`);
      return { ok: false, reason: 'RATE_LIMITED' };
    }

    const voterId = validation.payload.voterId ?? socket.id;
    if (validation.payload.action === 'VIP_SHIELD' &&
        this.voterScores.getStatus(validation.payload.roomId, voterId).tier < MASTER_DIRECTOR_TIER) {
      console.warn(`[ACTION] Rejected VIP_SHIELD from non-Master voter ${voterId}`);
      return { ok: false, reason: 'INVALID_ACTION' };
    }

    if (!room?.gameSocketId) {
      console.warn(`[ACTION] No game connected for ${validation.payload.roomId}`);
      return { ok: false, reason: 'GAME_OFFLINE' };
    }

    if (room.gameState?.gameOver || (room.gameState?.roundPhase && room.gameState.roundPhase !== 'RUNNING')) {
      return { ok: false, reason: 'ROUND_INACTIVE' };
    }

    this.directorService.queueAction({
      roomId: validation.payload.roomId,
      participantId: socket.id,
      action: validation.payload.action,
      voterId
    });
    console.info(`[ACTION] Queued ${validation.payload.action} from socket ${socket.id} in ${validation.payload.roomId}`);
    return { ok: true, action: validation.payload.action };
  }

  removeSocket(socketId: string): void {
    this.actionWindows.delete(socketId);
  }

  private consumeRateLimit(socketId: string): boolean {
    const now = Date.now();
    const current = this.actionWindows.get(socketId);

    if (!current || now - current.windowStartedAt >= 1000) {
      this.actionWindows.set(socketId, { windowStartedAt: now, count: 1 });
      return true;
    }

    if (current.count >= this.maxActionsPerSecond) {
      return false;
    }

    current.count += 1;
    return true;
  }

  private isJoinPayload(payload: unknown): payload is { roomId: string; nickname?: string; voterId?: string } {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return false;
    }

    return typeof (payload as Record<string, unknown>).roomId === 'string';
  }
}
