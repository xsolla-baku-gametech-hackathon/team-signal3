export const SOCKET_EVENTS = {
  CROWD_JOIN: 'CROWD_JOIN',
  CROWD_ACTION: 'CROWD_ACTION',
  ROOM_STATE: 'ROOM_STATE',
  DIRECTOR_DECISION: 'DIRECTOR_DECISION',
  DASHBOARD_JOIN: 'DASHBOARD_JOIN',
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
  LEADERBOARD: 'LEADERBOARD',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  CHAT_BROADCAST: 'CHAT_BROADCAST',
  VOTER_STATUS: 'VOTER_STATUS'
} as const;

export type CrowdAction = 'SPAWN_ZOMBIE' | 'HEAL' | 'LIGHTNING' | 'STORM' | 'BOSS' | 'VIP_SHIELD';

export type ConnectionState = 'ONLINE' | 'CONNECTING' | 'RECONNECTING' | 'OFFLINE';

export type RoomStatePayload = {
  roomId: string;
  crowdCount: number;
  gameConnected: boolean;
};

export type ActionResult =
  | { status: 'sent'; action: CrowdAction }
  | { status: 'rejected'; message: string }
  | { status: 'rate-limited'; message: string };

export type CrowdActionResponse =
  | { ok: true; action: CrowdAction }
  | { ok: false; reason: 'INVALID_ACTION' | 'RATE_LIMITED' | 'GAME_OFFLINE' | 'ROUND_INACTIVE' };

export type DirectorSource = 'RULE_ENGINE' | 'AI_DIRECTOR' | 'AI_FALLBACK';

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

export type DirectorGameState = {
  hp: number;
  shield: number;
  score: number;
  wave: number;
  enemyCount: number;
  bossActive: boolean;
  stormActive: boolean;
  gameOver: boolean;
};

export type LiveGameStatePayload = {
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

export type ChatBroadcast = {
  roomId: string;
  voterId: string;
  nickname: string;
  text: string;
  timestamp: number;
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
  gameState: DirectorGameState;
  voterStatuses?: Record<string, VoterStatus>;
};

export interface ServerToClientEvents {
  [SOCKET_EVENTS.ROOM_STATE]: (state: RoomStatePayload) => void;
  [SOCKET_EVENTS.DIRECTOR_DECISION]: (decision: DirectorDecisionBroadcast) => void;
  [SOCKET_EVENTS.GAME_STATE_UPDATE]: (state: LiveGameStatePayload) => void;
  [SOCKET_EVENTS.LEADERBOARD]: (leaderboard: LeaderboardBroadcast) => void;
  [SOCKET_EVENTS.CHAT_BROADCAST]: (message: ChatBroadcast) => void;
  [SOCKET_EVENTS.VOTER_STATUS]: (status: VoterStatus) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.CROWD_JOIN]: (payload: { roomId: string; nickname?: string; voterId: string }) => void;
  [SOCKET_EVENTS.CROWD_ACTION]: (payload: { roomId: string; action: CrowdAction; voterId: string }, callback: (response: CrowdActionResponse) => void) => void;
  [SOCKET_EVENTS.DASHBOARD_JOIN]: (payload: { roomId: string }) => void;
  [SOCKET_EVENTS.CHAT_MESSAGE]: (payload: { roomId: string; text: string }) => void;
}
