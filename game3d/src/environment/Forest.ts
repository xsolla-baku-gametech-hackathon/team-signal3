import * as THREE from 'three';
import { ARENA_RADIUS, fbmNoise2D, forestBlend } from '../core/terrainNoise';
import { TreeObstacle } from './treeCollision';

const TRUNK_COLLISION_RADIUS = 0.55;

const TREE_COUNT = 1600;
const FIELD_RADIUS = 95;
const CLEARING_RADIUS = ARENA_RADIUS + 1.4;

const FOLIAGE_COLORS = [0x1f3a2a, 0x27472f, 0x1a3325];
const DEAD_TREE_COLOR = 0x4a4038;
const TRUNK_COLOR = 0x3a2b1f;

export function createForest(scene: THREE.Scene): TreeObstacle[] {
  const obstacles: TreeObstacle[] = [];
  const foliageGeometry = createFoliageGeometry();
  const trunkGeometry = new THREE.CylinderGeometry(0.55, 1, 1, 7);
  const deadTrunkGeometry = new THREE.CylinderGeometry(0.1, 0.16, 3.4, 6);
  const branchGeometry = new THREE.CylinderGeometry(0.03, 0.06, 1.1, 5);

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: TRUNK_COLOR, roughness: 0.95 });
  const deadTreeMaterial = new THREE.MeshStandardMaterial({ color: DEAD_TREE_COLOR, roughness: 0.95 });
  const foliageMaterials = FOLIAGE_COLORS.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
  );

  const batches: InstanceBatches = new Map();

  for (let i = 0; i < TREE_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(CLEARING_RADIUS ** 2 + Math.random() * (FIELD_RADIUS ** 2 - CLEARING_RADIUS ** 2));
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const density = fbmNoise2D(x * 0.05, z * 0.05);

    if (Math.random() > (0.12 + 0.88 * forestBlend(radius)) * (0.3 + 0.7 * density)) {
      continue;
    }

    const isDead = Math.random() < 0.15;
    const tree = isDead ? createDeadTree(deadTrunkGeometry, branchGeometry, deadTreeMaterial) : createBroadleafTree(foliageGeometry, trunkGeometry, trunkMaterial, foliageMaterials);

    const scale = 0.75 + Math.random() * 0.6;
    if (radius < ARENA_RADIUS + 5) {
      const bounds = new THREE.Box3().setFromObject(tree);
      const reach = Math.hypot(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
        Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z))) * scale;
      if (radius - reach < ARENA_RADIUS) continue;
    }
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.scale.setScalar(scale);
    collectInstances(tree, batches);

    obstacles.push({ x, z, radius: TRUNK_COLLISION_RADIUS * scale });
  }

  addRuins(batches, obstacles);
  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
  return obstacles;
}

function createFoliageGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 10, 7);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const bulge = 1 + 0.13 * Math.sin(x * 7 + z * 3) * Math.cos(y * 6 - z * 4);
    positions.setXYZ(i, x * bulge, y * bulge, z * bulge);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function addLimb(tree: THREE.Group, geometry: THREE.CylinderGeometry, material: THREE.Material,
  start: THREE.Vector3, end: THREE.Vector3, width: number): void {
  const limb = new THREE.Mesh(geometry, material);
  const direction = end.clone().sub(start);
  limb.position.copy(start).add(end).multiplyScalar(0.5);
  limb.scale.set(width, direction.length(), width);
  limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  limb.castShadow = true;
  limb.receiveShadow = true;
  tree.add(limb);
}

function createBroadleafTree(
  foliageGeometry: THREE.BufferGeometry,
  trunkGeometry: THREE.CylinderGeometry,
  trunkMaterial: THREE.Material,
  foliageMaterials: THREE.Material[]
): THREE.Group {
  const tree = new THREE.Group();
  const height = 4.4 + Math.random() * 2;
  const bend = new THREE.Vector3((Math.random() - 0.5) * 0.35, height * 0.44, (Math.random() - 0.5) * 0.35);
  const tip = new THREE.Vector3(bend.x * 2, height * 0.88, bend.z * 2);
  addLimb(tree, trunkGeometry, trunkMaterial, new THREE.Vector3(0, -0.08, 0), bend, 0.24);
  addLimb(tree, trunkGeometry, trunkMaterial, bend, tip, 0.15);

  const spread = 0.85 + Math.random() * 0.4;
  const phase = Math.random() * Math.PI * 2;
  for (let i = 0; i < 5; i += 1) {
    const angle = phase + i * 2.4 + Math.random() * 0.5;
    const top = i === 4;
    const reach = top ? 0.2 : spread * (0.65 + Math.random() * 0.35);
    const end = new THREE.Vector3(tip.x + Math.cos(angle) * reach,
      height * (top ? 0.94 : 0.62 + Math.random() * 0.22), tip.z + Math.sin(angle) * reach);
    addLimb(tree, trunkGeometry, trunkMaterial, bend.clone().lerp(tip, 0.25 + Math.random() * 0.35), end, 0.07);
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterials[Math.floor(Math.random() * foliageMaterials.length)]);
    foliage.position.copy(end);
    foliage.scale.set(spread * (0.85 + Math.random() * 0.25), 0.85 + Math.random() * 0.65,
      spread * (0.75 + Math.random() * 0.3));
    foliage.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.4);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    tree.add(foliage);
  }
  return tree;
}

function createDeadTree(trunkGeometry: THREE.CylinderGeometry, branchGeometry: THREE.CylinderGeometry, material: THREE.Material): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeometry, material);
  trunk.position.y = 1.7;
  trunk.castShadow = true;
  tree.add(trunk);

  for (let i = 0; i < 3; i += 1) {
    const branch = new THREE.Mesh(branchGeometry, material);
    branch.position.set(0, 2.4 + i * 0.4, 0);
    branch.rotation.z = (Math.random() - 0.5) * 1.4;
    branch.rotation.y = Math.random() * Math.PI * 2;
    tree.add(branch);
  }

  return tree;
}

type InstanceBatches = Map<string, {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
  castShadow: boolean;
  receiveShadow: boolean;
}>;

function collectInstances(group: THREE.Group, batches: InstanceBatches): void {
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const key = `${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { geometry: object.geometry, material: object.material, matrices: [],
        castShadow: object.castShadow, receiveShadow: object.receiveShadow };
      batches.set(key, batch);
    }
    batch.matrices.push(object.matrixWorld.clone());
  });
}

function addRuins(batches: InstanceBatches, trees: TreeObstacle[]): void {
  const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
  const columnGeometry = new THREE.CylinderGeometry(0.3, 0.38, 1, 6);
  const material = new THREE.MeshStandardMaterial({ color: 0x555951, roughness: 1 });

  for (let i = 0; i < 32; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 62;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 2.8 + tree.radius)) continue;

    const ruin = new THREE.Group();
    ruin.position.set(x, 0, z);
    ruin.rotation.y = Math.random() * Math.PI * 2;
    const column = Math.random() < 0.4;
    const pieces = column ? 3 : 5;
    for (let j = 0; j < pieces; j += 1) {
      const upright = column && j === 0;
      const height = upright ? 1.1 + Math.random() : 0.25 + Math.random() * 0.55;
      const stone = new THREE.Mesh(upright ? columnGeometry : blockGeometry, material);
      stone.scale.set(upright ? 1 : 0.5 + Math.random() * 0.5, height, upright ? 1 : 0.45 + Math.random() * 0.25);
      stone.position.set((j - 1) * 0.65, height / 2 - 0.04, (Math.random() - 0.5) * 0.7);
      stone.rotation.set((Math.random() - 0.5) * 0.18, Math.random() * 0.35, (Math.random() - 0.5) * 0.22);
      stone.castShadow = true;
      stone.receiveShadow = true;
      ruin.add(stone);
    }
    collectInstances(ruin, batches);
  }
}
