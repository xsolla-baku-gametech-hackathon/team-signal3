import * as THREE from 'three';
import { CharacterTemplate, instantiateCharacter } from './CharacterModelLoader';
import { HealthBar } from './HealthBar';
import { resolveTreeCollisions, TreeObstacle } from '../environment/treeCollision';

const ZOMBIE_COLLISION_RADIUS = 0.4;
const HEALTH_BAR_HEIGHT = 2.3;
const ROTATION_LERP = 0.15;
const LUNGE_DURATION_MS = 200;
const ATTACK_CROSSFADE_SECONDS = 0.12;
const ATTACK_ANIMATION_SECONDS = 0.5;

export type ZombieVariant = 'MELEE' | 'SPITTER_GREEN' | 'SPITTER_RED';

type VariantConfig = {
  hp: number;
  speed: number;
  attackRange: number;
  attackDamage: number;
  attackIntervalMs: number;
  tint?: number;
  scale?: number;
  isRanged: boolean;
  healthBarColor: number; // fixed hue so each category's bar is identifiable at a glance
};

export const VARIANT_CONFIG: Record<ZombieVariant, VariantConfig> = {
  MELEE: { hp: 60, speed: 2.2, attackRange: 1.3, attackDamage: 5, attackIntervalMs: 1100, isRanged: false, healthBarColor: 0xdfe6ec },
  SPITTER_GREEN: {
    hp: 90,
    speed: 1.7,
    attackRange: 8,
    attackDamage: 7,
    attackIntervalMs: 1900,
    tint: 0x8fffb0,
    isRanged: true,
    healthBarColor: 0x4ade6a
  },
  SPITTER_RED: {
    hp: 140,
    speed: 1.4,
    attackRange: 9,
    attackDamage: 11,
    attackIntervalMs: 2400,
    tint: 0xffa08f,
    scale: 1.35,
    isRanged: true,
    healthBarColor: 0xff5a4a
  }
};

export type ZombieAttackCallbacks = {
  onMeleeHit: (damage: number) => void;
  onRangedAttack: (zombie: Zombie) => void;
};

export class Zombie {
  readonly group: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly baseScale: THREE.Vector3;
  private readonly walkAction?: THREE.AnimationAction;
  private readonly attackAction?: THREE.AnimationAction;
  private readonly config: VariantConfig;
  private facingAngle = 0;
  private attackCooldownMs = 0;
  private lungeElapsedMs = -1;
  private hp: number;
  private speedMultiplier = 1;
  private slowEndsAtMs = 0;
  private readonly healthBar: HealthBar;

  constructor(
    scene: THREE.Scene,
    template: CharacterTemplate,
    spawnPosition: THREE.Vector3,
    private readonly variant: ZombieVariant,
    attackClip?: THREE.AnimationClip
  ) {
    this.config = VARIANT_CONFIG[variant];
    this.hp = this.config.hp;

    const instance = instantiateCharacter(template);
    this.group = instance.object;
    this.mixer = instance.mixer;
    this.walkAction = instance.action;
    this.group.position.copy(spawnPosition);

    if (this.config.scale) {
      this.group.scale.multiplyScalar(this.config.scale);
    }
    this.baseScale = this.group.scale.clone();

    if (this.config.tint) {
      this.applyTint(this.config.tint);
    }

    this.healthBar = new HealthBar(scene, this.config.healthBarColor);

    if (attackClip) {
      this.attackAction = this.mixer.clipAction(attackClip);
      this.attackAction.loop = THREE.LoopOnce;
      this.attackAction.clampWhenFinished = true;
      this.attackAction.timeScale = attackClip.duration / ATTACK_ANIMATION_SECONDS;

      this.mixer.addEventListener('finished', (event) => {
        if (event.action !== this.attackAction) {
          return;
        }

        event.action.fadeOut(ATTACK_CROSSFADE_SECONDS);
        this.walkAction?.reset().fadeIn(ATTACK_CROSSFADE_SECONDS).play();
        this.walkAction!.paused = false;
      });
    }

    scene.add(this.group);
  }

  getVariant(): ZombieVariant {
    return this.variant;
  }

  getFacingDirection(): THREE.Vector2 {
    return new THREE.Vector2(Math.sin(this.facingAngle), Math.cos(this.facingAngle));
  }

  getMouthPosition(): THREE.Vector3 {
    return this.group.position.clone().add(new THREE.Vector3(0, 1.5 * (this.config.scale ?? 1), 0));
  }

  update(
    playerPosition: THREE.Vector3,
    delta: number,
    callbacks: ZombieAttackCallbacks,
    treeObstacles: TreeObstacle[],
    cameraQuaternion: THREE.Quaternion
  ): void {
    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.group.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    if (performance.now() > this.slowEndsAtMs) {
      this.speedMultiplier = 1;
    }

    const isMoving = distance > this.config.attackRange;

    if (isMoving) {
      toPlayer.normalize();
      this.group.position.addScaledVector(toPlayer, this.config.speed * this.speedMultiplier * delta);

      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.facingAngle = lerpAngle(this.facingAngle, targetAngle, ROTATION_LERP);
    } else {
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.facingAngle = lerpAngle(this.facingAngle, targetAngle, ROTATION_LERP);

      this.attackCooldownMs -= delta * 1000;

      if (this.attackCooldownMs <= 0) {
        this.attackCooldownMs = this.config.attackIntervalMs;
        this.triggerAttack(callbacks);
      }
    }

    this.group.rotation.y = this.facingAngle;

    resolveTreeCollisions(this.group.position, ZOMBIE_COLLISION_RADIUS, treeObstacles);
    this.updateLunge(delta);
    this.mixer.update(delta);
    this.healthBar.update(this.group.position, HEALTH_BAR_HEIGHT * (this.config.scale ?? 1), this.hp / this.config.hp, cameraQuaternion);

    if (this.walkAction && !this.isAttackPlaying()) {
      this.walkAction.paused = !isMoving;
    }
  }

  getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  applyDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }

  applySlow(multiplier: number, durationMs: number): void {
    this.speedMultiplier = multiplier;
    this.slowEndsAtMs = performance.now() + durationMs;
  }

  destroy(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.healthBar.destroy(scene);
  }

  private triggerAttack(callbacks: ZombieAttackCallbacks): void {
    if (this.attackAction) {
      this.walkAction?.fadeOut(ATTACK_CROSSFADE_SECONDS);
      this.attackAction.reset();
      this.attackAction.fadeIn(ATTACK_CROSSFADE_SECONDS);
      this.attackAction.play();
    } else {
      this.lungeElapsedMs = 0;
    }

    if (this.config.isRanged) {
      callbacks.onRangedAttack(this);
    } else {
      callbacks.onMeleeHit(this.config.attackDamage);
    }
  }

  private isAttackPlaying(): boolean {
    return !!this.attackAction && this.attackAction.isRunning();
  }

  private applyTint(tint: number): void {
    const tintColor = new THREE.Color(tint);

    this.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const wasArray = Array.isArray(child.material);
      const materials = wasArray ? (child.material as THREE.Material[]) : [child.material as THREE.Material];
      const tinted = materials.map((material) => {
        const clone = material.clone();
        if ('color' in clone && clone.color instanceof THREE.Color) {
          clone.color.multiply(tintColor);
        }
        return clone;
      });
      child.material = wasArray ? tinted : tinted[0];
    });
  }

  private updateLunge(delta: number): void {
    if (this.lungeElapsedMs < 0) {
      return;
    }

    this.lungeElapsedMs += delta * 1000;
    const t = Math.min(this.lungeElapsedMs / LUNGE_DURATION_MS, 1);
    const pulse = 1 + Math.sin(t * Math.PI) * 0.18;
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
