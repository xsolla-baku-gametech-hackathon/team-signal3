export const SOCKET_EVENTS = {
  GAME_JOIN: 'GAME_JOIN',
  CROWD_JOIN: 'CROWD_JOIN',
  CROWD_ACTION: 'CROWD_ACTION',
  GAME_EVENT: 'GAME_EVENT',
  GAME_STATE: 'GAME_STATE',
  ROOM_STATE: 'ROOM_STATE',
  DIRECTOR_DECISION: 'DIRECTOR_DECISION'
} as const;

export type CrowdAction = 'SPAWN_ZOMBIE' | 'HEAL' | 'LIGHTNING' | 'STORM' | 'BOSS';

export type DirectorSource = 'RULE_ENGINE' | 'AI_DIRECTOR' | 'AI_FALLBACK';

type GameEventMeta = {
  intensity?: number;
  reason?: string;
  source?: DirectorSource;
};

export type GameEvent = GameEventMeta &
  (
    | { type: 'SPAWN_ZOMBIE' }
    | { type: 'ZOMBIE_WAVE'; count: number }
    | { type: 'HEAL'; amount: number }
    | { type: 'EMERGENCY_HEAL'; amount: number }
    | { type: 'LIGHTNING' }
    | { type: 'STORM' }
    | { type: 'BOSS' }
    | { type: 'BOSS_RUSH' }
  );

export type GameStatePayload = {
  roomId: string;
  hp: number;
  shield: number;
  score: number;
  wave: number;
  enemyCount: number;
  bossActive: boolean;
  stormActive: boolean;
  gameOver: boolean;
  roundPhase?: 'WAITING' | 'RUNNING' | 'WON' | 'LOST';
  roundRemainingMs?: number;
};

export type RoomStatePayload = {
  roomId: string;
  crowdCount: number;
  gameConnected: boolean;
};

export type DirectorDecisionSummary = {
  event: string;
  intensity: number;
  reason: string;
};

export type DirectorFinalDecision = DirectorDecisionSummary & {
  source: DirectorSource;
};

export type CrowdSnapshotSummary = {
  totalActions: number;
  uniqueParticipants: number;
  votes: Record<string, number>;
  dominantAction: string;
  consensus: number;
  aggressionScore: number;
  assistanceScore: number;
};

export type DirectorDecisionBroadcast = {
  roomId: string;
  timestamp: number;
  ruleBaseline: DirectorDecisionSummary;
  aiProposal?: DirectorDecisionSummary;
  final: DirectorFinalDecision;
  aiLatencyMs?: number;
  fallbackReason?: string;
  crowdSnapshot: CrowdSnapshotSummary;
  topVoter?: { voterId: string; tierLabel: string };
};

export interface ServerToClientEvents {
  [SOCKET_EVENTS.GAME_EVENT]: (event: GameEvent) => void;
  [SOCKET_EVENTS.ROOM_STATE]: (state: RoomStatePayload) => void;
  [SOCKET_EVENTS.DIRECTOR_DECISION]: (decision: DirectorDecisionBroadcast) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.GAME_JOIN]: (payload: { roomId: string }) => void;
  [SOCKET_EVENTS.CROWD_JOIN]: (payload: { roomId: string }) => void;
  [SOCKET_EVENTS.CROWD_ACTION]: (payload: { roomId: string; action: CrowdAction }) => void;
  [SOCKET_EVENTS.GAME_STATE]: (payload: GameStatePayload) => void;
}
