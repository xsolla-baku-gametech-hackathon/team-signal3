import * as THREE from 'three';

const MOVE_SPEED = 6;
const ROTATION_LERP = 0.2;
const WALK_ANIMATION_REFERENCE_SPEED = 1.7;
const ATTACK_FACING_HOLD_MS = 350;
const CAST_CROSSFADE_SECONDS = 0.15;
const JUMP_VELOCITY = 5;
const GRAVITY = 14;

export type CastClipConfig = {
  clip: THREE.AnimationClip;
  durationSeconds: number;
};

export class PlayerCharacter {
  readonly group: THREE.Group;
  private facingAngle = 0;
  private mixer?: THREE.AnimationMixer;
  private walkAction?: THREE.AnimationAction;
  private attackFacingUntil = 0;
  private lastIsMoving = false;
  private verticalVelocity = 0;
  private isJumping = false;
  private jumpVelocityX = 0;
  private jumpVelocityZ = 0;
  private readonly castClips = new Map<string, CastClipConfig>();
  private readonly castActions = new Map<string, THREE.AnimationAction>();
  private activeCastAction?: THREE.AnimationAction;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.add(this.createPlaceholderVisual());
    this.group.position.set(0, 0, 0);
    scene.add(this.group);
  }

  update(movementVector: THREE.Vector2, aimPoint: THREE.Vector3 | undefined, delta: number): void {
    const isMoving = movementVector.lengthSq() > 0;
    const isAttackFacing = performance.now() < this.attackFacingUntil;

    const targetAngle =
      isAttackFacing && aimPoint
        ? Math.atan2(aimPoint.x - this.group.position.x, aimPoint.z - this.group.position.z)
        : isMoving
          ? Math.atan2(movementVector.x, movementVector.y)
          : aimPoint
            ? Math.atan2(aimPoint.x - this.group.position.x, aimPoint.z - this.group.position.z)
            : this.facingAngle;

    this.facingAngle = lerpAngle(this.facingAngle, targetAngle, ROTATION_LERP);
    this.group.rotation.y = this.facingAngle;

    if (this.isJumping) {
      this.group.position.x += this.jumpVelocityX * delta;
      this.group.position.z += this.jumpVelocityZ * delta;
      this.group.position.y += this.verticalVelocity * delta;
      this.verticalVelocity -= GRAVITY * delta;

      if (this.group.position.y <= 0) {
        this.group.position.y = 0;
        this.verticalVelocity = 0;
        this.isJumping = false;
      }
    } else if (isMoving) {
      this.group.position.x += movementVector.x * MOVE_SPEED * delta;
      this.group.position.z += movementVector.y * MOVE_SPEED * delta;
    }

    this.mixer?.update(delta);
    this.lastIsMoving = isMoving;

    if (this.walkAction && !this.activeCastAction) {
      this.walkAction.paused = !isMoving || this.isJumping;
    }
  }

  getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  jump(movementVector?: THREE.Vector2): void {
    if (this.isJumping) {
      return;
    }

    this.isJumping = true;
    this.verticalVelocity = JUMP_VELOCITY;

    if (movementVector && movementVector.lengthSq() > 0) {
      this.jumpVelocityX = movementVector.x * MOVE_SPEED;
      this.jumpVelocityZ = movementVector.y * MOVE_SPEED;
    } else {
      this.jumpVelocityX = 0;
      this.jumpVelocityZ = 0;
    }
  }

  setCastClips(clips: Record<string, CastClipConfig>): void {
    for (const [key, config] of Object.entries(clips)) {
      this.castClips.set(key, config);
    }
  }

  triggerAttackFacing(abilityKey?: string): void {
    const config = abilityKey ? this.castClips.get(abilityKey) : undefined;

    if (config && this.mixer) {
      let action = this.castActions.get(abilityKey!);

      if (!action) {
        action = this.mixer.clipAction(config.clip);
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
        this.castActions.set(abilityKey!, action);
      }

      action.timeScale = config.clip.duration / config.durationSeconds;

      if (this.activeCastAction && this.activeCastAction !== action) {
        this.activeCastAction.fadeOut(CAST_CROSSFADE_SECONDS);
      }

      this.walkAction?.fadeOut(CAST_CROSSFADE_SECONDS);
      action.reset();
      action.fadeIn(CAST_CROSSFADE_SECONDS);
      action.play();
      this.activeCastAction = action;
      this.attackFacingUntil = performance.now() + config.durationSeconds * 1000;
    } else {
      this.attackFacingUntil = performance.now() + ATTACK_FACING_HOLD_MS;
    }
  }

  replaceVisual(object: THREE.Object3D, mixer?: THREE.AnimationMixer, walkAction?: THREE.AnimationAction): void {
    this.group.clear();
    this.group.add(object);
    this.mixer = mixer;
    this.walkAction = walkAction;

    if (this.walkAction) {
      this.walkAction.timeScale = MOVE_SPEED / WALK_ANIMATION_REFERENCE_SPEED;
    }

    this.mixer?.addEventListener('finished', (event) => {
      if (event.action !== this.activeCastAction) {
        return;
      }

      event.action.fadeOut(CAST_CROSSFADE_SECONDS);
      this.activeCastAction = undefined;

      if (this.walkAction) {
        this.walkAction.reset();
        this.walkAction.paused = !this.lastIsMoving;
        this.walkAction.fadeIn(CAST_CROSSFADE_SECONDS);
        this.walkAction.play();
      }
    });
  }

  private createPlaceholderVisual(): THREE.Group {
    const visual = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2a6b8c, roughness: 0.6, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.1, 4, 12), bodyMaterial);
    body.position.y = 0.95;
    body.castShadow = true;

    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xdfeaf0, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), headMaterial);
    head.position.y = 1.75;
    head.castShadow = true;

    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x72ffe7, emissive: 0x1a4a44 });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 8), noseMaterial);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.75, 0.32);

    visual.add(body, head, nose);
    return visual;
  }
}

function lerpAngle(from: number, to: number, t: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}
