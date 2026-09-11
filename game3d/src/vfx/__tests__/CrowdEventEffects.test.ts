import { afterEach, describe, expect, it, vi } from 'vitest';
import { Group, Mesh, Scene, Vector3 } from 'three';
import { CrowdEventEffects } from '../CrowdEventEffects';

afterEach(() => vi.restoreAllMocks());

describe('crowd effects lifecycle', () => {
  it('keeps the strike perimeter fixed while the inner countdown shrinks', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const scene = new Scene();
    const effects = new CrowdEventEffects(scene);
    effects.warning(new Vector3(4, 0, 8), 0xffcf7a, 2.5, 450);
    effects.update(225);
    const group = scene.children[0] as Group;
    expect(group.children[0].scale.x).toBe(2.5);
    expect(group.children[1].scale.x).toBe(1.25);
    expect(group.position.x).toBe(4);
    effects.update(450);
    expect(scene.children).toHaveLength(0);
    effects.destroy();
  });

  it('disposes per-effect resources and leaves unrelated scene objects intact', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const scene = new Scene();
    const permanent = new Group();
    scene.add(permanent);
    const effects = new CrowdEventEffects(scene);
    effects.heal(new Vector3());
    const ring = (scene.children[1] as Group).children[0] as Mesh;
    const dispose = vi.spyOn(ring.material as any, 'dispose');
    effects.update(500);
    effects.clear();
    expect(dispose).toHaveBeenCalledOnce();
    expect(scene.children).toEqual([permanent]);
    effects.destroy();
  });

  it('bounds the number of simultaneous effects', () => {
    const scene = new Scene();
    const effects = new CrowdEventEffects(scene);
    for (let i = 0; i < 50; i++) effects.arrival(new Vector3(i, 0, 0), i % 2 === 0);
    expect(scene.children).toHaveLength(24);
    effects.destroy();
    expect(scene.children).toHaveLength(0);
  });
});
