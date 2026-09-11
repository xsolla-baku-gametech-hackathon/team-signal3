import { AiDirectorInput, DIRECTOR_EVENTS, DirectorEventType, RuleDecisionSummary } from '../ai/ai.types.js';
import { CrowdSnapshot } from '../crowd/crowd.types.js';
import { DirectorDecision } from '../rules/rule.types.js';
import { RULES } from '../rules/rules.js';
import { DirectorSource, GameEvent, GameStatePayload } from '../types/events.js';

const DEFAULT_INTENSITY: Record<DirectorEventType, number> = {
  NO_EVENT: 0,
  SPAWN_ZOMBIE: 0.4,
  ZOMBIE_WAVE: 0.6,
  HEAL: 0.3,
  EMERGENCY_HEAL: 0.9,
  LIGHTNING: 0.5,
  STORM: 0.6,
  BOSS: 0.7,
  BOSS_RUSH: 0.85
};

export function toRuleDecisionSummary(decision: DirectorDecision): RuleDecisionSummary {
  if (!decision.event) {
    return { event: 'NO_EVENT', intensity: 0, reason: decision.reason };
  }

  const event = decision.event.type;
  return { event, intensity: DEFAULT_INTENSITY[event], reason: decision.reason };
}

export function buildAiInput(
  roomId: string,
  snapshot: CrowdSnapshot,
  gameState: GameStatePayload | undefined,
  ruleBaseline: RuleDecisionSummary
): AiDirectorInput {
  return {
    roomId,
    crowd: {
      totalActions: snapshot.totalActions,
      uniqueParticipants: snapshot.uniqueParticipants,
      votes: snapshot.votes,
      dominantAction: snapshot.dominantAction,
      consensus: snapshot.consensus,
      aggressionScore: snapshot.aggressionScore,
      assistanceScore: snapshot.assistanceScore
    },
    gameState: {
      hp: gameState?.hp ?? 100,
      shield: gameState?.shield ?? 0,
      score: gameState?.score ?? 0,
      wave: gameState?.wave ?? 1,
      enemyCount: gameState?.enemyCount ?? 0,
      bossActive: gameState?.bossActive ?? false,
      stormActive: gameState?.stormActive ?? false,
      gameOver: gameState?.gameOver ?? false
    },
    ruleDecision: ruleBaseline,
    allowedEvents: [...DIRECTOR_EVENTS]
  };
}

export function toGameEvent(
  type: DirectorEventType,
  intensity: number,
  reason: string,
  source: DirectorSource
): GameEvent | undefined {
  switch (type) {
    case 'NO_EVENT':
      return undefined;
    case 'SPAWN_ZOMBIE':
      return { type: 'SPAWN_ZOMBIE', intensity, reason, source };
    case 'ZOMBIE_WAVE':
      return { type: 'ZOMBIE_WAVE', count: Math.round(3 + intensity * 5), intensity, reason, source };
    case 'HEAL':
      return { type: 'HEAL', amount: RULES.healAmount, intensity, reason, source };
    case 'EMERGENCY_HEAL':
      return { type: 'EMERGENCY_HEAL', amount: RULES.emergencyHealAmount, intensity, reason, source };
    case 'LIGHTNING':
      return { type: 'LIGHTNING', intensity, reason, source };
    case 'STORM':
      return { type: 'STORM', intensity, reason, source };
    case 'BOSS':
      return { type: 'BOSS', intensity, reason, source };
    case 'BOSS_RUSH':
      return { type: 'BOSS_RUSH', intensity, reason, source };
  }
}
