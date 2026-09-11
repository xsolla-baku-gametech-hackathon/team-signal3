import * as THREE from 'three';
import { CharacterTemplate, instantiateCharacter } from './CharacterModelLoader';
import { HealthBar } from './HealthBar';
import { resolveTreeCollisions, TreeObstacle } from '../environment/treeCollision';

const BOSS_COLLISION_RADIUS = 0.7;
const BOSS_SCALE = 1.8;
const HEALTH_BAR_HEIGHT = 2.3 * BOSS_SCALE;
const BOSS_HP = 800;
const BOSS_SPEED = 1.8;
const MELEE_RANGE = 2.4;
const RANGED_RANGE = 12;
const MELEE_DAMAGE = 16;
const RANGED_DAMAGE = 12;
const ATTACK_INTERVAL_MS = 2200;
const ROTATION_LERP = 0.12;
const LUNGE_DURATION_MS = 260;

export type BossAttackCallbacks = {
  onMeleeHit: (damage: number) => void;
  onRangedAttack: (boss: Boss) => void;
};

export class Boss {
  readonly group: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly baseScale: THREE.Vector3;
  private readonly walkAction?: THREE.AnimationAction;
  private facingAngle = 0;
  private attackCooldownMs = 0;
  private lungeElapsedMs = -1;
  private hp = BOSS_HP;
  private readonly healthBar: HealthBar;

  constructor(scene: THREE.Scene, template: CharacterTemplate, spawnPosition: THREE.Vector3) {
    const instance = instantiateCharacter(template);
    this.group = instance.object;
    this.mixer = instance.mixer;
    this.walkAction = instance.action;
    this.group.position.copy(spawnPosition);
    this.group.scale.multiplyScalar(BOSS_SCALE);
    this.baseScale = this.group.scale.clone();
    this.healthBar = new HealthBar(scene, 0xffcf5a);
    scene.add(this.group);
  }

  getMaxHp(): number {
    return BOSS_HP;
  }

  getHp(): number {
    return this.hp;
  }

  getMouthPosition(): THREE.Vector3 {
    return this.group.position.clone().add(new THREE.Vector3(0, 2.4, 0));
  }

  update(
    playerPosition: THREE.Vector3,
    delta: number,
    callbacks: BossAttackCallbacks,
    treeObstacles: TreeObstacle[],
    cameraQuaternion: THREE.Quaternion
  ): void {
    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.group.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    const inRange = distance <= RANGED_RANGE;
    const isMoving = distance > MELEE_RANGE;

    if (isMoving) {
      toPlayer.normalize();
      const speed = inRange && distance <= RANGED_RANGE ? BOSS_SPEED * 0.5 : BOSS_SPEED;
      this.group.position.addScaledVector(toPlayer, speed * delta);
    }

    const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
    this.facingAngle = lerpAngle(this.facingAngle, targetAngle, ROTATION_LERP);
    this.group.rotation.y = this.facingAngle;

    this.attackCooldownMs -= delta * 1000;

    if (this.attackCooldownMs <= 0 && inRange) {
      this.attackCooldownMs = ATTACK_INTERVAL_MS;
      this.lungeElapsedMs = 0;

      if (distance <= MELEE_RANGE) {
        callbacks.onMeleeHit(MELEE_DAMAGE);
      } else {
        callbacks.onRangedAttack(this);
      }
    }

    resolveTreeCollisions(this.group.position, BOSS_COLLISION_RADIUS, treeObstacles);
    this.updateLunge(delta);
    this.mixer.update(delta);
    this.healthBar.update(this.group.position, HEALTH_BAR_HEIGHT, this.hp / BOSS_HP, cameraQuaternion);

    if (this.walkAction) {
      this.walkAction.paused = !isMoving;
    }
  }

  getFacingDirection(): THREE.Vector2 {
    return new THREE.Vector2(Math.sin(this.facingAngle), Math.cos(this.facingAngle));
  }

  getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  getRangedDamage(): number {
    return RANGED_DAMAGE;
  }

  applyDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }

  destroy(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.healthBar.destroy(scene);
  }

  private updateLunge(delta: number): void {
    if (this.lungeElapsedMs < 0) {
      return;
    }

    this.lungeElapsedMs += delta * 1000;
    const t = Math.min(this.lungeElapsedMs / LUNGE_DURATION_MS, 1);
    const pulse = 1 + Math.sin(t * Math.PI) * 0.22;
    this.group.scale.copy(this.baseScale).multiplyScalar(pulse);

    if (t >= 1) {
      this.lungeElapsedMs = -1;
      this.group.scale.copy(this.baseScale);
    }
  }
}

function lerpAngle(from: number, to: number, t: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}
