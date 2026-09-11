import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';

export type PostProcessing = {
  render: () => void;
  resize: (width: number, height: number) => void;
};

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number
): PostProcessing {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.35, 0.42);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms.offset.value = 1.05;
  vignettePass.uniforms.darkness.value = 1.15;
  composer.addPass(vignettePass);

  return {
    render: () => composer.render(),
    resize: (newWidth: number, newHeight: number) => {
      composer.setSize(newWidth, newHeight);
      bloomPass.setSize(newWidth, newHeight);
    }
  };
}
