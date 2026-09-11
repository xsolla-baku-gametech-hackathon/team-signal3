import * as THREE from 'three';
import { EnemySystem } from '../systems/EnemySystem';
import { AbilityBar } from '../ui/AbilityBar';

export type AbilityContext = {
  scene: THREE.Scene;
  playerPosition: THREE.Vector3;
  aimPoint: THREE.Vector3 | undefined;
  aimDirection: THREE.Vector2;
  enemySystem: EnemySystem | undefined;
};

export type AbilityDefinition = {
  key: string;
  label: string;
  icon: string;
  cooldownMs: number;
  cast: (context: AbilityContext) => void;
};

const CAST_EFFECT_DELAY_FRACTION = 0.45;

export class AbilitySystem {
  private readonly pendingEffects = new Set<number>();

  cancelPending(): void {
    for (const timer of this.pendingEffects) window.clearTimeout(timer);
    this.pendingEffects.clear();
  }

  private readonly cooldownEndsAtMs = new Map<string, number>();

  constructor(
    private readonly abilities: AbilityDefinition[],
    private readonly bar: AbilityBar
  ) {}

  tryCast(key: string, context: AbilityContext, onEffectFired?: () => void): boolean {
    const ability = this.abilities.find((candidate) => candidate.key === key);

    if (!ability) {
      return false;
    }

    const now = performance.now();
    const readyAt = this.cooldownEndsAtMs.get(key) ?? 0;

    if (now < readyAt) {
      return false;
    }

    this.cooldownEndsAtMs.set(key, now + ability.cooldownMs);

    const timer = window.setTimeout(() => {
      this.pendingEffects.delete(timer);
      ability.cast(context);
      onEffectFired?.();
    }, ability.cooldownMs * CAST_EFFECT_DELAY_FRACTION);
    this.pendingEffects.add(timer);

    return true;
  }

  updateHud(): void {
    const now = performance.now();

    for (const ability of this.abilities) {
      const readyAt = this.cooldownEndsAtMs.get(ability.key) ?? 0;
      const remainingMs = Math.max(0, readyAt - now);
      this.bar.setCooldownFraction(ability.key, remainingMs / ability.cooldownMs);
    }
  }
}
