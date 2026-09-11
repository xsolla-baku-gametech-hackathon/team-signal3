import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbilityBar } from '../../ui/AbilityBar';
import { AbilityDefinition, AbilityContext, AbilitySystem } from '../AbilitySystem';

function makeContext(): AbilityContext {
  return {
    scene: new THREE.Scene(),
    playerPosition: new THREE.Vector3(),
    aimPoint: undefined,
    aimDirection: new THREE.Vector2(0, 1),
    enemySystem: undefined
  };
}

function makeAbility(overrides: Partial<AbilityDefinition> = {}): AbilityDefinition {
  return {
    key: 'Q',
    label: 'Test',
    icon: '⚡',
    cooldownMs: 1000,
    cast: vi.fn(),
    ...overrides
  };
}

describe('AbilitySystem', () => {
  let bar: AbilityBar;

  beforeEach(() => {
    document.body.innerHTML = '';
    bar = new AbilityBar([{ key: 'Q', label: 'Test', icon: '⚡' }]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true immediately but defers the actual cast to mid-animation', () => {
    const ability = makeAbility({ cooldownMs: 1000 });
    const system = new AbilitySystem([ability], bar);

    const result = system.tryCast('Q', makeContext());

    expect(result).toBe(true);
    expect(ability.cast).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000 * 0.45);

    expect(ability.cast).toHaveBeenCalledTimes(1);
  });

  it('invokes the onEffectFired callback at the same deferred moment as the cast', () => {
    const ability = makeAbility({ cooldownMs: 1000 });
    const system = new AbilitySystem([ability], bar);
    const onEffectFired = vi.fn();

    system.tryCast('Q', makeContext(), onEffectFired);
    vi.advanceTimersByTime(1000 * 0.45 - 1);
    expect(onEffectFired).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onEffectFired).toHaveBeenCalledTimes(1);
    expect(ability.cast).toHaveBeenCalledTimes(1);
  });

  it('refuses to cast again while on cooldown', () => {
    const ability = makeAbility({ cooldownMs: 1000 });
    const system = new AbilitySystem([ability], bar);
    const context = makeContext();

    system.tryCast('Q', context);
    const secondResult = system.tryCast('Q', context);

    expect(secondResult).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(ability.cast).toHaveBeenCalledTimes(1);
  });

  it('allows casting again once the cooldown has elapsed', () => {
    const ability = makeAbility({ cooldownMs: 1000 });
    const system = new AbilitySystem([ability], bar);
    const context = makeContext();
    const nowSpy = vi.spyOn(performance, 'now');

    nowSpy.mockReturnValue(0);
    system.tryCast('Q', context);

    nowSpy.mockReturnValue(1001);
    const result = system.tryCast('Q', context);

    expect(result).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(ability.cast).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it('cancels queued cast damage and callbacks when the round ends', () => {
    const ability = makeAbility();
    const system = new AbilitySystem([ability], bar);
    const onEffect = vi.fn();
    system.tryCast('Q', makeContext(), onEffect);
    system.cancelPending();
    vi.advanceTimersByTime(1000);
    expect(ability.cast).not.toHaveBeenCalled();
    expect(onEffect).not.toHaveBeenCalled();
  });

  it('returns false for an unknown ability key', () => {
    const system = new AbilitySystem([makeAbility()], bar);

    expect(system.tryCast('Z', makeContext())).toBe(false);
  });
});
