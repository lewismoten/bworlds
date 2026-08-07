import * as THREE from 'three';
import {
  getTileAtlasCanvas,
  getTilePixelSize,
  getTileSpriteRect,
  getTileVariantIndex,
} from '@bworlds/atlas';
import { getTileDefinition } from '@bworlds/core';

const TILE_SIZE = 1;
const CHUNK_RADIUS = 18;
const FLOOR_THICKNESS = 0.03;

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

        if (definition.wallHeight > 0.08) {
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

  return {
    render,
    resize,
  };
}
