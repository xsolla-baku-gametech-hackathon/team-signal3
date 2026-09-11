import * as THREE from 'three';
import { runFadeables, spawnGroundMark, spawnSmokePuffs } from '../realism';

const COLOR = 0x9fe8ff;
const DURATION_MS = 600;
const OUTER_SPIKE_COUNT = 14;
const INNER_SPIKE_COUNT = 8;
const SHARD_COUNT = 18;

export function spawnFrostNova(scene: THREE.Scene, target: THREE.Vector3, radius: number): void {
  const group = new THREE.Group();
  group.position.set(target.x, target.y, target.z);

  const outerRingGeometry = new THREE.RingGeometry(radius * 0.15, radius, 40);
  const outerRingMaterial = new THREE.MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.02;
  group.add(outerRing);

  const groundFrostGeometry = new THREE.CircleGeometry(radius * 1.15, 32);
  const groundFrostMaterial = new THREE.MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const groundFrost = new THREE.Mesh(groundFrostGeometry, groundFrostMaterial);
  groundFrost.rotation.x = -Math.PI / 2;
  groundFrost.position.y = 0.01;
  group.add(groundFrost);

  const spikeMaterial = new THREE.MeshStandardMaterial({
    color: COLOR,
    emissive: COLOR,
    emissiveIntensity: 0.9,
    transparent: true,
    roughness: 0.2,
    metalness: 0.1
  });

  const spikes: { mesh: THREE.Mesh; targetHeight: number; delay: number }[] = [];

  for (let i = 0; i < OUTER_SPIKE_COUNT; i += 1) {
    const angle = (i / OUTER_SPIKE_COUNT) * Math.PI * 2 + Math.random() * 0.3;
    const spikeRadius = radius * (0.55 + Math.random() * 0.45);
    const height = 1.5 + Math.random() * 1.3;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2 + Math.random() * 0.1, height, 6), spikeMaterial.clone());
    spike.position.set(Math.cos(angle) * spikeRadius, 0, Math.sin(angle) * spikeRadius);
    spike.rotation.y = Math.random() * Math.PI;
    spike.scale.setScalar(0.001);
    spikes.push({ mesh: spike, targetHeight: 1, delay: Math.random() * 120 });
    group.add(spike);
  }

  for (let i = 0; i < INNER_SPIKE_COUNT; i += 1) {
    const angle = (i / INNER_SPIKE_COUNT) * Math.PI * 2;
    const spikeRadius = radius * (0.15 + Math.random() * 0.3);
    const height = 0.8 + Math.random() * 0.7;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, height, 6), spikeMaterial.clone());
    spike.position.set(Math.cos(angle) * spikeRadius, 0, Math.sin(angle) * spikeRadius);
    spike.scale.setScalar(0.001);
    spikes.push({ mesh: spike, targetHeight: 1, delay: Math.random() * 80 });
    group.add(spike);
  }

  const shardGeometry = new THREE.TetrahedronGeometry(1);
  const shardMaterial = new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const shards: { mesh: THREE.Mesh; velocity: THREE.Vector3; spin: THREE.Vector2 }[] = [];

  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = radius * (1.3 + Math.random() * 1.4);
    const shard = new THREE.Mesh(shardGeometry, shardMaterial.clone());
    const size = 0.16 + Math.random() * 0.26;
    shard.scale.set(size, size * (1.2 + Math.random() * 0.6), size);
    shard.position.set(0, 0.3 + Math.random() * 0.4, 0);
    const velocity = new THREE.Vector3(Math.cos(angle) * speed, 2.5 + Math.random() * 2.5, Math.sin(angle) * speed);
    shards.push({ mesh: shard, velocity, spin: new THREE.Vector2(4 + Math.random() * 4, 3 + Math.random() * 4) });
    group.add(shard);
  }

  const light = new THREE.PointLight(COLOR, 6, radius * 3, 2);
  light.position.set(target.x, 0.6, target.z);
  scene.add(group, light);

  runFadeables(scene, [
    spawnGroundMark(scene, target, radius * 0.75, 0x9fc9dd, 1600),
    spawnSmokePuffs(scene, target, 5, 0xa9cfe0, 1400)
  ]);

  const startedAt = performance.now();

  const dispose = (): void => {
    scene.remove(group, light);
    outerRingGeometry.dispose();
    outerRingMaterial.dispose();
    groundFrostGeometry.dispose();
    groundFrostMaterial.dispose();
    shardGeometry.dispose();

    for (const { mesh } of spikes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }

    for (const { mesh } of shards) {
      (mesh.material as THREE.Material).dispose();
    }
  };

  const tick = (): void => {
    const elapsed = performance.now() - startedAt;
    const t = Math.min(elapsed / DURATION_MS, 1);
    const fade = 1 - t;

    outerRing.scale.setScalar(0.3 + t * 0.9);
    outerRingMaterial.opacity = 0.55 * fade;
    groundFrostMaterial.opacity = 0.22 * fade;
    light.intensity = 6 * fade;

    for (const spike of spikes) {
      const spikeT = Math.max(0, Math.min((elapsed - spike.delay) / 260, 1));
      const grow = Math.sin(spikeT * Math.PI * 0.5);
      spike.mesh.scale.set(grow, grow, grow);
      (spike.mesh.material as THREE.MeshStandardMaterial).opacity = fade;
    }

    const dt = 1 / 60;
    for (const shard of shards) {
      shard.velocity.y -= 9 * dt;
      shard.mesh.position.addScaledVector(shard.velocity, dt);
      shard.mesh.rotation.x += dt * shard.spin.x;
      shard.mesh.rotation.y += dt * shard.spin.y;
      (shard.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
    }

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      dispose();
    }
  };

  requestAnimationFrame(tick);
}
