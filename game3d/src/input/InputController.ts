import * as THREE from 'three';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export class InputController {
  private readonly pressed = new Set<string>();
  private readonly keyPressHandlers = new Map<string, Set<() => void>>();

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  getMovementVector(): THREE.Vector2 {
    let x = 0;
    let z = 0;

    if (this.pressed.has('KeyW') || this.pressed.has('ArrowUp')) z -= 1;
    if (this.pressed.has('KeyS') || this.pressed.has('ArrowDown')) z += 1;
    if (this.pressed.has('KeyA') || this.pressed.has('ArrowLeft')) x -= 1;
    if (this.pressed.has('KeyD') || this.pressed.has('ArrowRight')) x += 1;

    const vector = new THREE.Vector2(x, z);
    return vector.lengthSq() > 0 ? vector.normalize() : vector;
  }

  onKeyPressed(code: string, handler: () => void): void {
    const handlers = this.keyPressHandlers.get(code) ?? new Set();
    handlers.add(handler);
    this.keyPressHandlers.set(code, handlers);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
    }

    if (MOVE_KEYS.has(event.code)) {
      this.pressed.add(event.code);
    }

    for (const handler of this.keyPressHandlers.get(event.code) ?? []) {
      handler();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };
}
