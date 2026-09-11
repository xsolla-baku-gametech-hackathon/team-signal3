import * as THREE from 'three';

const WIDTH = 0.8;
const HEIGHT = 0.1;
const MIN_BRIGHTNESS = 0.4;

export class HealthBar {
  private readonly group: THREE.Group;
  private readonly fill: THREE.Mesh;
  private readonly fillMaterial: THREE.MeshBasicMaterial;
  private readonly baseColor: THREE.Color;

  constructor(scene: THREE.Scene, baseColor = 0x4ade6a) {
    this.baseColor = new THREE.Color(baseColor);
    this.group = new THREE.Group();

    const bgGeometry = new THREE.PlaneGeometry(WIDTH, HEIGHT);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.8, depthTest: false });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    background.renderOrder = 998;
    this.group.add(background);

    const fillGeometry = new THREE.PlaneGeometry(WIDTH, HEIGHT * 0.65);
    this.fillMaterial = new THREE.MeshBasicMaterial({ color: this.baseColor, depthTest: false });
    this.fill = new THREE.Mesh(fillGeometry, this.fillMaterial);
    this.fill.position.z = 0.001;
    this.fill.renderOrder = 999;
    this.group.add(this.fill);

    scene.add(this.group);
  }

  update(anchorPosition: THREE.Vector3, heightAboveGround: number, hpFraction: number, cameraQuaternion: THREE.Quaternion): void {
    this.group.position.set(anchorPosition.x, anchorPosition.y + heightAboveGround, anchorPosition.z);
    this.group.quaternion.copy(cameraQuaternion);

    const clamped = Math.max(0, Math.min(1, hpFraction));
    this.fill.scale.x = clamped;
    this.fill.position.x = (-WIDTH * (1 - clamped)) / 2;

    const brightness = MIN_BRIGHTNESS + (1 - MIN_BRIGHTNESS) * clamped;
    this.fillMaterial.color.copy(this.baseColor).multiplyScalar(brightness);
  }

  destroy(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
