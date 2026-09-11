import { afterEach, describe, expect, it } from 'vitest';
import { InputController } from '../InputController';

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
}

function release(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }));
}

describe('InputController', () => {
  let controller: InputController | undefined;

  afterEach(() => {
    controller?.destroy();
    controller = undefined;
  });

  it('reports a zero vector when nothing is pressed', () => {
    controller = new InputController();

    const vector = controller.getMovementVector();

    expect(vector.x).toBe(0);
    expect(vector.y).toBe(0);
  });

  it('moves forward (negative y) on W', () => {
    controller = new InputController();

    press('KeyW');

    const vector = controller.getMovementVector();
    expect(vector.x).toBeCloseTo(0);
    expect(vector.y).toBeCloseTo(-1);
  });

  it('cancels out opposite keys held together', () => {
    controller = new InputController();

    press('KeyW');
    press('KeyS');

    const vector = controller.getMovementVector();
    expect(vector.x).toBeCloseTo(0);
    expect(vector.y).toBeCloseTo(0);
  });

  it('normalizes diagonal movement to unit length', () => {
    controller = new InputController();

    press('KeyW');
    press('KeyD');

    const vector = controller.getMovementVector();
    expect(vector.length()).toBeCloseTo(1);
  });

  it('stops reporting a key after it is released', () => {
    controller = new InputController();

    press('KeyA');
    release('KeyA');

    const vector = controller.getMovementVector();
    expect(vector.x).toBe(0);
  });

  it('fires the one-shot handler registered for a key code', () => {
    controller = new InputController();
    let firedCount = 0;
    controller.onKeyPressed('KeyZ', () => {
      firedCount += 1;
    });

    press('KeyZ');
    press('KeyZ');

    expect(firedCount).toBe(2);
  });
});
