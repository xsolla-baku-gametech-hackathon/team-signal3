import * as THREE from 'three';
import { runFadeables, spawnGroundMark, spawnSmokePuffs } from '../realism';

const COLOR = 0xfff2c0;
const DURATION_MS = 750;
const SPIKE_COUNT = 12;
const PARTICLE_COUNT = 40;

export function spawnNova(scene: THREE.Scene, center: THREE.Vector3, maxRadius: number): void {
  const group = new THREE.Group();
  group.position.set(center.x, 0, center.z);

  const ringGeometry = new THREE.RingGeometry(0.1, 0.5, 48);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  const ring2Material = ringMaterial.clone();
  const ring2 = new THREE.Mesh(ringGeometry, ring2Material);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.05;
  group.add(ring2);

  const pillarGeometry = new THREE.CylinderGeometry(0.4, 0.6, 6, 16, 1, true);
  const pillarMaterial = new THREE.MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
  pillar.position.y = 3;
  group.add(pillar);

  const spikeMaterial = new THREE.MeshStandardMaterial({ color: COLOR, emissive: COLOR, emissiveIntensity: 0.8, transparent: true });
  const spikes: { mesh: THREE.Mesh; delay: number }[] = [];

  for (let i = 0; i < SPIKE_COUNT; i += 1) {
    const angle = (i / SPIKE_COUNT) * Math.PI * 2;
    const spikeRadius = maxRadius * 0.55;
    const height = 1.4 + Math.random() * 0.8;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, height, 6), spikeMaterial.clone());
    spike.position.set(Math.cos(angle) * spikeRadius, 0, Math.sin(angle) * spikeRadius);
    spike.rotation.x = Math.PI * 0.06 * Math.sin(angle);
    spike.rotation.z = -Math.PI * 0.06 * Math.cos(angle);
    spike.scale.setScalar(0.001);
    spikes.push({ mesh: spike, delay: i * 12 });
    group.add(spike);
  }

  const light = new THREE.PointLight(COLOR, 10, maxRadius * 2.5, 2);
  light.position.y = 1.5;
  group.add(light);

  const particleGeometry = new THREE.TetrahedronGeometry(0.08);
  const particles: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = maxRadius * (0.6 + Math.random() * 1.2);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    const velocity = new THREE.Vector3(Math.cos(angle) * speed, 3 + Math.random() * 4, Math.sin(angle) * speed);
    particles.push({ mesh: particle, velocity });
    group.add(particle);
  }

  scene.add(group);

  runFadeables(scene, [
    spawnGroundMark(scene, center, maxRadius * 0.85, 0x4a4020, 3400),
    spawnSmokePuffs(scene, center, 10, 0x4a4030, 2800)
  ]);

  const startedAt = performance.now();

  const dispose = (): void => {
    scene.remove(group);
    ringGeometry.dispose();
    ringMaterial.dispose();
    ring2Material.dispose();
    pillarGeometry.dispose();
    pillarMaterial.dispose();
    particleGeometry.dispose();

    for (const { mesh } of spikes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }

    for (const { mesh } of particles) {
      (mesh.material as THREE.Material).dispose();
    }
  };

  const tick = (): void => {
    const elapsed = performance.now() - startedAt;
    const t = Math.min(elapsed / DURATION_MS, 1);
    const fade = 1 - t;

    ring.scale.setScalar(1 + t * (maxRadius / 0.3));
    ringMaterial.opacity = 0.85 * fade;

    const t2 = Math.max(0, t - 0.15);
    ring2.scale.setScalar(1 + t2 * (maxRadius / 0.3));
    ring2Material.opacity = 0.85 * (1 - t2);

    const pillarT = Math.min(t * 3, 1);
    pillar.scale.set(1, Math.sin(pillarT * Math.PI * 0.5), 1);
    pillarMaterial.opacity = 0.5 * fade;

    light.intensity = 10 * fade;

    for (const spike of spikes) {
      const spikeT = Math.max(0, Math.min((elapsed - spike.delay) / 280, 1));
      const grow = Math.sin(spikeT * Math.PI * 0.5);
      spike.mesh.scale.setScalar(grow);
      (spike.mesh.material as THREE.MeshStandardMaterial).opacity = fade;
    }

    const dt = 1 / 60;
    for (const particle of particles) {
      particle.velocity.y -= 9 * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += dt * 6;
      particle.mesh.rotation.y += dt * 5;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
    }

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      dispose();
    }
  };

  requestAnimationFrame(tick);
}
