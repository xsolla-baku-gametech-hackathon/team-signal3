import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  ActionResult,
  ChatBroadcast,
  ClientToServerEvents,
  ConnectionState,
  CrowdAction,
  DirectorDecisionBroadcast,
  LeaderboardBroadcast,
  LiveGameStatePayload,
  RoomStatePayload,
  ServerToClientEvents,
  SOCKET_EVENTS,
  VoterStatus
} from '../models/socket.models';

const MAX_CHAT_HISTORY = 100;

const VOTER_ID_STORAGE_KEY = 'crowd-director-voter-id';

function getOrCreateVoterId(): string {
  try {
    const existing = localStorage.getItem(VOTER_ID_STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(VOTER_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  readonly connectionState = signal<ConnectionState>('OFFLINE');
  readonly roomState = signal<RoomStatePayload | undefined>(undefined);
  readonly actionResult = signal<ActionResult | undefined>(undefined);

  readonly latestDecision = signal<DirectorDecisionBroadcast | undefined>(undefined);
  readonly liveGameState = signal<LiveGameStatePayload | undefined>(undefined);
  readonly pendingAction = signal<CrowdAction | undefined>(undefined);
  readonly voterStatus = signal<VoterStatus | undefined>(undefined);
  readonly leaderboard = signal<LeaderboardBroadcast | undefined>(undefined);
  readonly chatMessages = signal<ChatBroadcast[]>([]);

  readonly voterId = getOrCreateVoterId();
  private actionRequest = 0;

  private socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
  private currentRoomId?: string;
  private currentNickname?: string;

  connect(): void {
    if (this.socket) {
      return;
    }

    this.connectionState.set('CONNECTING');
    this.socket = io(this.getSocketUrl(), {
      transports: ['polling', 'websocket'],
      reconnection: true
    });
    this.registerHandlers(this.socket);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.connectionState.set('OFFLINE');
    this.clearRoomState();
  }

  rememberSession(roomId: string, nickname: string): void {
    sessionStorage.setItem('crowd-director-room', roomId);
    sessionStorage.setItem('crowd-director-nickname', nickname);
  }

  joinCrowd(roomId: string, nickname: string): void {
    this.clearRoomState();
    this.currentRoomId = roomId;
    this.currentNickname = nickname;
    this.rememberSession(roomId, nickname);
    this.connect();
    if (this.socket?.connected) this.rejoin();
  }

  sendAction(action: CrowdAction): void {
    if (this.pendingAction()) return;
    if (!this.currentRoomId || !this.socket?.connected || !this.roomState()?.gameConnected) {
      this.actionResult.set({ status: 'rejected', message: 'WAIT FOR THE ARENA CONNECTION' });
      return;
    }

    const state = this.liveGameState();
    if (state?.gameOver || (state?.roundPhase && state.roundPhase !== 'RUNNING')) {
      this.actionResult.set({ status: 'rejected', message: 'WAIT FOR THE NEXT ROUND' });
      return;
    }
    const request = ++this.actionRequest;
    this.pendingAction.set(action);
    this.actionResult.set(undefined);
    this.socket.timeout(4000).emit(SOCKET_EVENTS.CROWD_ACTION, { roomId: this.currentRoomId, action, voterId: this.voterId }, (error, response) => {
      if (request !== this.actionRequest) return;
      this.pendingAction.set(undefined);
      if (error) {
        this.actionResult.set({ status: 'rejected', message: 'VOTE NOT CONFIRMED — CHECK YOUR CONNECTION' });
        return;
      }
      if (response.ok) {
        this.actionResult.set({ status: 'sent', action: response.action });
        return;
      }
      if (response.reason === 'RATE_LIMITED') {
        this.actionResult.set({ status: 'rate-limited', message: 'TOO FAST - WAIT A MOMENT' });
        return;
      }
      this.actionResult.set({ status: 'rejected',
        message: response.reason === 'GAME_OFFLINE' ? 'GAME OFFLINE' : response.reason === 'ROUND_INACTIVE' ? 'WAIT FOR THE NEXT ROUND' : 'ACTION REJECTED' });
    });
  }

  sendChatMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || !this.currentRoomId || !this.socket?.connected) return;
    this.socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { roomId: this.currentRoomId, text: trimmed });
  }

  restoreSession(): { roomId?: string; nickname?: string } {
    return {
      roomId: sessionStorage.getItem('crowd-director-room') ?? undefined,
      nickname: sessionStorage.getItem('crowd-director-nickname') ?? undefined
    };
  }

  private registerHandlers(socket: Socket<ServerToClientEvents, ClientToServerEvents>): void {
    socket.on('connect', () => {
      this.connectionState.set('ONLINE');
      this.rejoin();
    });

    socket.io.on('reconnect_attempt', () => {
      this.connectionState.set('RECONNECTING');
    });

    socket.on('connect_error', () => {
      this.connectionState.set('OFFLINE');
      this.clearRoomState();
    });

    socket.on('disconnect', () => {
      this.connectionState.set('OFFLINE');
      this.clearRoomState();
    });

    socket.on(SOCKET_EVENTS.ROOM_STATE, (state) => {
      if (state.roomId !== this.currentRoomId) return;
      this.roomState.set(state);
      if (!state.gameConnected) {
        this.actionRequest += 1;
        this.pendingAction.set(undefined);
        this.liveGameState.set(undefined);
        this.latestDecision.set(undefined);
        this.actionResult.set(undefined);
      }
    });
    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (state) => {
      if (state.roomId !== this.currentRoomId) return;
      if (this.liveGameState()?.roundPhase !== state.roundPhase) {
        this.actionRequest += 1;
        this.pendingAction.set(undefined);
        this.latestDecision.set(undefined);
        this.actionResult.set(undefined);
        if (state.roundPhase === 'RUNNING') this.leaderboard.set(undefined);
      }
      this.liveGameState.set(state);
    });
    socket.on(SOCKET_EVENTS.DIRECTOR_DECISION, (decision) => {
      if (decision.roomId !== this.currentRoomId) return;
      this.latestDecision.set(decision);
      const ownStatus = decision.voterStatuses?.[this.voterId];
      if (ownStatus) this.voterStatus.set(ownStatus);
    });
    socket.on(SOCKET_EVENTS.LEADERBOARD, (leaderboard) => {
      if (leaderboard.roomId === this.currentRoomId) this.leaderboard.set(leaderboard);
    });
    socket.on(SOCKET_EVENTS.VOTER_STATUS, (status) => {
      this.voterStatus.set(status);
    });
    socket.on(SOCKET_EVENTS.CHAT_BROADCAST, (message) => {
      if (message.roomId !== this.currentRoomId) return;
      this.chatMessages.update((messages) => [...messages, message].slice(-MAX_CHAT_HISTORY));
    });
  }

  private clearRoomState(): void {
    this.actionRequest += 1;
    this.pendingAction.set(undefined);
    this.roomState.set(undefined);
    this.actionResult.set(undefined);
    this.latestDecision.set(undefined);
    this.liveGameState.set(undefined);
    this.leaderboard.set(undefined);
    this.chatMessages.set([]);
    this.voterStatus.set(undefined);
  }

  private rejoin(): void {
    if (this.currentRoomId && this.currentNickname) {
      this.socket?.emit(SOCKET_EVENTS.CROWD_JOIN, {
        roomId: this.currentRoomId,
        nickname: this.currentNickname,
        voterId: this.voterId
      });
    }
  }

  private getSocketUrl(): string {
    if (environment.socketUrl) {
      return environment.socketUrl;
    }

    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
}
