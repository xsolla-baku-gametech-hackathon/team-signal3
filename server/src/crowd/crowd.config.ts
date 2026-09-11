import { CrowdAction } from '../types/events.js';

export const CROWD_AGGREGATION_WINDOW_MS = 5000;

export const CROWD_ACTIONS: readonly CrowdAction[] = ['SPAWN_ZOMBIE', 'HEAL', 'LIGHTNING', 'STORM', 'BOSS', 'VIP_SHIELD'];

export const ACTION_AGGRESSION_WEIGHTS: Record<CrowdAction, number> = {
  SPAWN_ZOMBIE: 0.4,
  HEAL: 0,
  LIGHTNING: 0.6,
  STORM: 0.8,
  BOSS: 1,
  VIP_SHIELD: 0
};

export const ACTION_ASSISTANCE_WEIGHTS: Record<CrowdAction, number> = {
  SPAWN_ZOMBIE: 0,
  HEAL: 1,
  LIGHTNING: 0,
  STORM: 0,
  BOSS: 0,
  VIP_SHIELD: 1
};
