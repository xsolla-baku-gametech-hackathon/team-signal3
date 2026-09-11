import { signal } from '@angular/core';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import {
  ClientToServerEvents,
  ConnectionState,
  DirectorDecisionBroadcast,
  LiveGameStatePayload,
  ServerToClientEvents,
  SOCKET_EVENTS
} from '../../core/models/socket.models';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type SocketFactory = (url: string, opts: Partial<ManagerOptions & SocketOptions>) => AppSocket;

const defaultSocketFactory: SocketFactory = (url, opts) => io(url, opts);

export class DirectorSocketConnection {
  readonly connectionState = signal<ConnectionState>('OFFLINE');
  readonly latestDecision = signal<DirectorDecisionBroadcast | undefined>(undefined);
  readonly liveGameState = signal<LiveGameStatePayload | undefined>(undefined);

  private socket?: AppSocket;
  private roomId?: string;

  constructor(
    private readonly socketUrl: string,
    private readonly socketFactory: SocketFactory = defaultSocketFactory
  ) {}

  connect(roomId: string): void {
    this.roomId = roomId;

    if (this.socket) {
      this.joinDashboard();
      return;
    }

    this.connectionState.set('CONNECTING');
    this.socket = this.socketFactory(this.socketUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true
    });
    this.registerHandlers(this.socket);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.connectionState.set('OFFLINE');
  }

  private registerHandlers(socket: AppSocket): void {
    socket.on('connect', () => {
      this.connectionState.set('ONLINE');
      this.joinDashboard();
    });

    socket.on('disconnect', () => {
      this.connectionState.set('OFFLINE');
    });

    socket.on(SOCKET_EVENTS.DIRECTOR_DECISION, (decision) => {
      this.latestDecision.set(decision);
    });

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (state) => {
      this.liveGameState.set(state);
    });
  }

  private joinDashboard(): void {
    if (this.roomId) {
      this.socket?.emit(SOCKET_EVENTS.DASHBOARD_JOIN, { roomId: this.roomId });
    }
  }
}
