import * as THREE from 'three';
import { buildJaggedPoints, buildTube, runFadeables, spawnGroundMark, spawnSmokePuffs, TubeMeshes } from '../realism';

const COLOR = 0x9b5cff;
const DURATION_MS = 900;
const SPOKE_COUNT = 10;
const TENDRIL_COUNT = 7;
const MOTE_COUNT = 16;
const ARC_COUNT = 5;

export function spawnSnare(scene: THREE.Scene, target: THREE.Vector3, radius: number): void {
  const group = new THREE.Group();
  group.position.set(target.x, target.y + 0.03, target.z);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const outerGeometry = new THREE.RingGeometry(radius * 0.9, radius, 40);
  const outer = new THREE.Mesh(outerGeometry, ringMaterial.clone());
  outer.rotation.x = -Math.PI / 2;
  group.add(outer);

  const midGeometry = new THREE.RingGeometry(radius * 0.5, radius * 0.58, 32);
  const mid = new THREE.Mesh(midGeometry, ringMaterial.clone());
  mid.rotation.x = -Math.PI / 2;
  group.add(mid);

  const innerGeometry = new THREE.RingGeometry(radius * 0.12, radius * 0.24, 24);
  const inner = new THREE.Mesh(innerGeometry, ringMaterial.clone());
  inner.rotation.x = -Math.PI / 2;
  group.add(inner);

  const arcs: TubeMeshes[] = [];
  for (let i = 0; i < ARC_COUNT; i += 1) {
    const from = new THREE.Vector3((Math.random() - 0.5) * radius * 0.7, 3.2 + Math.random() * 1.6, (Math.random() - 0.5) * radius * 0.7);
    const to = new THREE.Vector3((Math.random() - 0.5) * radius * 0.4, 0.05, (Math.random() - 0.5) * radius * 0.4);
    const arcPoints = buildJaggedPoints(from, to, 6, 0.5);
    const arc = buildTube(arcPoints, COLOR, 0.025, 0.09);
    arcs.push(arc);
    group.add(arc.core, arc.glow);
  }

  const spokePositions: number[] = [];
  for (let i = 0; i < SPOKE_COUNT; i += 1) {
    const angle = (i / SPOKE_COUNT) * Math.PI * 2;
    spokePositions.push(0, 0.01, 0, Math.cos(angle) * radius, 0.01, Math.sin(angle) * radius);
  }
  const spokeGeometry = new THREE.BufferGeometry();
  spokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spokePositions, 3));
  const spokeMaterial = new THREE.LineBasicMaterial({ color: COLOR, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
  const spokes = new THREE.LineSegments(spokeGeometry, spokeMaterial);
  group.add(spokes);

  const tendrilMaterial = new THREE.MeshStandardMaterial({ color: COLOR, emissive: COLOR, emissiveIntensity: 0.7, transparent: true });
  const tendrils: { mesh: THREE.Mesh; delay: number; sway: number }[] = [];

  for (let i = 0; i < TENDRIL_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const tendrilRadius = radius * (0.2 + Math.random() * 0.65);
    const height = 0.5 + Math.random() * 0.7;
    const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, height, 5), tendrilMaterial.clone());
    tendril.position.set(Math.cos(angle) * tendrilRadius, 0, Math.sin(angle) * tendrilRadius);
    tendril.scale.setScalar(0.001);
    tendrils.push({ mesh: tendril, delay: Math.random() * 200, sway: Math.random() * Math.PI * 2 });
    group.add(tendril);
  }

  const moteGeometry = new THREE.SphereGeometry(0.035, 6, 6);
  const motes: { mesh: THREE.Mesh; speed: number; wobble: number }[] = [];

  for (let i = 0; i < MOTE_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const moteRadius = Math.random() * radius;
    const moteMaterial = new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const mote = new THREE.Mesh(moteGeometry, moteMaterial);
    mote.position.set(Math.cos(angle) * moteRadius, 0.1, Math.sin(angle) * moteRadius);
    motes.push({ mesh: mote, speed: 0.4 + Math.random() * 0.6, wobble: Math.random() * Math.PI * 2 });
    group.add(mote);
  }

  const light = new THREE.PointLight(COLOR, 5, radius * 3, 2);
  light.position.set(target.x, 0.5, target.z);
  scene.add(group, light);

  runFadeables(scene, [
    spawnGroundMark(scene, target, radius * 0.85, 0x4a3226, 2400),
    spawnSmokePuffs(scene, target, 5, 0x3a2a20, 1800)
  ]);

  const startedAt = performance.now();

  const dispose = (): void => {
    scene.remove(group, light);
    outerGeometry.dispose();
    midGeometry.dispose();
    innerGeometry.dispose();
    spokeGeometry.dispose();
    spokeMaterial.dispose();
    [outer, mid, inner].forEach((mesh) => (mesh.material as THREE.Material).dispose());
    tendrils.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    motes.forEach(({ mesh }) => (mesh.material as THREE.Material).dispose());
    moteGeometry.dispose();

    for (const arc of arcs) {
      arc.coreGeometry.dispose();
      arc.glowGeometry.dispose();
      (arc.core.material as THREE.Material).dispose();
      (arc.glow.material as THREE.Material).dispose();
    }
  };

  const tick = (): void => {
    const elapsed = performance.now() - startedAt;
    const t = Math.min(elapsed / DURATION_MS, 1);
    const fade = 1 - t;

    outer.rotation.z = t * Math.PI * 0.6;
    mid.rotation.z = -t * Math.PI * 1.1;
    inner.rotation.z = t * Math.PI * 2;

    for (const mesh of [outer, mid, inner]) {
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * fade;
    }
    spokeMaterial.opacity = 0.5 * fade;
    light.intensity = 5 * fade;

    const arcFade = Math.max(0, 1 - t * 2.5);
    for (const arc of arcs) {
      (arc.core.material as THREE.MeshBasicMaterial).opacity = arcFade;
      (arc.glow.material as THREE.MeshBasicMaterial).opacity = arcFade * 0.35;
    }

    for (const tendril of tendrils) {
      const tendrilT = Math.max(0, Math.min((elapsed - tendril.delay) / 300, 1));
      const grow = Math.sin(tendrilT * Math.PI * 0.5);
      tendril.mesh.scale.set(grow, grow, grow);
      tendril.mesh.rotation.z = Math.sin(elapsed * 0.003 + tendril.sway) * 0.15;
      (tendril.mesh.material as THREE.MeshStandardMaterial).opacity = fade;
    }

    for (const mote of motes) {
      mote.mesh.position.y += mote.speed * 0.012;
      mote.mesh.position.x += Math.sin(elapsed * 0.004 + mote.wobble) * 0.004;
      (mote.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.8;
    }

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      dispose();
    }
  };

  requestAnimationFrame(tick);
}
