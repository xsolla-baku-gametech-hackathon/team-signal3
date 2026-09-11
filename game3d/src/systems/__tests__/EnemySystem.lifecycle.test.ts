import { expect, it, vi } from 'vitest';
import { Scene, Vector2, Vector3, Quaternion } from 'three';
import { EnemyAssets, EnemySystem } from '../EnemySystem';

it('ignores spawns, delayed damage and updates after the round stops', () => {
  const system = new EnemySystem(new Scene(), {} as EnemyAssets, []);
  system.stop();
  const point = new Vector3();
  const hit = vi.fn();
  system.spawnZombies(point, 4);
  system.spawnBoss(point);
  system.update(point, 0.1, hit, new Quaternion());
  expect(system.damageInRadius(point, 10, 100)).toBe(0);
  expect(system.damageInCone(point, new Vector2(0, 1), 10, 2, 100)).toBe(0);
  expect(system.getCount()).toBe(0);
  expect(system.getKillCount()).toBe(0);
  expect(hit).not.toHaveBeenCalled();
});
