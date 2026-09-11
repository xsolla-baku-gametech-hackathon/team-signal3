import * as THREE from 'three';

export type TubeMeshes = { core: THREE.Mesh; glow: THREE.Mesh; coreGeometry: THREE.TubeGeometry; glowGeometry: THREE.TubeGeometry };

export function buildJaggedPoints(from: THREE.Vector3, to: THREE.Vector3, segments: number, jitterAmount: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const base = new THREE.Vector3().lerpVectors(from, to, t);
    const isEndpoint = i === 0 || i === segments;
    const jitter = isEndpoint ? 0 : (Math.random() - 0.5) * jitterAmount;
    base.x += jitter;
    base.z += jitter * 0.6;
    points.push(base);
  }

  return points;
}

export function buildTube(points: THREE.Vector3[], color: number, coreRadius: number, glowRadius: number): TubeMeshes {
  const curve = new THREE.CatmullRomCurve3(points);

  const coreGeometry = new THREE.TubeGeometry(curve, Math.max(24, points.length * 3), coreRadius, 6, false);
  const coreMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);

  const glowGeometry = new THREE.TubeGeometry(curve, Math.max(24, points.length * 3), glowRadius, 6, false);
  const glowMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);

  return { core, glow, coreGeometry, glowGeometry };
}

export type Fadeable = {
  update: (nowMs: number) => boolean;
  dispose: (scene: THREE.Scene) => void;
};

export function spawnGroundMark(
  scene: THREE.Scene,
  position: THREE.Vector3,
  radius: number,
  color: number,
  lifetimeMs: number
): Fadeable {
  const geometry = new THREE.CircleGeometry(radius, 20);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.65,
    blending: THREE.NormalBlending,
    depthWrite: false
  });
  const mark = new THREE.Mesh(geometry, material);
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(position.x, position.y + 0.015, position.z);
  scene.add(mark);

  const startedAt = performance.now();
  const holdMs = lifetimeMs * 0.35;

  return {
    update(now) {
      const elapsed = now - startedAt;

      if (elapsed < holdMs) {
        return true;
      }

      const fadeT = Math.min((elapsed - holdMs) / (lifetimeMs - holdMs), 1);
      material.opacity = 0.65 * (1 - fadeT);
      return fadeT < 1;
    },
    dispose(disposeScene) {
      disposeScene.remove(mark);
      geometry.dispose();
      material.dispose();
    }
  };
}

type SmokePuff = { mesh: THREE.Mesh; velocity: THREE.Vector3; spin: number; startScale: number };

export function spawnSmokePuffs(
  scene: THREE.Scene,
  position: THREE.Vector3,
  count: number,
  color: number,
  lifetimeMs: number
): Fadeable {
  const geometry = new THREE.SphereGeometry(0.35, 8, 8);
  const puffs: SmokePuff[] = [];

  for (let i = 0; i < count; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.1, (Math.random() - 0.5) * 0.6));
    const startScale = 0.4 + Math.random() * 0.4;
    mesh.scale.setScalar(startScale);
    scene.add(mesh);
    puffs.push({
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4),
      spin: (Math.random() - 0.5) * 0.8,
      startScale
    });
  }

  const startedAt = performance.now();

  return {
    update(now) {
      const elapsed = now - startedAt;
      const t = Math.min(elapsed / lifetimeMs, 1);
      const dt = 1 / 60;

      for (const puff of puffs) {
        puff.mesh.position.addScaledVector(puff.velocity, dt);
        puff.velocity.multiplyScalar(0.97);
        puff.mesh.rotation.y += puff.spin * dt;
        puff.mesh.scale.setScalar(puff.startScale * (1 + t * 1.8));
        (puff.mesh.material as THREE.MeshBasicMaterial).opacity = 0.22 * (1 - t);
      }

      return t < 1;
    },
    dispose(disposeScene) {
      for (const puff of puffs) {
        disposeScene.remove(puff.mesh);
        (puff.mesh.material as THREE.Material).dispose();
      }
      geometry.dispose();
    }
  };
}

export function runFadeables(scene: THREE.Scene, fadeables: Fadeable[]): void {
  const tick = (): void => {
    const now = performance.now();
    let anyAlive = false;

    for (const fadeable of fadeables) {
      if (fadeable.update(now)) {
        anyAlive = true;
      }
    }

    if (anyAlive) {
      requestAnimationFrame(tick);
    } else {
      for (const fadeable of fadeables) {
        fadeable.dispose(scene);
      }
    }
  };

  requestAnimationFrame(tick);
}
