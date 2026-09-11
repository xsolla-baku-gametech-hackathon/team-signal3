export const DIRECTOR_EVENTS = [
  'NO_EVENT',
  'SPAWN_ZOMBIE',
  'ZOMBIE_WAVE',
  'HEAL',
  'EMERGENCY_HEAL',
  'LIGHTNING',
  'STORM',
  'BOSS',
  'BOSS_RUSH'
] as const;

export type DirectorEventType = (typeof DIRECTOR_EVENTS)[number];

export type RuleDecisionSummary = {
  event: DirectorEventType;
  intensity: number;
  reason: string;
};

export type AiDirectorInput = {
  roomId: string;
  crowd: {
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
  ruleDecision: RuleDecisionSummary;
  allowedEvents: DirectorEventType[];
};

export type AiDirectorOutput = {
  event: DirectorEventType;
  intensity: number;
  reason: string;
};

export type AiDirectorResult =
  | { ok: true; output: AiDirectorOutput; latencyMs: number }
  | { ok: false; fallbackReason: string; latencyMs: number };
