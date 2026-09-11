import { afterEach, describe, expect, it, vi } from 'vitest';
import { Scene, Vector3 } from 'three';
import { CrowdEventFeedback, handleGameEvent } from '../GameEventHandler';
import { EnemySystem } from '../systems/EnemySystem';
import { HealthSystem } from '../systems/HealthSystem';
import { spawnLightningBolt } from '../vfx/LightningBoltEffect';

vi.mock('../vfx/LightningBoltEffect', () => ({ spawnLightningBolt: vi.fn() }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('crowd events during a round', () => {
  it('applies both heal events to player HP, capped at full health', () => {
    const health = new HealthSystem();
    health.applyDamage(160);
    handleGameEvent({ type: 'HEAL', amount: 24 }, new Scene(), new Vector3(), undefined, health);
    expect(health.getStats().hp).toBe(64);
    handleGameEvent({ type: 'EMERGENCY_HEAL', amount: 40 }, new Scene(), new Vector3(), undefined, health);
    expect(health.getStats().hp).toBe(100);
  });

  it('warns before lightning and strikes the advertised point even if the player moves', () => {
    vi.useFakeTimers();
    const feedback: CrowdEventFeedback = { warning: vi.fn(), sound: vi.fn(), heal: vi.fn(), arrival: vi.fn(), shake: vi.fn() };
    const position = new Vector3(2, 0, 3);
    handleGameEvent({ type: 'LIGHTNING' }, new Scene(), position, undefined, new HealthSystem(), () => true, feedback);
    expect(feedback.warning).toHaveBeenCalledOnce();
    expect(spawnLightningBolt).not.toHaveBeenCalled();
    position.set(20, 0, 30);
    vi.advanceTimersByTime(449);
    expect(spawnLightningBolt).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(vi.mocked(spawnLightningBolt).mock.calls[0][1]).toEqual(new Vector3(2, 0.05, 3));
    expect(feedback.sound).toHaveBeenLastCalledWith('lightning');
  });

  it('shows arrival effects at actual enemy positions and cancels boss spawns at round end', () => {
    vi.useFakeTimers();
    const feedback: CrowdEventFeedback = { warning: vi.fn(), sound: vi.fn(), heal: vi.fn(), arrival: vi.fn(), shake: vi.fn() };
    const actual = new Vector3(12, 0, 4);
    const enemies = { spawnZombies: vi.fn((_origin, _count, onSpawn) => onSpawn(actual, false)), spawnBoss: vi.fn() };
    let active = true;
    const fire = (type: 'SPAWN_ZOMBIE' | 'BOSS') => handleGameEvent({ type }, new Scene(), new Vector3(), enemies as unknown as EnemySystem, new HealthSystem(), () => active, feedback);
    fire('SPAWN_ZOMBIE');
    expect(enemies.spawnZombies).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(feedback.arrival).toHaveBeenCalledWith(actual, false);
    fire('BOSS');
    active = false;
    vi.advanceTimersByTime(1000);
    expect(enemies.spawnBoss).not.toHaveBeenCalled();
  });

  it('delivers three storm strikes after their individual warnings', () => {
    vi.useFakeTimers();
    const feedback: CrowdEventFeedback = { warning: vi.fn(), sound: vi.fn(), heal: vi.fn(), arrival: vi.fn(), shake: vi.fn() };
    handleGameEvent({ type: 'STORM' }, new Scene(), new Vector3(), undefined, new HealthSystem(), () => true, feedback);
    expect(feedback.warning).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(599);
    expect(spawnLightningBolt).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spawnLightningBolt).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(640);
    expect(spawnLightningBolt).toHaveBeenCalledTimes(3);
  });

  it('ignores healing and deferred storm strikes after the round ends', () => {
    vi.useFakeTimers();
    let active = true;
    const health = new HealthSystem();
    health.applyDamage(160);
    handleGameEvent({ type: 'STORM' }, new Scene(), new Vector3(), undefined, health, () => active);
    active = false;
    handleGameEvent({ type: 'HEAL', amount: 24 }, new Scene(), new Vector3(), undefined, health, () => active);
    vi.runAllTimers();
    expect(health.getStats().hp).toBe(40);
    expect(spawnLightningBolt).not.toHaveBeenCalled();
  });
});
