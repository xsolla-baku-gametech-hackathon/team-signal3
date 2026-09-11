import { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { AiDirector } from '../ai/AiDirector.js';
import { aiConfig } from '../ai/ai.config.js';
import { isAllowedOrigin } from '../config/corsOrigin.js';
import { env } from '../config/env.js';
import { DirectorService } from '../director/DirectorService.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { RuleEngine } from '../rules/RuleEngine.js';
import { CrowdActionProcessor } from '../services/CrowdActionProcessor.js';
import { TwitchChatBridge } from '../integrations/TwitchChatBridge.js';
import { VoterScoreService } from '../voters/VoterScoreService.js';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  SOCKET_EVENTS
} from '../types/events.js';
import { CrowdHandler } from './handlers/crowd.handler.js';
import { ChatHandler } from './handlers/chat.handler.js';
import { handleGameJoin, handleGameState, isValidRoomId } from './handlers/game.handler.js';

export function createSocketServer(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin, env.clientOrigins));
      },
      methods: ['GET', 'POST']
    }
  });
  const roomManager = new RoomManager();
  const aiDirector = new AiDirector(aiConfig);
  console.info(
    `[AI] enabled=${aiConfig.enabled} mock=${aiConfig.mock} provider=${aiConfig.provider} available=${aiDirector.isAvailable()}`
  );
  const voterScores = new VoterScoreService();
  const directorService = new DirectorService(io, roomManager, new RuleEngine(), env.crowdAggregationWindowMs, aiDirector, voterScores);
  const crowdHandler = new CrowdHandler(roomManager, new CrowdActionProcessor(), directorService, env.crowdActionsPerSecond, voterScores);
  const chatHandler = new ChatHandler(roomManager);

  if (env.twitchChannel) {
    const twitchBridge = new TwitchChatBridge(env.twitchChannel, env.twitchRoomId, directorService);
    twitchBridge.connect().catch((error: unknown) => {
      console.error(`[TWITCH] Failed to connect to #${env.twitchChannel} chat.`, error);
    });
  }

  io.on('connection', (socket) => {
    console.info(`[SOCKET] connected ${socket.id}`);

    socket.on(SOCKET_EVENTS.GAME_JOIN, (payload) => {
      const roomId = handleGameJoin(socket, payload, roomManager);

      if (roomId) {
        broadcastRoomState(io, roomManager, roomId);
      }
    });

    socket.on(SOCKET_EVENTS.CROWD_JOIN, (payload) => {
      const previousRoomId = socket.data.roomId;
      const roomId = crowdHandler.join(socket, payload);
      if (roomId && previousRoomId && previousRoomId !== roomId) {
        broadcastRoomState(io, roomManager, previousRoomId);
      }

      if (roomId) {
        broadcastRoomState(io, roomManager, roomId);
      }
    });

    socket.on(SOCKET_EVENTS.CROWD_ACTION, (payload, callback) => {
      const response = crowdHandler.handleAction(socket, payload);
      callback?.(response);
    });

    socket.on(SOCKET_EVENTS.GAME_STATE, (payload) => {
      const applied = handleGameState(payload, roomManager, socket);

      if (applied) {
        const roundEnded = applied.gameOver || applied.roundPhase === 'WON' || applied.roundPhase === 'LOST';
        if (roundEnded || (applied.roundPhase && applied.roundPhase !== 'RUNNING')) {
          directorService.clearRoom(applied.roomId);
        }
        socket.to(applied.roomId).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, applied);
        if (roundEnded) {
          socket.to(applied.roomId).emit(SOCKET_EVENTS.LEADERBOARD, {
            roomId: applied.roomId,
            entries: voterScores.getLeaderboard(applied.roomId)
          });
        }
      }
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (payload) => {
      const message = chatHandler.handleMessage(socket, payload);
      if (message) io.to(message.roomId).emit(SOCKET_EVENTS.CHAT_BROADCAST, message);
    });

    socket.on(SOCKET_EVENTS.DASHBOARD_JOIN, (payload) => {
      if (!payload || !isValidRoomId(payload.roomId)) {
        console.warn(`[ROOM] Rejected invalid dashboard join from ${socket.id}`);
        return;
      }

      if (socket.data.role && socket.data.role !== 'dashboard') return;
      if (socket.data.roomId && socket.data.roomId !== payload.roomId) socket.leave(socket.data.roomId);
      socket.data.role = 'dashboard';
      socket.data.roomId = payload.roomId;
      socket.join(payload.roomId);
      const state = roomManager.getRoom(payload.roomId)?.gameState;
      if (state) socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, state);
      console.info(`[ROOM] Dashboard joined ${payload.roomId} (read-only)`);
    });

    socket.on('disconnect', () => {
      const changedRooms = roomManager.leave(socket.id);
      crowdHandler.removeSocket(socket.id);
      chatHandler.removeSocket(socket.id);
      if (socket.data.role === 'game' && socket.data.roomId) {
        directorService.clearRoom(socket.data.roomId);
      }
      console.info(`[ROOM] ${socket.data.role ?? 'socket'} disconnected ${socket.id}`);

      for (const room of changedRooms) {
        broadcastRoomState(io, roomManager, room.roomId);
      }
    });
  });

  return io;
}

function broadcastRoomState(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomManager: RoomManager,
  roomId: string
): void {
  io.to(roomId).emit(SOCKET_EVENTS.ROOM_STATE, roomManager.getRoomState(roomId));
  const state = roomManager.getRoom(roomId)?.gameState;
  if (state) io.to(roomId).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, state);
}
