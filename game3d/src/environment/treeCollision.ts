import * as THREE from 'three';

export type TreeObstacle = { x: number; z: number; radius: number };

export function resolveTreeCollisions(position: THREE.Vector3, selfRadius: number, obstacles: TreeObstacle[]): void {
  for (const obstacle of obstacles) {
    const dx = position.x - obstacle.x;
    const dz = position.z - obstacle.z;
    const distSq = dx * dx + dz * dz;
    const minDist = selfRadius + obstacle.radius;

    if (distSq >= minDist * minDist || distSq < 1e-6) {
      continue;
    }

    const dist = Math.sqrt(distSq);
    const push = minDist - dist;
    position.x += (dx / dist) * push;
    position.z += (dz / dist) * push;
  }
}
