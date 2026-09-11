import { CrowdSnapshot } from '../crowd/crowd.types.js';
import { GameEvent, GameStatePayload, RoomStatePayload } from '../types/events.js';

export type RuleContext = {
  snapshot: CrowdSnapshot;
  gameState?: GameStatePayload;
  roomState: RoomStatePayload;
};

export type DirectorDecision = {
  roomId: string;
  event?: GameEvent;
  reason: string;
  snapshot: CrowdSnapshot;
};
