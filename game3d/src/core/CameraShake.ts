import * as THREE from 'three';

export class CameraShake {
  private durationMs = 0;
  private elapsedMs = 0;
  private strength = 0;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  trigger(strength: number, durationMs: number): void {
    this.strength = Math.max(this.strength, strength);
    this.durationMs = Math.max(this.durationMs, durationMs);
    this.elapsedMs = 0;
  }

  apply(delta: number): void {
    if (this.elapsedMs >= this.durationMs) {
      return;
    }

    this.elapsedMs += delta * 1000;
    const t = Math.min(this.elapsedMs / this.durationMs, 1);
    const magnitude = this.strength * (1 - t);

    this.camera.position.x += (Math.random() - 0.5) * magnitude;
    this.camera.position.y += (Math.random() - 0.5) * magnitude;
  }
}
