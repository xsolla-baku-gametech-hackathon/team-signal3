import * as THREE from 'three';

const OFFSET = new THREE.Vector3(0, 4, 9);
const LOOK_HEIGHT = 1.8;
const FOLLOW_LERP = 0.08;

export class ChaseCamera {
  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  update(targetPosition: THREE.Vector3): void {
    const desired = targetPosition.clone().add(OFFSET);
    this.camera.position.lerp(desired, FOLLOW_LERP);
    this.camera.lookAt(targetPosition.x, targetPosition.y + LOOK_HEIGHT, targetPosition.z);
  }
}
