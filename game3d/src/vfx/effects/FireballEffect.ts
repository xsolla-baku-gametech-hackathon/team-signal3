import * as THREE from 'three';
import { runFadeables, spawnGroundMark, spawnSmokePuffs } from '../realism';

const COLOR = 0xff6a2a;
const CORE_COLOR = 0xffe0a0;
const TRAVEL_MS = 220;
const EXPLOSION_MS = 480;
const EMBER_COUNT = 24;
const TRAIL_LENGTH = 8;

export function spawnFireball(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3, onImpact: () => void): void {
  const origin = from.clone().setY(from.y + 1.2);
  const target = to.clone().setY(0.4);

  const orbGeometry = new THREE.SphereGeometry(0.24, 16, 16);
  const orbMaterial = new THREE.MeshBasicMaterial({ color: CORE_COLOR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  orb.position.copy(origin);
  scene.add(orb);

  const light = new THREE.PointLight(COLOR, 5, 9, 2);
  light.position.copy(origin);
  scene.add(light);

  const trailGeometry = new THREE.SphereGeometry(0.09, 8, 8);
  const trail: { mesh: THREE.Mesh; bornAt: number }[] = [];

  const startedAt = performance.now();

  const disposeOrb = (): void => {
    scene.remove(orb, light);
    orbGeometry.dispose();
    orbMaterial.dispose();

    for (const { mesh } of trail) {
      scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    }

    trailGeometry.dispose();
  };

  let lastTrailAt = 0;

  const travel = (): void => {
    const now = performance.now();
    const t = Math.min((now - startedAt) / TRAVEL_MS, 1);
    orb.position.lerpVectors(origin, target, t);
    orb.position.y += Math.sin(t * Math.PI) * 0.6;
    light.position.copy(orb.position);

    if (now - lastTrailAt > 18 && trail.length < TRAIL_LENGTH) {
      lastTrailAt = now;
      const emberMaterial = new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
      const ember = new THREE.Mesh(trailGeometry, emberMaterial);
      ember.position.copy(orb.position);
      scene.add(ember);
      trail.push({ mesh: ember, bornAt: now });
    }

    for (const { mesh, bornAt } of trail) {
      const age = (now - bornAt) / 260;
      const scale = Math.max(0, 1 - age);
      mesh.scale.setScalar(scale);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * scale;
    }

    if (t < 1) {
      requestAnimationFrame(travel);
    } else {
      disposeOrb();
      onImpact();
      explode(scene, target);
    }
  };

  requestAnimationFrame(travel);
}

function explode(scene: THREE.Scene, target: THREE.Vector3): void {
  const shockGeometry = new THREE.RingGeometry(0.2, 1, 32);
  const shockMaterial = new THREE.MeshBasicMaterial({
    color: CORE_COLOR,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const shockRing = new THREE.Mesh(shockGeometry, shockMaterial);
  shockRing.rotation.x = -Math.PI / 2;
  shockRing.position.set(target.x, target.y + 0.03, target.z);

  const fireGeometry = new THREE.RingGeometry(0.1, 0.8, 28);
  const fireMaterial = new THREE.MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const fireRing = new THREE.Mesh(fireGeometry, fireMaterial);
  fireRing.rotation.x = -Math.PI / 2;
  fireRing.position.set(target.x, target.y + 0.04, target.z);

  const coreGeometry = new THREE.SphereGeometry(0.35, 16, 16);
  const coreMaterial = new THREE.MeshBasicMaterial({ color: CORE_COLOR, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.set(target.x, target.y + 0.4, target.z);

  const flashLight = new THREE.PointLight(COLOR, 12, 12, 2);
  flashLight.position.set(target.x, 1.2, target.z);

  scene.add(shockRing, fireRing, core, flashLight);

  runFadeables(scene, [
    spawnGroundMark(scene, target, 1.1, 0x3d1f0a, 2800),
    spawnSmokePuffs(scene, target, 7, 0x1c1c1c, 2400)
  ]);

  const emberGeometry = new THREE.TetrahedronGeometry(0.07);
  const embers: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] = [];

  for (let i = 0; i < EMBER_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const upward = 1.5 + Math.random() * 3;
    const speed = 1.5 + Math.random() * 3.5;
    const emberMaterial = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? COLOR : CORE_COLOR,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ember = new THREE.Mesh(emberGeometry, emberMaterial);
    ember.position.set(target.x, target.y + 0.3, target.z);
    const velocity = new THREE.Vector3(Math.cos(angle) * speed, upward, Math.sin(angle) * speed);
    embers.push({ mesh: ember, velocity });
    scene.add(ember);
  }

  const startedAt = performance.now();

  const dispose = (): void => {
    scene.remove(shockRing, fireRing, core, flashLight);
    shockGeometry.dispose();
    shockMaterial.dispose();
    fireGeometry.dispose();
    fireMaterial.dispose();
    coreGeometry.dispose();
    coreMaterial.dispose();

    for (const { mesh } of embers) {
      scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    }

    emberGeometry.dispose();
  };

  const tick = (): void => {
    const t = Math.min((performance.now() - startedAt) / EXPLOSION_MS, 1);
    const fade = 1 - t;

    shockRing.scale.setScalar(1 + t * 4.2);
    shockMaterial.opacity = 0.85 * fade;

    fireRing.scale.setScalar(1 + t * 2.4);
    fireMaterial.opacity = 0.75 * fade;

    const coreT = Math.min(t * 3, 1);
    core.scale.setScalar((1 + coreT * 1.8) * (1 - Math.max(0, t - 0.4) * 1.6));
    coreMaterial.opacity = fade;

    flashLight.intensity = 12 * fade;

    const dt = 1 / 60;
    for (const ember of embers) {
      ember.velocity.y -= 9 * dt;
      ember.mesh.position.addScaledVector(ember.velocity, dt);
      ember.mesh.rotation.x += dt * 8;
      (ember.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
    }

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      dispose();
    }
  };

  requestAnimationFrame(tick);
}
