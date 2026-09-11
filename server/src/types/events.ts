export const SOCKET_EVENTS = {
  GAME_JOIN: 'GAME_JOIN',
  CROWD_JOIN: 'CROWD_JOIN',
  CROWD_ACTION: 'CROWD_ACTION',
  GAME_EVENT: 'GAME_EVENT',
  GAME_STATE: 'GAME_STATE',
  ROOM_STATE: 'ROOM_STATE',
  DIRECTOR_DECISION: 'DIRECTOR_DECISION',
  DASHBOARD_JOIN: 'DASHBOARD_JOIN',
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
  LEADERBOARD: 'LEADERBOARD',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  CHAT_BROADCAST: 'CHAT_BROADCAST',
  VOTER_STATUS: 'VOTER_STATUS'
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export type CrowdAction = 'SPAWN_ZOMBIE' | 'HEAL' | 'LIGHTNING' | 'STORM' | 'BOSS' | 'VIP_SHIELD';

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

export type VoterTier = 1 | 2 | 3;

export type VoterStatus = {
  voterId: string;
  nickname?: string;
  dp: number;
  tier: VoterTier;
  tierLabel: string;
  voteWeight: number;
  tierStartDp: number;
  nextTierAt?: number;
};

export type LeaderboardBroadcast = {
  roomId: string;
  entries: VoterStatus[];
};

export type DirectorDecisionBroadcast = {
  roomId: string;
  timestamp: number;
  ruleBaseline: { event: string; intensity: number; reason: string };
  aiProposal?: { event: string; intensity: number; reason: string };
  final: { event: string; intensity: number; reason: string; source: DirectorSource };
  aiLatencyMs?: number;
  fallbackReason?: string;
  voterStatuses: Record<string, VoterStatus>;
  topVoter?: { voterId: string; nickname?: string; tierLabel: string };
  crowdSnapshot: {
    totalActions: number;
    uniqueParticipants: number;
    votes: Record<string, number>;
    dominantAction: string;
    consensus: number;
    aggressionScore: number;
    assistanceScore: number;
  };
  gameState: {
    hp: number;
    shield: number;
    score: number;
    wave: number;
    enemyCount: number;
    bossActive: boolean;
    stormActive: boolean;
    gameOver: boolean;
  };
};

export type GameJoinPayload = {
  roomId: string;
};

export type CrowdJoinPayload = {
  roomId: string;
  nickname?: string;
  voterId?: string;
};

export type ChatMessagePayload = {
  roomId: string;
  text: string;
};

export type ChatBroadcast = {
  roomId: string;
  voterId: string;
  nickname: string;
  text: string;
  timestamp: number;
};

export type DashboardJoinPayload = {
  roomId: string;
};

export type CrowdActionPayload = {
  roomId: string;
  action: CrowdAction;
  voterId?: string;
};

export type GameStatePayload = {
  roomId: string;
  hp: number;
  shield: number;
  score: number;
  wave: number;
  enemyCount?: number;
  bossActive?: boolean;
  stormActive?: boolean;
  gameOver?: boolean;
  roundPhase?: 'WAITING' | 'RUNNING' | 'WON' | 'LOST';
  roundRemainingMs?: number;
};

export type RoomStatePayload = {
  roomId: string;
  crowdCount: number;
  gameConnected: boolean;
};

export type CrowdActionResponse =
  | { ok: true; action: CrowdAction }
  | { ok: false; reason: 'INVALID_ACTION' | 'RATE_LIMITED' | 'GAME_OFFLINE' | 'ROUND_INACTIVE' };

export interface ServerToClientEvents {
  [SOCKET_EVENTS.GAME_EVENT]: (event: GameEvent) => void;
  [SOCKET_EVENTS.ROOM_STATE]: (state: RoomStatePayload) => void;
  [SOCKET_EVENTS.DIRECTOR_DECISION]: (decision: DirectorDecisionBroadcast) => void;
  [SOCKET_EVENTS.GAME_STATE_UPDATE]: (state: GameStatePayload) => void;
  [SOCKET_EVENTS.LEADERBOARD]: (leaderboard: LeaderboardBroadcast) => void;
  [SOCKET_EVENTS.CHAT_BROADCAST]: (message: ChatBroadcast) => void;
  [SOCKET_EVENTS.VOTER_STATUS]: (status: VoterStatus) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.GAME_JOIN]: (payload: GameJoinPayload) => void;
  [SOCKET_EVENTS.CROWD_JOIN]: (payload: CrowdJoinPayload) => void;
  [SOCKET_EVENTS.CROWD_ACTION]: (payload: CrowdActionPayload, callback?: (response: CrowdActionResponse) => void) => void;
  [SOCKET_EVENTS.GAME_STATE]: (payload: GameStatePayload) => void;
  [SOCKET_EVENTS.DASHBOARD_JOIN]: (payload: DashboardJoinPayload) => void;
  [SOCKET_EVENTS.CHAT_MESSAGE]: (payload: ChatMessagePayload) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  roomId?: string;
  role?: 'game' | 'crowd' | 'dashboard';
  nickname?: string;
  voterId?: string;
}
