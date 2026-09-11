import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import {
  ClientToServerEvents,
  DirectorDecisionBroadcast,
  GameEvent,
  GameStatePayload,
  RoomStatePayload,
  ServerToClientEvents,
  SOCKET_EVENTS
} from '../network/network.types';

export type CrowdDirectorConfig = {
  serverUrl: string;
  roomId: string;
  reconnection?: boolean;
};

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type SocketFactory = (url: string, opts: Partial<ManagerOptions & SocketOptions>) => AppSocket;

const defaultSocketFactory: SocketFactory = (url, opts) => io(url, opts);

export class CrowdDirectorClient {
  private socket?: AppSocket;

  private readonly connectedHandlers = new Set<() => void>();
  private readonly disconnectedHandlers = new Set<() => void>();
  private readonly gameEventHandlers = new Set<(event: GameEvent) => void>();
  private readonly roomStateHandlers = new Set<(state: RoomStatePayload) => void>();
  private readonly directorDecisionHandlers = new Set<(decision: DirectorDecisionBroadcast) => void>();

  constructor(
    private readonly config: CrowdDirectorConfig,
    private readonly socketFactory: SocketFactory = defaultSocketFactory
  ) {}

  connect(): void {
    if (this.socket) {
      return;
    }

    this.socket = this.socketFactory(this.config.serverUrl, {
      transports: ['polling', 'websocket'],
      reconnection: this.config.reconnection ?? true
    });

    this.socket.on('connect', () => {
      this.joinRoom();
      this.notify(this.connectedHandlers);
    });

    this.socket.on('disconnect', () => {
      this.notify(this.disconnectedHandlers);
    });

    this.socket.on(SOCKET_EVENTS.GAME_EVENT, (event) => {
      this.notify(this.gameEventHandlers, event);
    });

    this.socket.on(SOCKET_EVENTS.ROOM_STATE, (state) => {
      this.notify(this.roomStateHandlers, state);
    });

    this.socket.on(SOCKET_EVENTS.DIRECTOR_DECISION, (decision) => {
      this.notify(this.directorDecisionHandlers, decision);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  reportGameState(state: Omit<GameStatePayload, 'roomId'>): void {
    if (!this.socket?.connected) return;
    this.socket.emit(SOCKET_EVENTS.GAME_STATE, { roomId: this.config.roomId, ...state });
  }

  onConnected(handler: () => void): void {
    this.connectedHandlers.add(handler);
  }

  offConnected(handler: () => void): void {
    this.connectedHandlers.delete(handler);
  }

  onDisconnected(handler: () => void): void {
    this.disconnectedHandlers.add(handler);
  }

  offDisconnected(handler: () => void): void {
    this.disconnectedHandlers.delete(handler);
  }

  onGameEvent(handler: (event: GameEvent) => void): void {
    this.gameEventHandlers.add(handler);
  }

  offGameEvent(handler: (event: GameEvent) => void): void {
    this.gameEventHandlers.delete(handler);
  }

  onRoomState(handler: (state: RoomStatePayload) => void): void {
    this.roomStateHandlers.add(handler);
  }

  offRoomState(handler: (state: RoomStatePayload) => void): void {
    this.roomStateHandlers.delete(handler);
  }

  onDirectorDecision(handler: (decision: DirectorDecisionBroadcast) => void): void {
    this.directorDecisionHandlers.add(handler);
  }

  offDirectorDecision(handler: (decision: DirectorDecisionBroadcast) => void): void {
    this.directorDecisionHandlers.delete(handler);
  }

  private joinRoom(): void {
    this.socket?.emit(SOCKET_EVENTS.GAME_JOIN, { roomId: this.config.roomId });
  }

  private notify<T>(handlers: Set<(value: T) => void>, value: T): void;
  private notify(handlers: Set<() => void>): void;
  private notify<T>(handlers: Set<((value: T) => void) | (() => void)>, value?: T): void {
    for (const handler of handlers) {
      (handler as (value?: T) => void)(value);
    }
  }
}
