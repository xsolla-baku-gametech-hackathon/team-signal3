import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkinnedObject } from 'three/examples/jsm/utils/SkeletonUtils.js';

const MIXAMO_SCALE = 0.01;

export type CharacterTemplate = {
  object: THREE.Group;
  animations: THREE.AnimationClip[];
};

export type LoadedCharacterInstance = {
  object: THREE.Group;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
};

export async function loadCharacterTemplate(url: string): Promise<CharacterTemplate> {
  const loader = new FBXLoader();
  const object = await loader.loadAsync(url);

  object.scale.setScalar(MIXAMO_SCALE);
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { object, animations: object.animations };
}

export function instantiateCharacter(template: CharacterTemplate): LoadedCharacterInstance {
  const object = cloneSkinnedObject(template.object) as THREE.Group;
  const mixer = new THREE.AnimationMixer(object);
  const clip = template.animations[0];

  if (!clip) {
    throw new Error('Character template has no animation clip.');
  }

  const action = mixer.clipAction(clip);
  action.play();

  return { object, mixer, action };
}

function stripRootPositionTrack(clip: THREE.AnimationClip): THREE.AnimationClip {
  const tracks = clip.tracks.filter((track) => !(/hips/i.test(track.name) && track.name.endsWith('.position')));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

export async function loadAnimationClip(url: string): Promise<THREE.AnimationClip> {
  const loader = new FBXLoader();
  const object = await loader.loadAsync(url);
  const clip = object.animations[0];

  if (!clip) {
    throw new Error(`No animation clip found in ${url}`);
  }

  return stripRootPositionTrack(clip);
}

export async function loadMixamoCharacter(
  url: string
): Promise<{ object: THREE.Group; mixer: THREE.AnimationMixer; walkAction: THREE.AnimationAction }> {
  const template = await loadCharacterTemplate(url);
  const instance = instantiateCharacter(template);
  return { object: instance.object, mixer: instance.mixer, walkAction: instance.action };
}
