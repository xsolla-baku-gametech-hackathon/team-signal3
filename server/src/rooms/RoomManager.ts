import { GameStatePayload, RoomStatePayload } from '../types/events.js';

export type Room = {
  roomId: string;
  gameSocketId?: string;
  crowdSocketIds: Set<string>;
  gameState?: GameStatePayload;
};

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  joinGame(roomId: string, socketId: string): Room {
    const room = this.getOrCreateRoom(roomId);
    if (room.gameSocketId !== socketId) room.gameState = undefined;
    room.gameSocketId = socketId;
    return room;
  }

  joinCrowd(roomId: string, socketId: string): Room {
    const room = this.getOrCreateRoom(roomId);
    room.crowdSocketIds.add(socketId);
    return room;
  }

  leave(socketId: string): Room[] {
    const changedRooms: Room[] = [];

    for (const room of this.rooms.values()) {
      let changed = false;

      if (room.gameSocketId === socketId) {
        room.gameSocketId = undefined;
        room.gameState = undefined;
        changed = true;
      }

      if (room.crowdSocketIds.delete(socketId)) {
        changed = true;
      }

      if (changed) {
        changedRooms.push(room);
      }
    }

    return changedRooms;
  }

  setGameState(state: GameStatePayload): Room | undefined {
    const room = this.rooms.get(state.roomId);

    if (!room) {
      return undefined;
    }

    room.gameState = state;
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomState(roomId: string): RoomStatePayload {
    const room = this.getOrCreateRoom(roomId);

    return {
      roomId,
      crowdCount: room.crowdSocketIds.size,
      gameConnected: room.gameSocketId !== undefined
    };
  }

  private getOrCreateRoom(roomId: string): Room {
    const existingRoom = this.rooms.get(roomId);

    if (existingRoom) {
      return existingRoom;
    }

    const room: Room = {
      roomId,
      crowdSocketIds: new Set<string>()
    };
    this.rooms.set(roomId, room);
    return room;
  }
}
