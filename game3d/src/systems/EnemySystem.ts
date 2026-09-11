import * as THREE from 'three';
import { CharacterTemplate } from '../entities/CharacterModelLoader';
import { Zombie, ZombieVariant } from '../entities/Zombie';
import { Boss } from '../entities/Boss';
import { ProjectileConfig, ZombieProjectile } from '../entities/ZombieProjectile';
import { TreeObstacle } from '../environment/treeCollision';

const MAX_ZOMBIES = 16;
const MIN_SPAWN_RADIUS = 9;
const MAX_SPAWN_RADIUS = 15;
const PLAYER_HIT_RADIUS = 0.4;

export type SpawnFeedback = (point: THREE.Vector3, boss: boolean) => void;

export type SlowEffect = { multiplier: number; durationMs: number };

export type EnemyAssets = {
  melee: CharacterTemplate;
  meleeAttackClip?: THREE.AnimationClip;
  spitterGreen: CharacterTemplate;
  spitterGreenCastClip?: THREE.AnimationClip;
  spitterRed: CharacterTemplate;
  spitterRedCastClip?: THREE.AnimationClip;
  boss: CharacterTemplate;
};

const VARIANT_WEIGHTS: { variant: ZombieVariant; weight: number }[] = [
  { variant: 'MELEE', weight: 6 },
  { variant: 'SPITTER_GREEN', weight: 3 },
  { variant: 'SPITTER_RED', weight: 2 }
];
const TOTAL_WEIGHT = VARIANT_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);

const SPITTER_GREEN_PROJECTILE: ProjectileConfig = { color: 0x33ff55, radius: 0.22, speed: 9, damage: 10, maxLifetimeMs: 3000 };
const SPITTER_RED_PROJECTILE: ProjectileConfig = { color: 0xff3333, radius: 0.48, speed: 6.5, damage: 16, maxLifetimeMs: 3500 };
const BOSS_PROJECTILE_BASE: Omit<ProjectileConfig, 'damage'> = { color: 0xff2200, radius: 0.7, speed: 7, maxLifetimeMs: 4000 };

export class EnemySystem {
  private readonly zombies: Zombie[] = [];
  private readonly projectiles: ZombieProjectile[] = [];
  private boss?: Boss;
  private active = true;
  private kills = 0;

  stop(): void { this.active = false; }

  getKillCount(): number { return this.kills; }

  constructor(
    private readonly scene: THREE.Scene,
    private readonly assets: EnemyAssets,
    private readonly treeObstacles: TreeObstacle[]
  ) {}

  spawnZombies(nearPosition: THREE.Vector3, count: number, onSpawn?: SpawnFeedback): void {
    if (!this.active) return;
    for (let i = 0; i < count; i += 1) {
      if (this.zombies.length >= MAX_ZOMBIES) {
        return;
      }

      const variant = pickVariant();
      const spawnPosition = randomRingPosition(nearPosition);
      const zombie = new Zombie(this.scene, this.templateFor(variant), spawnPosition, variant, this.attackClipFor(variant));
      this.zombies.push(zombie);
      onSpawn?.(spawnPosition, false);
    }
  }

  spawnBoss(nearPosition: THREE.Vector3, onSpawn?: SpawnFeedback): void {
    if (!this.active) return;
    if (this.boss) {
      this.spawnZombies(nearPosition, 2, onSpawn);
      return;
    }

    const position = randomRingPosition(nearPosition, 6, 9);
    this.boss = new Boss(this.scene, this.assets.boss, position);
    onSpawn?.(position, true);
  }

  isBossActive(): boolean {
    return !!this.boss;
  }

  update(playerPosition: THREE.Vector3, delta: number, onPlayerDamage: (damage: number) => void, cameraQuaternion: THREE.Quaternion): void {
    if (!this.active) return;
    for (const zombie of this.zombies) {
      zombie.update(
        playerPosition,
        delta,
        {
          onMeleeHit: onPlayerDamage,
          onRangedAttack: (attacker) => this.spawnZombieProjectile(attacker, playerPosition)
        },
        this.treeObstacles,
        cameraQuaternion
      );
    }

    if (this.boss) {
      this.boss.update(
        playerPosition,
        delta,
        {
          onMeleeHit: onPlayerDamage,
          onRangedAttack: (attacker) => this.spawnBossProjectile(attacker, playerPosition)
        },
        this.treeObstacles,
        cameraQuaternion
      );
    }

    this.updateProjectiles(playerPosition, delta, onPlayerDamage);
  }

  getCount(): number {
    return this.zombies.length + (this.boss ? 1 : 0);
  }

  damageInRadius(point: THREE.Vector3, radius: number, damage: number, slow?: SlowEffect): number {
    if (!this.active) return 0;
    const killed = this.applyToMatching((zombie) => zombie.getPosition().distanceTo(point) <= radius, damage, slow);

    if (this.boss && this.boss.getPosition().distanceTo(point) <= radius) {
      this.damageBoss(damage);
    }

    return killed;
  }

  damageInCone(origin: THREE.Vector3, direction: THREE.Vector2, length: number, halfWidth: number, damage: number): number {
    if (!this.active) return 0;
    const dir = direction.clone().normalize();
    const inCone = (position: THREE.Vector3): boolean => {
      const toTarget = position.clone().sub(origin);
      const forward = dir.x * toTarget.x + dir.y * toTarget.z;

      if (forward < 0 || forward > length) {
        return false;
      }

      const lateral = Math.abs(-dir.y * toTarget.x + dir.x * toTarget.z);
      return lateral <= halfWidth;
    };

    const killed = this.applyToMatching((zombie) => inCone(zombie.getPosition()), damage);

    if (this.boss && inCone(this.boss.getPosition())) {
      this.damageBoss(damage);
    }

    return killed;
  }

  private damageBoss(damage: number): void {
    if (this.boss?.applyDamage(damage)) {
      this.kills += 1;
      this.boss.destroy(this.scene);
      this.boss = undefined;
    }
  }

  private spawnZombieProjectile(zombie: Zombie, playerPosition: THREE.Vector3): void {
    const config = zombie.getVariant() === 'SPITTER_RED' ? SPITTER_RED_PROJECTILE : SPITTER_GREEN_PROJECTILE;
    const origin = zombie.getMouthPosition();
    const direction = new THREE.Vector2(playerPosition.x - origin.x, playerPosition.z - origin.z);
    this.projectiles.push(new ZombieProjectile(this.scene, origin, direction, config));
  }

  private spawnBossProjectile(boss: Boss, playerPosition: THREE.Vector3): void {
    const origin = boss.getMouthPosition();
    const direction = new THREE.Vector2(playerPosition.x - origin.x, playerPosition.z - origin.z);
    this.projectiles.push(new ZombieProjectile(this.scene, origin, direction, { ...BOSS_PROJECTILE_BASE, damage: boss.getRangedDamage() }));
  }

  private updateProjectiles(playerPosition: THREE.Vector3, delta: number, onPlayerDamage: (damage: number) => void): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      const stillAlive = projectile.update(delta);

      if (projectile.hasHit(playerPosition, PLAYER_HIT_RADIUS)) {
        onPlayerDamage(projectile.getDamage());
        projectile.destroy(this.scene);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (!stillAlive) {
        projectile.destroy(this.scene);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private templateFor(variant: ZombieVariant): CharacterTemplate {
    if (variant === 'SPITTER_GREEN') return this.assets.spitterGreen;
    if (variant === 'SPITTER_RED') return this.assets.spitterRed;
    return this.assets.melee;
  }

  private attackClipFor(variant: ZombieVariant): THREE.AnimationClip | undefined {
    if (variant === 'SPITTER_GREEN') return this.assets.spitterGreenCastClip;
    if (variant === 'SPITTER_RED') return this.assets.spitterRedCastClip;
    return this.assets.meleeAttackClip;
  }

  private applyToMatching(predicate: (zombie: Zombie) => boolean, damage: number, slow?: SlowEffect): number {
    let killed = 0;

    for (let i = this.zombies.length - 1; i >= 0; i -= 1) {
      const zombie = this.zombies[i];

      if (!predicate(zombie)) {
        continue;
      }

      if (slow) {
        zombie.applySlow(slow.multiplier, slow.durationMs);
      }

      if (zombie.applyDamage(damage)) {
        zombie.destroy(this.scene);
        this.zombies.splice(i, 1);
        killed += 1;
        this.kills += 1;
      }
    }

    return killed;
  }
}

function pickVariant(): ZombieVariant {
  let roll = Math.random() * TOTAL_WEIGHT;

  for (const entry of VARIANT_WEIGHTS) {
    if (roll < entry.weight) {
      return entry.variant;
    }
    roll -= entry.weight;
  }

  return 'MELEE';
}

function randomRingPosition(center: THREE.Vector3, minRadius = MIN_SPAWN_RADIUS, maxRadius = MAX_SPAWN_RADIUS): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const radius = minRadius + Math.random() * (maxRadius - minRadius);
  return new THREE.Vector3(center.x + Math.cos(angle) * radius, 0, center.z + Math.sin(angle) * radius);
}
