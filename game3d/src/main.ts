import { AnimationClip, Vector2, Vector3 } from 'three';
import { ABILITY_DEFINITIONS } from './abilities/abilityDefinitions';
import { AbilitySystem } from './abilities/AbilitySystem';
import { createSceneSetup } from './core/SceneSetup';
import { CameraShake } from './core/CameraShake';
import { ChaseCamera } from './core/ChaseCamera';
import { createPostProcessing } from './core/PostProcessing';
import { createForest } from './environment/Forest';
import { resolveTreeCollisions } from './environment/treeCollision';
import { instantiateCharacter, loadAnimationClip, loadCharacterTemplate } from './entities/CharacterModelLoader';
import { PlayerCharacter } from './entities/PlayerCharacter';
import { CROWD_STORM_DURATION_MS, handleGameEvent } from './GameEventHandler';
import { CrowdAudio, CrowdSound } from './audio/CrowdAudio';
import { CrowdEventEffects } from './vfx/CrowdEventEffects';
import { AimController } from './input/AimController';
import { InputController } from './input/InputController';
import { getControllerJoinUrl, getRoomId, getSocketUrl } from './network/joinUrl';
import { CrowdDirectorClient } from './sdk/CrowdDirectorClient';
import { EnemyAssets, EnemySystem } from './systems/EnemySystem';
import { HealthSystem } from './systems/HealthSystem';
import { RoundSystem } from './systems/RoundSystem';
import { RoundHUD } from './ui/RoundHUD';
import { AbilityBar } from './ui/AbilityBar';
import { CrowdVoteHUD } from './ui/CrowdVoteHUD';
import { DirectorDecisionBanner } from './ui/DirectorDecisionBanner';
import { HealthHUD } from './ui/HealthHUD';
import { JoinOverlay } from './ui/JoinOverlay';
import { PauseOverlay } from './ui/PauseOverlay';

const container = document.getElementById('app-root');

if (!container) {
  throw new Error('#app-root not found');
}

const { scene, camera, renderer, ground } = createSceneSetup(container);
const postProcessing = createPostProcessing(renderer, scene, camera, container.clientWidth, container.clientHeight);
window.addEventListener('resize', () => postProcessing.resize(container.clientWidth, container.clientHeight));
const treeObstacles = createForest(scene);
const PLAYER_COLLISION_RADIUS = 0.4;
const player = new PlayerCharacter(scene);
const chaseCamera = new ChaseCamera(camera);
const cameraShake = new CameraShake(camera);
const crowdAudio = new CrowdAudio();
void crowdAudio.preload();
const crowdEffects = new CrowdEventEffects(scene);
const crowdFeedback = {
  warning: (point: Vector3, color: number, radius: number, duration: number) => crowdEffects.warning(point, color, radius, duration),
  heal: (point: Vector3) => crowdEffects.heal(point),
  arrival: (point: Vector3, boss: boolean) => crowdEffects.arrival(point, boss),
  sound: (cue: CrowdSound) => crowdAudio.play(cue),
  shake: (strength: number, duration: number) => cameraShake.trigger(strength, duration)
};

const SOUND_BY_KEY: Record<string, CrowdSound> = { Q: 'lightning', E: 'frost', R: 'fire', F: 'beam', V: 'snare', X: 'nova' };

const SHAKE_BY_KEY: Record<string, { strength: number; durationMs: number }> = {
  Q: { strength: 0.05, durationMs: 120 },
  E: { strength: 0.06, durationMs: 180 },
  R: { strength: 0.08, durationMs: 200 },
  F: { strength: 0.05, durationMs: 140 },
  V: { strength: 0.05, durationMs: 160 },
  X: { strength: 0.22, durationMs: 380 }
};
const input = new InputController();
const aim = new AimController(renderer.domElement, camera, ground, scene);
const health = new HealthSystem();
const healthHud = new HealthHUD();
const round = new RoundSystem();
let crowdEvents = 0;
let stormEndsAt = 0;
let nextWaveAt = 30_000;
const roundHud = new RoundHUD(() => {
  if (!enemySystem || !round.start(performance.now())) return;
  crowdAudio.unlock(true);
  enemySystem.spawnZombies(player.getPosition(), 2);
  reportState();
}, () => window.location.reload());
const crowdVoteHud = new CrowdVoteHUD();
const decisionBanner = new DirectorDecisionBanner();
let isPaused = false;
const pauseOverlay = new PauseOverlay(() => togglePause());
function togglePause(): void {
  if (!isPaused && !round.isRunning()) return;
  isPaused = !isPaused;
  pauseOverlay.setPaused(isPaused);
}
input.onKeyPressed('KeyP', () => togglePause());
const roomId = getRoomId();
const joinOverlay = new JoinOverlay(roomId, getControllerJoinUrl(roomId));

const abilityBar = new AbilityBar(ABILITY_DEFINITIONS.map(({ key, label, icon }) => ({ key, label, icon })));
const abilitySystem = new AbilitySystem(ABILITY_DEFINITIONS, abilityBar);

loadCharacterTemplate('/assets/player-walk.fbx')
  .then((template) => {
    const instance = instantiateCharacter(template);
    player.replaceVisual(instance.object, instance.mixer, instance.action);
  })
  .catch((error: unknown) => {
    console.error('[game3d] Failed to load player model, keeping placeholder capsule.', error);
  });

let enemySystem: EnemySystem | undefined;

Promise.allSettled([
  loadCharacterTemplate('/assets/zombie-walk.fbx'),
  loadCharacterTemplate('/assets/enemies/spitter-green-walk.fbx'),
  loadCharacterTemplate('/assets/enemies/spitter-red-walk.fbx'),
  loadCharacterTemplate('/assets/enemies/boss-walk.fbx'),
  loadAnimationClip('/assets/enemies/melee-attack.fbx'),
  loadAnimationClip('/assets/enemies/spitter-green-cast.fbx'),
  loadAnimationClip('/assets/enemies/spitter-red-cast.fbx')
]).then(([melee, spitterGreen, spitterRed, boss, meleeAttackClip, spitterGreenCastClip, spitterRedCastClip]) => {
  if (melee.status === 'rejected' || spitterGreen.status === 'rejected' || spitterRed.status === 'rejected' || boss.status === 'rejected') {
    roundHud.showLoadError();
    console.error('[game3d] Failed to load one or more enemy character models.', {
      melee,
      spitterGreen,
      spitterRed,
      boss
    });
    return;
  }

  const assets: EnemyAssets = {
    melee: melee.value,
    spitterGreen: spitterGreen.value,
    spitterRed: spitterRed.value,
    boss: boss.value,
    meleeAttackClip: meleeAttackClip.status === 'fulfilled' ? meleeAttackClip.value : undefined,
    spitterGreenCastClip: spitterGreenCastClip.status === 'fulfilled' ? spitterGreenCastClip.value : undefined,
    spitterRedCastClip: spitterRedCastClip.status === 'fulfilled' ? spitterRedCastClip.value : undefined
  };

  enemySystem = new EnemySystem(scene, assets, treeObstacles);
  roundHud.setReady();
});

input.onKeyPressed('KeyZ', () => {
  if (round.isRunning() && !isPaused) {
    enemySystem?.spawnZombies(player.getPosition(), 1);
    crowdAudio.play('spawn');
  }
});
input.onKeyPressed('Space', () => {
  if (round.isRunning() && !health.isDead() && !isPaused) {
    player.jump(input.getMovementVector());
  }
});

const CAST_CLIP_URLS: Record<string, string> = {
  Q: '/assets/casts/lightning.fbx',
  E: '/assets/casts/frostnova.fbx',
  R: '/assets/casts/fireball.fbx',
  F: '/assets/casts/beam.fbx',
  V: '/assets/casts/snare.fbx',
  X: '/assets/casts/glacialcrown.fbx'
};

const CAST_ANIMATION_DURATION_SECONDS: Record<string, number> = Object.fromEntries(
  ABILITY_DEFINITIONS.map((ability) => [ability.key, ability.cooldownMs / 1000])
);

Promise.allSettled(
  Object.entries(CAST_CLIP_URLS).map(async ([key, url]) => [key, await loadAnimationClip(url)] as const)
).then((results) => {
  const loaded: Record<string, { clip: AnimationClip; durationSeconds: number }> = {};

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const [key, clip] = result.value;
      loaded[key] = { clip, durationSeconds: CAST_ANIMATION_DURATION_SECONDS[key] ?? 0.5 };
    } else {
      console.error('[game3d] Failed to load a cast animation.', result.reason);
    }
  }

  player.setCastClips(loaded);
});

function castAbility(key: string): void {
  if (!round.isRunning() || health.isDead() || isPaused) {
    return;
  }

  const playerPosition = player.getPosition();
  const aimPoint = aim.getAimPoint();
  const aimDirection =
    aimPoint && aimPoint.distanceTo(playerPosition) > 0.01
      ? new Vector2(aimPoint.x - playerPosition.x, aimPoint.z - playerPosition.z).normalize()
      : new Vector2(0, 1);

  const didCast = abilitySystem.tryCast(
    key,
    { scene, playerPosition, aimPoint, aimDirection, enemySystem },
    () => {
      crowdAudio.play(SOUND_BY_KEY[key] ?? 'lightning');
      const shake = SHAKE_BY_KEY[key];
      if (shake) {
        cameraShake.trigger(shake.strength, shake.durationMs);
      }
    }
  );

  if (didCast) {
    player.triggerAttackFacing(key);
  }
}

for (const ability of ABILITY_DEFINITIONS) {
  input.onKeyPressed(`Key${ability.key}`, () => castAbility(ability.key));
}

renderer.domElement.addEventListener('pointerdown', () => castAbility('Q'));

const client = new CrowdDirectorClient({ serverUrl: getSocketUrl(), roomId });
client.onConnected(() => {
  console.info('[game3d] Connected to Crowd Director.');
  reportState();
});
client.onGameEvent((event) => {
  if (!round.isRunning() || health.isDead()) return;
  crowdEvents += 1;
  if (event.type === 'STORM') stormEndsAt = performance.now() + CROWD_STORM_DURATION_MS;
  handleGameEvent(event, scene, player.getPosition(), enemySystem, health, () => round.isRunning() && !health.isDead(), crowdFeedback);
});
client.onDirectorDecision((decision) => {
  if (!round.isRunning()) return;
  crowdVoteHud.update(decision.crowdSnapshot);
  decisionBanner.show(decision.final.event, decision.final.source, decision.final.reason, decision.topVoter);
});
client.connect();

const stateIntervalMs = 1200;
let lastStateSentAt = 0;
let finalReported = false;

function reportState(): void {
  const stats = health.getStats();
  const snapshot = round.getSnapshot();
  client.reportGameState({
    hp: stats.hp, shield: stats.shield,
    score: (enemySystem?.getKillCount() ?? 0) * 100,
    wave: snapshot.wave,
    enemyCount: enemySystem?.getCount() ?? 0,
    bossActive: enemySystem?.isBossActive() ?? false,
    stormActive: round.isRunning() && performance.now() < stormEndsAt,
    gameOver: snapshot.phase === 'WON' || snapshot.phase === 'LOST',
    roundPhase: snapshot.phase,
    roundRemainingMs: snapshot.remainingMs
  });
}

let lastTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!isPaused) {
    round.update(now, health.isDead());
    const playing = round.isRunning();
    const aimPoint = aim.getAimPoint();
    if (playing) player.update(input.getMovementVector(), aimPoint, delta);
    resolveTreeCollisions(player.group.position, PLAYER_COLLISION_RADIUS, treeObstacles);
    chaseCamera.update(player.getPosition());
    cameraShake.apply(delta);

    if (playing) {
      const snapshot = round.getSnapshot();
      if (snapshot.elapsedMs >= nextWaveAt) {
        enemySystem?.spawnZombies(player.getPosition(), snapshot.wave >= 5 ? 4 : 3);
        crowdAudio.play('spawn');
        nextWaveAt = (Math.floor(snapshot.elapsedMs / 30_000) + 1) * 30_000;
      }
      enemySystem?.update(player.getPosition(), delta, (damage) => health.applyDamage(damage), camera.quaternion);
    }

    const snapshot = round.update(now, health.isDead());
    const stats = health.getStats();
    healthHud.update(stats.hp, stats.shield);
    abilitySystem.updateHud();

    if ((snapshot.phase === 'WON' || snapshot.phase === 'LOST') && !finalReported) {
      finalReported = true;
      enemySystem?.stop();
      abilitySystem.cancelPending();
      crowdEffects.clear();
      crowdAudio.stop();
      reportState();
    }
    roundHud.update(snapshot, enemySystem?.getKillCount() ?? 0, crowdEvents);

    if (client.isConnected() && now - lastStateSentAt >= stateIntervalMs) {
      lastStateSentAt = now;
      reportState();
    }

    crowdEffects.update(now);
  }

  postProcessing.render();
}

animate();
