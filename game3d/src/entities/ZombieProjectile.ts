import * as THREE from 'three';

export type ProjectileConfig = {
  color: number;
  radius: number;
  speed: number;
  damage: number;
  maxLifetimeMs: number;
};

export class ZombieProjectile {
  readonly mesh: THREE.Mesh;
  private readonly light: THREE.PointLight;
  private readonly velocity: THREE.Vector3;
  private elapsedMs = 0;

  constructor(
    scene: THREE.Scene,
    origin: THREE.Vector3,
    direction: THREE.Vector2,
    private readonly config: ProjectileConfig
  ) {
    const geometry = new THREE.SphereGeometry(config.radius, 12, 12);
    const material = new THREE.MeshBasicMaterial({ color: config.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(origin);
    scene.add(this.mesh);

    this.light = new THREE.PointLight(config.color, 3, config.radius * 10, 2);
    this.light.position.copy(origin);
    scene.add(this.light);

    const normalizedDir = direction.clone().normalize();
    this.velocity = new THREE.Vector3(normalizedDir.x, 0, normalizedDir.y).multiplyScalar(config.speed);
  }

  update(delta: number): boolean {
    this.elapsedMs += delta * 1000;
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.mesh.rotation.x += delta * 6;
    this.mesh.rotation.y += delta * 5;
    this.light.position.copy(this.mesh.position);
    return this.elapsedMs < this.config.maxLifetimeMs;
  }

  hasHit(playerPosition: THREE.Vector3, playerRadius: number): boolean {
    const dx = this.mesh.position.x - playerPosition.x;
    const dz = this.mesh.position.z - playerPosition.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    return horizontalDistance <= playerRadius + this.config.radius;
  }

  getDamage(): number {
    return this.config.damage;
  }

  destroy(scene: THREE.Scene): void {
    scene.remove(this.mesh, this.light);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
