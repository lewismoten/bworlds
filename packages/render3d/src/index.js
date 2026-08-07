import * as THREE from 'three';
import {
  getTileAtlasCanvas,
  getTilePixelSize,
  getTileSpriteRect,
  getTileVariantIndex,
} from '@bworlds/atlas';
import { getTileDefinition, hash2D } from '@bworlds/core';

const TILE_SIZE = 1;
const CHUNK_RADIUS = 18;
const FLOOR_THICKNESS = 0.03;
const TREE_FOLIAGE_COLOR = '#163b20';
const TREE_BARK_COLOR = '#4a2f1b';
const TREE_PLAYER_RADIUS = 0.12;

export function create3DRenderer(host) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9ed8ff');
  scene.fog = new THREE.Fog('#9ed8ff', 12, 34);

  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 120);
  camera.rotation.order = 'YXZ';

  const ambientLight = new THREE.HemisphereLight('#eaf6ff', '#28442f', 1.35);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight('#fff3cf', 1.6);
  sunLight.position.set(8, 14, 6);
  scene.add(sunLight);

  const worldRoot = new THREE.Group();
  scene.add(worldRoot);

  const atlasTexture = new THREE.CanvasTexture(getTileAtlasCanvas());
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  atlasTexture.magFilter = THREE.NearestFilter;
  atlasTexture.minFilter = THREE.NearestFilter;
  atlasTexture.generateMipmaps = false;

  const materialCache = new Map();
  const treeDescriptorCache = new Map();
  const treeGeometry = {
    trunk: new THREE.CylinderGeometry(0.075, 0.1, 1, 6),
    branch: new THREE.CylinderGeometry(0.028, 0.045, 0.45, 5),
    foliage: new THREE.SphereGeometry(0.34, 6, 6),
  };
  const treeMaterial = {
    trunk: new THREE.MeshStandardMaterial({
      color: TREE_BARK_COLOR,
      roughness: 0.95,
      metalness: 0.02,
    }),
    foliage: new THREE.MeshStandardMaterial({
      color: TREE_FOLIAGE_COLOR,
      roughness: 0.98,
      metalness: 0.01,
      flatShading: true,
    }),
  };
  let lastCenterKey = '';
  let lastContextKey = '';

  function resize(width, height, pixelRatio = window.devicePixelRatio || 1) {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    renderer.setPixelRatio(Math.min(pixelRatio, 2));
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
  }

  function rebuildWorld(state) {
    worldRoot.clear();
    const context = state.getCurrentContext();
    const centerX = Math.round(state.player.x);
    const centerY = Math.round(state.player.y);

    for (let y = centerY - CHUNK_RADIUS; y <= centerY + CHUNK_RADIUS; y += 1) {
      for (
        let x = centerX - CHUNK_RADIUS;
        x <= centerX + CHUNK_RADIUS;
        x += 1
      ) {
        const tile = state.getCurrentTile(x, y);
        const definition = getTileDefinition(tile.kind);
        const variant = getTileVariantIndex(tile.kind, x, y);
        const floorMesh = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE, FLOOR_THICKNESS, TILE_SIZE),
          getTileMaterial(tile.kind, variant)
        );
        floorMesh.position.set(
          x * TILE_SIZE,
          -FLOOR_THICKNESS * 0.5,
          y * TILE_SIZE
        );
        worldRoot.add(floorMesh);

        if (tile.kind === 'forest') {
          const treeGroup = createForestTileGroup(x, y);
          worldRoot.add(treeGroup);
        } else if (definition.wallHeight > 0.08) {
          const wallHeight = Math.max(definition.wallHeight * 1.9, 0.18);
          const wallMesh = new THREE.Mesh(
            new THREE.BoxGeometry(TILE_SIZE, wallHeight, TILE_SIZE),
            getTileMaterial(tile.kind, variant)
          );
          wallMesh.position.set(x * TILE_SIZE, wallHeight * 0.5, y * TILE_SIZE);
          worldRoot.add(wallMesh);
        }
      }
    }

    lastCenterKey = `${centerX}:${centerY}`;
    lastContextKey = context.id;
  }

  function render(state, options = {}) {
    const centerKey = `${Math.round(state.player.x)}:${Math.round(state.player.y)}`;
    const contextKey = state.getCurrentContext().id;
    if (centerKey !== lastCenterKey || contextKey !== lastContextKey) {
      rebuildWorld(state);
    }

    camera.position.set(
      state.player.x * TILE_SIZE,
      0.82 + (options.jumpHeight ?? 0) * 2.2,
      state.player.y * TILE_SIZE
    );
    camera.rotation.y = -state.player.facing - Math.PI / 2;
    camera.rotation.x = -0.08;

    const dirX = Math.cos(state.player.facing);
    const dirZ = Math.sin(state.player.facing);
    sunLight.position.set(
      state.player.x * TILE_SIZE - dirX * 6,
      14,
      state.player.y * TILE_SIZE - dirZ * 6
    );
    renderer.render(scene, camera);
  }

  function canOccupy(state, nextX, nextY) {
    const tileX = Math.round(nextX);
    const tileY = Math.round(nextY);
    for (let y = tileY - 1; y <= tileY + 1; y += 1) {
      for (let x = tileX - 1; x <= tileX + 1; x += 1) {
        const tile = state.getCurrentTile(x, y);
        if (tile.kind !== 'forest') continue;

        const descriptors = getForestTreeDescriptors(x, y);
        for (const descriptor of descriptors) {
          const dx = nextX - (x + descriptor.x);
          const dy = nextY - (y + descriptor.y);
          const distance = Math.hypot(dx, dy);
          if (distance < descriptor.radius + TREE_PLAYER_RADIUS) {
            return false;
          }
        }
      }
    }
    return true;
  }

  function getTileMaterial(kind, variant) {
    const key = `${kind}:${variant}`;
    if (!materialCache.has(key)) {
      const rect = getTileSpriteRect(kind, variant);
      const pixelSize = getTilePixelSize();
      const texture = atlasTexture.clone();
      texture.needsUpdate = true;
      texture.repeat.set(
        (1 / atlasTexture.image.width) * pixelSize,
        (1 / atlasTexture.image.height) * pixelSize
      );
      texture.offset.set(
        rect.x / atlasTexture.image.width,
        1 - (rect.y + pixelSize) / atlasTexture.image.height
      );
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;

      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.92,
          metalness: 0.04,
        })
      );
    }
    return materialCache.get(key);
  }

  function createForestTileGroup(tileX, tileY) {
    const group = new THREE.Group();
    const descriptors = getForestTreeDescriptors(tileX, tileY);

    for (const descriptor of descriptors) {
      const tree = new THREE.Group();
      tree.position.set(tileX + descriptor.x, 0, tileY + descriptor.y);
      tree.scale.setScalar(descriptor.scale);

      const trunk = new THREE.Mesh(treeGeometry.trunk, treeMaterial.trunk);
      trunk.position.y = descriptor.trunkHeight * 0.5;
      trunk.scale.y = descriptor.trunkHeight;
      tree.add(trunk);

      for (const branch of descriptor.branches) {
        const limb = new THREE.Mesh(treeGeometry.branch, treeMaterial.trunk);
        limb.position.set(branch.x, branch.y, branch.z);
        limb.rotation.z = branch.roll;
        limb.rotation.x = branch.pitch;
        limb.scale.y = branch.length;
        tree.add(limb);
      }

      for (const clump of descriptor.foliage) {
        const foliage = new THREE.Mesh(
          treeGeometry.foliage,
          treeMaterial.foliage
        );
        foliage.position.set(clump.x, clump.y, clump.z);
        foliage.scale.set(clump.scaleX, clump.scaleY, clump.scaleZ);
        tree.add(foliage);
      }

      group.add(tree);
    }

    return group;
  }

  function getForestTreeDescriptors(tileX, tileY) {
    const key = `${tileX}:${tileY}`;
    if (!treeDescriptorCache.has(key)) {
      const count =
        1 + Math.floor(hash2D('forest-tree-count', tileX, tileY) * 3);
      const descriptors = [];

      for (let index = 0; index < count; index += 1) {
        const baseSeed = `forest-tree:${tileX}:${tileY}:${index}`;
        const descriptor = {
          x: hash2D(baseSeed, 1, 0) * 0.56 - 0.28,
          y: 0,
          z: hash2D(baseSeed, 2, 0) * 0.56 - 0.28,
          radius: 0.08 + hash2D(baseSeed, 3, 0) * 0.05,
          scale: 0.78 + hash2D(baseSeed, 4, 0) * 0.55,
          trunkHeight: 0.72 + hash2D(baseSeed, 5, 0) * 0.45,
          branches: [],
          foliage: [],
        };

        const branchCount = 1 + Math.floor(hash2D(baseSeed, 6, 0) * 3);
        for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
          descriptor.branches.push({
            x: (hash2D(baseSeed, 10 + branchIndex, 1) - 0.5) * 0.16,
            y:
              descriptor.trunkHeight *
              (0.45 + hash2D(baseSeed, 10 + branchIndex, 2) * 0.28),
            z: (hash2D(baseSeed, 10 + branchIndex, 3) - 0.5) * 0.16,
            length: 0.72 + hash2D(baseSeed, 10 + branchIndex, 4) * 0.45,
            pitch: 0.45 + hash2D(baseSeed, 10 + branchIndex, 5) * 0.35,
            roll: -1.25 + hash2D(baseSeed, 10 + branchIndex, 6) * Math.PI * 0.9,
          });
        }

        const foliageCount = 3 + Math.floor(hash2D(baseSeed, 30, 0) * 3);
        for (
          let foliageIndex = 0;
          foliageIndex < foliageCount;
          foliageIndex += 1
        ) {
          descriptor.foliage.push({
            x: (hash2D(baseSeed, 40 + foliageIndex, 1) - 0.5) * 0.28,
            y:
              descriptor.trunkHeight *
              (0.78 + hash2D(baseSeed, 40 + foliageIndex, 2) * 0.5),
            z: (hash2D(baseSeed, 40 + foliageIndex, 3) - 0.5) * 0.28,
            scaleX: 0.68 + hash2D(baseSeed, 40 + foliageIndex, 4) * 0.52,
            scaleY: 0.58 + hash2D(baseSeed, 40 + foliageIndex, 5) * 0.48,
            scaleZ: 0.68 + hash2D(baseSeed, 40 + foliageIndex, 6) * 0.52,
          });
        }

        descriptors.push(descriptor);
      }

      treeDescriptorCache.set(key, descriptors);
    }

    return treeDescriptorCache.get(key);
  }

  return {
    canOccupy,
    render,
    resize,
  };
}
