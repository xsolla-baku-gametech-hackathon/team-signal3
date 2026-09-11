import { AiDirectorInput, DirectorEventType } from '../ai/ai.types.js';
import { RULES } from '../rules/rules.js';

const LETHAL_EVENTS: DirectorEventType[] = ['BOSS_RUSH', 'BOSS', 'ZOMBIE_WAVE'];

export type SafetyCheck = { safe: true } | { safe: false; reason: string };

export function checkEventSafety(
  event: DirectorEventType,
  gameState: AiDirectorInput['gameState']
): SafetyCheck {
  if (gameState.gameOver) {
    return event === 'NO_EVENT' ? { safe: true } : { safe: false, reason: 'Game is over; no further events are allowed.' };
  }

  if (event === 'STORM' && gameState.stormActive) {
    return { safe: false, reason: 'Storm already active; overlapping storm rejected.' };
  }

  if ((event === 'BOSS' || event === 'BOSS_RUSH') && gameState.bossActive) {
    return { safe: false, reason: 'Boss already active; stacking another boss rejected.' };
  }

  if (gameState.hp <= RULES.criticalHpThreshold && LETHAL_EVENTS.includes(event)) {
    return { safe: false, reason: 'Player HP critical; lethal event rejected.' };
  }

  return { safe: true };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
