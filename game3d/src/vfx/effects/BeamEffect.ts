import * as THREE from 'three';
import { buildTube, runFadeables, spawnGroundMark, spawnSmokePuffs, TubeMeshes } from '../realism';

const COLOR = 0xb388ff;
const CORE_COLOR = 0xf0e6ff;
const DURATION_MS = 260;
const SPARK_COUNT = 14;
const SPIRAL_TURNS = 2.4;
const SPIRAL_SEGMENTS = 48;

function buildSpiralPoints(origin: THREE.Vector3, dir: THREE.Vector2, length: number, radius: number, phase: number): THREE.Vector3[] {
  const forward = new THREE.Vector3(dir.x, 0, dir.y);
  const right = new THREE.Vector3(-dir.y, 0, dir.x);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= SPIRAL_SEGMENTS; i += 1) {
    const t = i / SPIRAL_SEGMENTS;
    const taper = Math.min(1, t / 0.12);
    const angle = t * SPIRAL_TURNS * Math.PI * 2 + phase;
    const point = origin.clone().addScaledVector(forward, length * t);
    point.addScaledVector(right, Math.cos(angle) * radius * taper);
    point.y += 0.6 + Math.sin(angle) * radius * taper * 0.7;
    points.push(point);
  }

  return points;
}

export function spawnBeam(scene: THREE.Scene, origin: THREE.Vector3, direction: THREE.Vector2, length: number, halfWidth: number): void {
  const dir = direction.clone().normalize();
  const endPoint = new THREE.Vector3(origin.x + dir.x * length, 0.4, origin.z + dir.y * length);
  const spiralRadius = halfWidth * 1.7;

  const strands: TubeMeshes[] = [
    buildTube(buildSpiralPoints(origin, dir, length, spiralRadius, 0), COLOR, halfWidth * 0.22, halfWidth * 0.55),
    buildTube(buildSpiralPoints(origin, dir, length, spiralRadius, Math.PI), CORE_COLOR, halfWidth * 0.14, halfWidth * 0.4)
  ];

  for (const strand of strands) {
    scene.add(strand.core, strand.glow);
  }

  runFadeables(scene, [
    spawnGroundMark(scene, endPoint, halfWidth * 1.3, 0x4a2f5c, 2000),
    spawnSmokePuffs(scene, endPoint, 4, 0x352245, 1600)
  ]);

  const light = new THREE.PointLight(COLOR, 7, length, 2);
  light.position.set(origin.x + dir.x * (length / 2), 1, origin.z + dir.y * (length / 2));
  scene.add(light);

  const flareGeometry = new THREE.RingGeometry(0.15, 0.5, 24);
  const flareMaterial = new THREE.MeshBasicMaterial({
    color: CORE_COLOR,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const flare = new THREE.Mesh(flareGeometry, flareMaterial);
  flare.position.copy(endPoint);
  scene.add(flare);

  const sparkGeometry = new THREE.SphereGeometry(0.05, 6, 6);
  const sparks: { mesh: THREE.Mesh; offset: number; lateral: number; height: number }[] = [];

  for (let i = 0; i < SPARK_COUNT; i += 1) {
    const sparkMaterial = new THREE.MeshBasicMaterial({ color: CORE_COLOR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    const lateral = (Math.random() - 0.5) * halfWidth * 1.2;
    const height = 0.3 + Math.random() * 0.6;
    spark.position.set(origin.x - dir.y * lateral, height, origin.z + dir.x * lateral);
    sparks.push({ mesh: spark, offset: Math.random(), lateral, height });
    scene.add(spark);
  }

  const startedAt = performance.now();

  const dispose = (): void => {
    scene.remove(light, flare);
    flareGeometry.dispose();
    flareMaterial.dispose();

    for (const strand of strands) {
      scene.remove(strand.core, strand.glow);
      strand.coreGeometry.dispose();
      strand.glowGeometry.dispose();
      (strand.core.material as THREE.Material).dispose();
      (strand.glow.material as THREE.Material).dispose();
    }

    for (const { mesh } of sparks) {
      scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    }

    sparkGeometry.dispose();
  };

  const tick = (): void => {
    const t = Math.min((performance.now() - startedAt) / DURATION_MS, 1);
    const fade = 1 - t;

    for (const strand of strands) {
      (strand.core.material as THREE.MeshBasicMaterial).opacity = fade;
      (strand.glow.material as THREE.MeshBasicMaterial).opacity = fade * 0.35;
    }

    light.intensity = 7 * fade;
    flareMaterial.opacity = 0.9 * fade;
    flare.scale.setScalar(1 + t * 1.5);

    for (const spark of sparks) {
      const progress = (t + spark.offset) % 1;
      const alongDistance = length * progress;
      spark.mesh.position.set(
        origin.x + dir.x * alongDistance - dir.y * spark.lateral,
        spark.height,
        origin.z + dir.y * alongDistance + dir.x * spark.lateral
      );
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
