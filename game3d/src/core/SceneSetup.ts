import * as THREE from 'three';
import { fbmNoise2D, forestBlend } from './terrainNoise';

export type SceneSetup = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  ground: THREE.Mesh;
};

const GROUND_SIZE = 200;
const GROUND_SEGMENTS = 120;
const TERRAIN_HEIGHT = 0.18;
const TERRAIN_SCALE = 0.06;

export function createSceneSetup(container: HTMLElement): SceneSetup {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1c);
  scene.fog = new THREE.FogExp2(0x0d1424, 0.016);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 2000);
  camera.position.set(0, 6, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  createStarField(scene);

  const hemiLight = new THREE.HemisphereLight(0x4a6090, 0x1a2030, 0.85);
  scene.add(hemiLight);

  const fillLight = new THREE.AmbientLight(0x40506a, 0.5);
  scene.add(fillLight);

  const moonLight = new THREE.DirectionalLight(0xaec2ff, 1.4);
  moonLight.position.set(-30, 45, -20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.camera.left = -40;
  moonLight.shadow.camera.right = 40;
  moonLight.shadow.camera.top = 40;
  moonLight.shadow.camera.bottom = -40;
  scene.add(moonLight);

  const ground = createGround();
  scene.add(ground);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return { scene, camera, renderer, ground };
}

function createStarField(scene: THREE.Scene): void {
  const starCount = 2500;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    const radius = 400 + Math.random() * 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - Math.random() * 0.85);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) + 10;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    depthTest: false,
    fog: false // stars sit far past the fog's falloff distance and would otherwise be invisible
  });

  scene.add(new THREE.Points(geometry, material));
}

function createGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const baseColor = new THREE.Color(0x3d4a34);
  const shadeColor = new THREE.Color(0x2a3324);
  const arenaColor = new THREE.Color(0x494538);

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const blend = forestBlend(Math.hypot(x, y));
    const noise = fbmNoise2D(x * TERRAIN_SCALE, y * TERRAIN_SCALE);
    const height = noise * TERRAIN_HEIGHT * blend;
    positions.setZ(i, height);

    const color = arenaColor.clone().lerp(baseColor, blend).lerp(shadeColor, noise * 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  return ground;
}
