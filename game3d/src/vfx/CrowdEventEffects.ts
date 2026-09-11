import * as THREE from 'three';

type Effect = { group: THREE.Group; material: THREE.MeshBasicMaterial; pointsMaterial?: THREE.PointsMaterial;
  pointsGeometry?: THREE.BufferGeometry; start: number; duration: number; radius: number; warning: boolean; heal: boolean };

export class CrowdEventEffects {
  private readonly ringGeometry = new THREE.RingGeometry(0.88, 1, 40);
  private readonly columnGeometry = new THREE.CylinderGeometry(0.8, 1, 1, 12, 1, true);
  private readonly effects: Effect[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  warning(point: THREE.Vector3, color: number, radius: number, duration: number): void {
    this.create(point, color, radius, duration, true, false);
  }

  heal(point: THREE.Vector3): void {
    this.create(point, 0x72ffe7, 1.8, 1100, false, true);
  }

  arrival(point: THREE.Vector3, boss: boolean): void {
    this.create(point, boss ? 0xff553d : 0x9ade63, boss ? 2.5 : 1, boss ? 1400 : 850, false, false);
  }

  update(now: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      const t = Math.min(1, Math.max(0, (now - effect.start) / effect.duration));
      if (t >= 1) { this.remove(i); continue; }
      const ring = effect.group.children[0];
      ring.scale.setScalar(effect.radius * (effect.warning ? 1 : 0.6 + t));
      if (effect.warning) effect.group.children[1].scale.setScalar(effect.radius * (1 - t));
      effect.material.opacity = effect.warning ? 0.35 + t * 0.45 : (1 - t) * 0.65;
      if (!effect.warning) {
        const column = effect.group.children[1];
        column.scale.y = (effect.heal ? 1.2 : effect.radius * 1.5) * (0.3 + Math.sin(t * Math.PI));
        column.position.y = column.scale.y / 2;
        const motes = effect.group.children[2];
        motes.position.y = t * (effect.heal ? 2.5 : 1.5);
        motes.rotation.y = t * 1.5;
        effect.pointsMaterial!.opacity = 1 - t;
      }
    }
  }

  clear(): void {
    while (this.effects.length) this.remove(this.effects.length - 1);
  }

  destroy(): void {
    this.clear();
    this.ringGeometry.dispose();
    this.columnGeometry.dispose();
  }

  private create(point: THREE.Vector3, color: number, radius: number, duration: number, warning: boolean, heal: boolean): void {
    if (this.effects.length >= 24) this.remove(0);
    const group = new THREE.Group();
    group.position.set(point.x, 0.24, point.z);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(this.ringGeometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(radius);
    group.add(ring);
    const effect: Effect = { group, material, start: performance.now(), duration, radius, warning, heal };
    if (warning) {
      const countdown = new THREE.Mesh(this.ringGeometry, material);
      countdown.rotation.x = -Math.PI / 2;
      countdown.scale.setScalar(radius);
      group.add(countdown);
    } else {
      const column = new THREE.Mesh(this.columnGeometry, material);
      column.scale.set(radius * 0.6, 1, radius * 0.6);
      column.position.y = 0.5;
      const positions = new Float32Array(24 * 3);
      for (let i = 0; i < 24; i++) {
        const angle = i * 2.4;
        positions[i * 3] = Math.cos(angle) * radius * Math.random();
        positions[i * 3 + 1] = Math.random() * 1.1;
        positions[i * 3 + 2] = Math.sin(angle) * radius * Math.random();
      }
      effect.pointsGeometry = new THREE.BufferGeometry();
      effect.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      effect.pointsMaterial = new THREE.PointsMaterial({ color, size: 0.09, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false });
      group.add(column, new THREE.Points(effect.pointsGeometry, effect.pointsMaterial));
    }
    this.scene.add(group);
    this.effects.push(effect);
  }

  private remove(index: number): void {
    const [effect] = this.effects.splice(index, 1);
    this.scene.remove(effect.group);
    effect.material.dispose();
    effect.pointsGeometry?.dispose();
    effect.pointsMaterial?.dispose();
  }
}
