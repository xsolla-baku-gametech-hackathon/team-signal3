import * as THREE from 'three';

const RETICLE_ROTATION_SPEED = 0.6;

function createTriangleRingGeometry(outerRadius: number, innerRadius: number): THREE.ShapeGeometry {
  const outer = new THREE.Shape();
  addTrianglePath(outer, outerRadius);

  const inner = new THREE.Path();
  addTrianglePath(inner, innerRadius);
  outer.holes.push(inner);

  return new THREE.ShapeGeometry(outer);
}

function addTrianglePath(path: THREE.Shape | THREE.Path, radius: number): void {
  for (let i = 0; i <= 3; i += 1) {
    const angle = -Math.PI / 2 + (i * (Math.PI * 2)) / 3;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
}

export class AimController {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly reticle: THREE.Mesh;
  private hasPointer = false;
  private lastAimPoint?: THREE.Vector3;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly ground: THREE.Object3D,
    scene: THREE.Scene
  ) {
    domElement.addEventListener('pointermove', this.handlePointerMove);
    domElement.addEventListener('pointerleave', () => {
      this.hasPointer = false;
    });

    const geometry = createTriangleRingGeometry(0.95, 0.7);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4fd8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.visible = false;
    scene.add(this.reticle);
  }

  getAimPoint(): THREE.Vector3 | undefined {
    if (!this.hasPointer) {
      this.reticle.visible = false;
      return undefined;
    }

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hit = this.raycaster.intersectObject(this.ground, false)[0];

    if (!hit) {
      this.reticle.visible = false;
      return undefined;
    }

    this.reticle.visible = true;
    this.reticle.position.set(hit.point.x, hit.point.y + 0.02, hit.point.z);
    this.reticle.rotation.z = (performance.now() / 1000) * RETICLE_ROTATION_SPEED;
    this.lastAimPoint = hit.point.clone();
    return this.lastAimPoint;
  }

  destroy(): void {
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.hasPointer = true;
  };
}
