import * as THREE from 'three';
import { CrowdSound } from './audio/CrowdAudio';
import { GameEvent } from './network/network.types';
import { HealthSystem } from './systems/HealthSystem';
import { EnemySystem } from './systems/EnemySystem';
import { spawnLightningBolt } from './vfx/LightningBoltEffect';

const STRIKE_SCATTER = 3;
const STRIKE_DAMAGE = 40;
const STRIKE_RADIUS = 2.5;

export function strikeLightningAt(scene: THREE.Scene, point: THREE.Vector3, enemySystem: EnemySystem | undefined, color?: number): void {
  spawnLightningBolt(scene, point, color);
  enemySystem?.damageInRadius(point, STRIKE_RADIUS, STRIKE_DAMAGE);
}

export const CROWD_STORM_DURATION_MS = 1240;

export type CrowdEventFeedback = {
  warning: (point: THREE.Vector3, color: number, radius: number, durationMs: number) => void;
  heal: (point: THREE.Vector3) => void;
  arrival: (point: THREE.Vector3, boss: boolean) => void;
  sound: (cue: CrowdSound) => void;
  shake: (strength: number, durationMs: number) => void;
};

export function handleGameEvent(
  event: GameEvent,
  scene: THREE.Scene,
  playerPosition: THREE.Vector3,
  enemySystem: EnemySystem | undefined,
  health: HealthSystem,
  isActive: () => boolean = () => true,
  feedback?: CrowdEventFeedback
): void {
  if (!isActive()) return;
  const origin = playerPosition.clone().setY(0.05);
  const later = (delay: number, action: () => void): void => {
    window.setTimeout(() => { if (isActive()) action(); }, delay);
  };
  const onSpawn = (point: THREE.Vector3, boss: boolean): void => {
    feedback?.arrival(point, boss);
    if (boss) feedback?.shake(0.18, 450);
  };

  if (event.type === 'HEAL' || event.type === 'EMERGENCY_HEAL') {
    health.heal(event.amount);
    feedback?.heal(origin);
    feedback?.sound('heal');
    return;
  }

  if (event.type === 'LIGHTNING') {
    feedback?.warning(origin, 0xffcf7a, STRIKE_RADIUS, 450);
    feedback?.sound('charge');
    later(450, () => {
      strikeLightningAt(scene, origin, enemySystem, 0xffe5a8);
      feedback?.sound('lightning');
      feedback?.shake(0.1, 180);
    });
    return;
  }

  if (event.type === 'STORM') {
    feedback?.sound('storm');
    for (let i = 0; i < 3; i += 1) {
      const target = origin.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * STRIKE_SCATTER * 2, 0, (Math.random() - 0.5) * STRIKE_SCATTER * 2));
      const delay = 600 + i * 320;
      feedback?.warning(target, 0xc18bff, STRIKE_RADIUS, delay);
      later(delay, () => {
        strikeLightningAt(scene, target, enemySystem, 0xc18bff);
        feedback?.sound('lightning');
        feedback?.shake(0.12, 200);
      });
    }
    return;
  }

  if (event.type === 'SPAWN_ZOMBIE' || event.type === 'ZOMBIE_WAVE') {
    feedback?.warning(origin, 0x9ade63, 11, 500);
    feedback?.sound('spawn');
    later(500, () => enemySystem?.spawnZombies(origin, event.type === 'ZOMBIE_WAVE' ? event.count : 1, onSpawn));
    return;
  }

  if (event.type === 'BOSS' || event.type === 'BOSS_RUSH') {
    feedback?.warning(origin, 0xff553d, 8, 1000);
    feedback?.sound('boss');
    later(1000, () => {
      enemySystem?.spawnBoss(origin, onSpawn);
      if (event.type === 'BOSS_RUSH') enemySystem?.spawnZombies(origin, 5, onSpawn);
    });
  }
}
