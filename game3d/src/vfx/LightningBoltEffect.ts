import * as THREE from 'three';
import { buildJaggedPoints, buildTube, runFadeables, spawnGroundMark, spawnSmokePuffs, TubeMeshes } from './realism';

const SEGMENTS = 8;
const DURATION_MS = 340;
const SKY_HEIGHT = 14;
const BRANCH_COUNT = 3;
const SPARK_COUNT = 12;

type BoltMeshes = TubeMeshes;

export function spawnLightningBolt(scene: THREE.Scene, target: THREE.Vector3, color = 0xdffcff): void {
  const from = new THREE.Vector3(target.x + (Math.random() - 0.5) * 2, SKY_HEIGHT, target.z + (Math.random() - 0.5) * 2);
  const mainPoints = buildJaggedPoints(from, target, SEGMENTS, 1.4);
  const bolts: BoltMeshes[] = [buildTube(mainPoints, color, 0.06, 0.22)];

  for (let i = 0; i < BRANCH_COUNT; i += 1) {
    const forkIndex = 2 + Math.floor(Math.random() * (SEGMENTS - 3));
    const forkPoint = mainPoints[forkIndex];
    const branchEnd = forkPoint.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, -forkPoint.y * 0.6, (Math.random() - 0.5) * 3));
    branchEnd.y = Math.max(branchEnd.y, 0.1);
    const branchPoints = buildJaggedPoints(forkPoint, branchEnd, 4, 0.8);
    bolts.push(buildTube(branchPoints, color, 0.03, 0.1));
  }

  const impactGeometry = new THREE.RingGeometry(0.3, 0.9, 24);
  const impactMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const impact = new THREE.Mesh(impactGeometry, impactMaterial);
  impact.rotation.x = -Math.PI / 2;
  impact.position.set(target.x, target.y + 0.02, target.z);

  const pointLight = new THREE.PointLight(color, 9, 12, 2);
  pointLight.position.copy(target).setY(target.y + 1);

  scene.add(impact, pointLight);
  for (const bolt of bolts) {
    scene.add(bolt.core, bolt.glow);
  }

  runFadeables(scene, [
    spawnGroundMark(scene, target, 0.9, 0x3a3630, 2200),
    spawnSmokePuffs(scene, target, 5, 0x2a2a2a, 1800)
  ]);

  const sparkGeometry = new THREE.SphereGeometry(0.045, 6, 6);
  const sparks: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] = [];

  for (let i = 0; i < SPARK_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.5;
    const sparkMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.position.copy(target).setY(target.y + 0.1);
    const velocity = new THREE.Vector3(Math.cos(angle) * speed, 1.5 + Math.random() * 2, Math.sin(angle) * speed);
    sparks.push({ mesh: spark, velocity });
    scene.add(spark);
  }

  const startedAt = performance.now();

  const dispose = (): void => {
    scene.remove(impact, pointLight);
    impactGeometry.dispose();
    impactMaterial.dispose();

    for (const bolt of bolts) {
      scene.remove(bolt.core, bolt.glow);
      bolt.coreGeometry.dispose();
      bolt.glowGeometry.dispose();
      (bolt.core.material as THREE.Material).dispose();
      (bolt.glow.material as THREE.Material).dispose();
    }

    for (const { mesh } of sparks) {
      scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    }

    sparkGeometry.dispose();
  };

  const tick = (): void => {
    const elapsed = performance.now() - startedAt;
    const t = Math.min(elapsed / DURATION_MS, 1);
    const fade = 1 - t;

    for (const bolt of bolts) {
      (bolt.core.material as THREE.MeshBasicMaterial).opacity = fade;
      (bolt.glow.material as THREE.MeshBasicMaterial).opacity = fade * 0.35;
    }

    impactMaterial.opacity = fade * 0.6;
    impact.scale.setScalar(1 + t * 2.2);
    pointLight.intensity = 9 * fade;

    const dt = 1 / 60;
    for (const spark of sparks) {
      spark.velocity.y -= 8 * dt;
      spark.mesh.position.addScaledVector(spark.velocity, dt);
      (spark.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
    }

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      dispose();
    }
  };

  requestAnimationFrame(tick);
}
