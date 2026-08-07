import * as THREE from 'three';
import {
  getTileAtlasCanvas,
  getTilePixelSize,
  getTileSpriteRect,
  getTileVariantIndex,
} from '@bworlds/atlas';
import { hash2D } from '@bworlds/core';
import {
  getActivePluginRegistry,
  type SurfaceBoundaryRole3D,
} from '@bworlds/plugin-api';

const TILE_SIZE = 1;
const CHUNK_RADIUS = 18;
const FLOOR_THICKNESS = 0.03;
const WATER_FLOOR_THICKNESS = 0.28;
const MOUNTAIN_BASE_COLOR = '#6b7280';
const WATER_SURFACE_DROP = -0.12;
const MAX_RIVER_CHAMFER_DROP = 0.08;
const MAX_OCEAN_CHAMFER_DROP = 0.05;
const MIN_OCEAN_BANK_HEIGHT = 0.05;
const RIVER_WALL_THICKNESS = 0.05;
const WATER_BODY_INSET = 0.08;
const FALLBACK_TILE_DEFINITION = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};

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
  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: '#dbe4ea',
    map: createMountainTexture(),
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true,
  });
  const visibleTileNodes = new Map();
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

  function clearWorld() {
    worldRoot.clear();
    visibleTileNodes.clear();
  }

  function buildTileNode(state, registry, x, y) {
    const tileNode = new THREE.Group();
    const tile = state.getCurrentTile(x, y);
    const definition = getTileDefinitionFromRegistry(tile.kind);
    const variant = getTileVariantIndex(tile.kind, x, y);
    const surfaceHeight = getTileSurfaceProfile(
      state,
      tile,
      x,
      y
    ).surfaceHeight;

    tileNode.add(createFloorMesh(state, tile, x, y, variant));

    const tilePlugin = registry.getTilePlugin(tile.kind);
    const pluginModel = tilePlugin?.create3DModel?.({
      three: THREE,
      state,
      tile,
      tileX: x,
      tileY: y,
      materials: {
        mountainMaterial,
      },
    });

    if (pluginModel) {
      tileNode.add(pluginModel);
    } else if (tile.kind !== 'ocean' && definition.wallHeight > 0.08) {
      const wallHeight = Math.max(definition.wallHeight * 1.9, 0.18);
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(TILE_SIZE, wallHeight, TILE_SIZE),
        getTileMaterial(tile.kind, variant)
      );
      wallMesh.position.set(
        x * TILE_SIZE,
        surfaceHeight + wallHeight * 0.5,
        y * TILE_SIZE
      );
      tileNode.add(wallMesh);
    }

    return tileNode;
  }

  function syncVisibleWorld(state) {
    const registry = getActivePluginRegistry();
    const context = state.getCurrentContext();
    const centerX = Math.round(state.player.x);
    const centerY = Math.round(state.player.y);
    const nextVisibleKeys = new Set();

    for (let y = centerY - CHUNK_RADIUS; y <= centerY + CHUNK_RADIUS; y += 1) {
      for (
        let x = centerX - CHUNK_RADIUS;
        x <= centerX + CHUNK_RADIUS;
        x += 1
      ) {
        const key = `${x}:${y}`;
        nextVisibleKeys.add(key);
        if (!visibleTileNodes.has(key)) {
          const tileNode = buildTileNode(state, registry, x, y);
          visibleTileNodes.set(key, tileNode);
          worldRoot.add(tileNode);
        }
      }
    }

    for (const [key, tileNode] of visibleTileNodes.entries()) {
      if (nextVisibleKeys.has(key)) {
        continue;
      }
      worldRoot.remove(tileNode);
      visibleTileNodes.delete(key);
    }

    lastCenterKey = `${centerX}:${centerY}`;
    lastContextKey = context.id;
  }

  function render(
    state,
    options: {
      jumpHeight?: number;
    } = {}
  ) {
    const centerKey = `${Math.round(state.player.x)}:${Math.round(state.player.y)}`;
    const contextKey = state.getCurrentContext().id;
    if (contextKey !== lastContextKey) {
      clearWorld();
    }
    if (centerKey !== lastCenterKey || contextKey !== lastContextKey) {
      syncVisibleWorld(state);
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
        const canOccupyTile = getActivePluginRegistry().canOccupy3D({
          state,
          tile,
          tileX: x,
          tileY: y,
          nextX,
          nextY,
          playerRadius: 0.12,
        });
        if (canOccupyTile === false) {
          return false;
        }
      }
    }
    return true;
  }

  function getTileSurfaceProfile(state, tile, tileX, tileY) {
    const pluginProfile =
      (getActivePluginRegistry().getSurfaceProfile3D({
        state,
        tile,
        tileX,
        tileY,
      }) || null) ?? {};
    const surfaceHeight = pluginProfile.surfaceHeight ?? 0;
    const boundaryRole = pluginProfile.boundaryRole ?? null;
    const chamferEligible =
      pluginProfile.chamferEligible ??
      (boundaryRole == null && surfaceHeight >= 0);
    return {
      surfaceHeight,
      boundaryRole,
      underlayKind: pluginProfile.underlayKind ?? null,
      chamferEligible,
    };
  }

  function getTraversalProfile(state, tile, tileX, tileY) {
    return (
      getActivePluginRegistry().getTraversalProfile3D({
        state,
        tile,
        tileX,
        tileY,
      }) || {}
    );
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

  function createFloorMesh(state, tile, tileX, tileY, variant) {
    const surfaceProfile = getTileSurfaceProfile(state, tile, tileX, tileY);
    if (surfaceProfile.underlayKind) {
      return createUnderlayFloor(
        tileX,
        tileY,
        surfaceProfile.underlayKind,
        surfaceProfile.surfaceHeight
      );
    }

    const floorKind =
      tile.kind === 'road' && state.getCurrentContext().type === 'overworld'
        ? getRoadBedKind(state, tileX, tileY)
        : tile.kind;
    const material = getTileMaterial(
      floorKind,
      getTileVariantIndex(floorKind, tileX, tileY)
    );
    const surfaceHeight = surfaceProfile.surfaceHeight;
    const riverNeighbors = getAdjacentBoundaryNeighbors(state, tileX, tileY, {
      ...surfaceProfile,
      kind: floorKind,
    });

    if (!riverNeighbors || riverNeighbors.count === 0) {
      if (floorKind === 'ocean' || floorKind === 'river') {
        return createWaterFloorMesh(
          state,
          tileX,
          tileY,
          floorKind,
          surfaceHeight
        );
      }
      const floorThickness =
        floorKind === 'ocean' || floorKind === 'river'
          ? WATER_FLOOR_THICKNESS
          : FLOOR_THICKNESS;
      const floorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(TILE_SIZE, floorThickness, TILE_SIZE),
        material
      );
      floorMesh.position.set(
        tileX * TILE_SIZE,
        surfaceHeight - floorThickness * 0.5,
        tileY * TILE_SIZE
      );
      return floorMesh;
    }

    const riverEdgeHeight = Math.max(
      surfaceHeight - MAX_RIVER_CHAMFER_DROP,
      WATER_SURFACE_DROP
    );
    const oceanEdgeHeight = Math.max(
      surfaceHeight - MAX_OCEAN_CHAMFER_DROP,
      WATER_SURFACE_DROP + MIN_OCEAN_BANK_HEIGHT
    );
    const cornerHeights = {
      nw: surfaceHeight,
      ne: surfaceHeight,
      se: surfaceHeight,
      sw: surfaceHeight,
    };

    cornerHeights.nw = getCornerSurfaceHeight(
      surfaceHeight,
      riverEdgeHeight,
      oceanEdgeHeight,
      [riverNeighbors.north, riverNeighbors.west, riverNeighbors.northwest]
    );
    cornerHeights.ne = getCornerSurfaceHeight(
      surfaceHeight,
      riverEdgeHeight,
      oceanEdgeHeight,
      [riverNeighbors.north, riverNeighbors.east, riverNeighbors.northeast]
    );
    cornerHeights.se = getCornerSurfaceHeight(
      surfaceHeight,
      riverEdgeHeight,
      oceanEdgeHeight,
      [riverNeighbors.south, riverNeighbors.east, riverNeighbors.southeast]
    );
    cornerHeights.sw = getCornerSurfaceHeight(
      surfaceHeight,
      riverEdgeHeight,
      oceanEdgeHeight,
      [riverNeighbors.south, riverNeighbors.west, riverNeighbors.southwest]
    );

    const group = new THREE.Group();
    group.position.set(tileX * TILE_SIZE, 0, tileY * TILE_SIZE);

    const topGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -0.5,
      cornerHeights.nw,
      -0.5,
      0.5,
      cornerHeights.ne,
      -0.5,
      -0.5,
      cornerHeights.sw,
      0.5,
      0.5,
      cornerHeights.se,
      0.5,
    ]);
    const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
    topGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    topGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    topGeometry.setIndex([0, 2, 1, 2, 3, 1]);
    topGeometry.computeVertexNormals();
    group.add(new THREE.Mesh(topGeometry, material));

    const northWallHeight = getBoundaryWallHeight(
      riverNeighbors.north,
      riverEdgeHeight,
      oceanEdgeHeight
    );
    const eastWallHeight = getBoundaryWallHeight(
      riverNeighbors.east,
      riverEdgeHeight,
      oceanEdgeHeight
    );
    const southWallHeight = getBoundaryWallHeight(
      riverNeighbors.south,
      riverEdgeHeight,
      oceanEdgeHeight
    );
    const westWallHeight = getBoundaryWallHeight(
      riverNeighbors.west,
      riverEdgeHeight,
      oceanEdgeHeight
    );

    if (northWallHeight > 0.01) {
      addRiverEdgeWall(group, material, 'north', northWallHeight);
    }
    if (eastWallHeight > 0.01) {
      addRiverEdgeWall(group, material, 'east', eastWallHeight);
    }
    if (southWallHeight > 0.01) {
      addRiverEdgeWall(group, material, 'south', southWallHeight);
    }
    if (westWallHeight > 0.01) {
      addRiverEdgeWall(group, material, 'west', westWallHeight);
    }

    return group;
  }

  function createUnderlayFloor(tileX, tileY, kind, surfaceHeight) {
    if (kind === 'ocean' || kind === 'river') {
      return createWaterFloorMesh(
        null,
        tileX,
        tileY,
        kind,
        surfaceHeight
      );
    }
    const floorThickness =
      kind === 'ocean' || kind === 'river'
        ? WATER_FLOOR_THICKNESS
        : FLOOR_THICKNESS;
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE, floorThickness, TILE_SIZE),
      getTileMaterial(kind, getTileVariantIndex(kind, tileX, tileY))
    );
    floorMesh.position.set(
      tileX * TILE_SIZE,
      surfaceHeight - floorThickness * 0.5,
      tileY * TILE_SIZE
    );
    return floorMesh;
  }

  function createWaterFloorMesh(state, tileX, tileY, kind, surfaceHeight) {
    const material = getTileMaterial(kind, getTileVariantIndex(kind, tileX, tileY));
    const inset = getWaterBodyInset(state, tileX, tileY, kind);
    const width = Math.max(0.1, TILE_SIZE - inset.west - inset.east);
    const depth = Math.max(0.1, TILE_SIZE - inset.north - inset.south);
    const centerX = (inset.west - inset.east) * 0.5;
    const centerZ = (inset.north - inset.south) * 0.5;

    const group = new THREE.Group();
    group.position.set(tileX * TILE_SIZE, 0, tileY * TILE_SIZE);

    const surfaceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE),
      material
    );
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.y = surfaceHeight;
    group.add(surfaceMesh);

    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, WATER_FLOOR_THICKNESS, depth),
      material
    );
    bodyMesh.position.set(
      centerX,
      surfaceHeight - WATER_FLOOR_THICKNESS * 0.5,
      centerZ
    );
    group.add(bodyMesh);

    return group;
  }

  function getRoadBedKind(state, tileX, tileY) {
    const candidates = new Map();
    for (let y = tileY - 1; y <= tileY + 1; y += 1) {
      for (let x = tileX - 1; x <= tileX + 1; x += 1) {
        if (x === tileX && y === tileY) continue;
        const neighborTile = state.getCurrentTile(x, y);
        const kind = neighborTile.kind;
        if (getTraversalProfile(state, neighborTile, x, y).travelGroup) {
          continue;
        }
        const profile = getTileSurfaceProfile(state, neighborTile, x, y);
        if (profile.boundaryRole) continue;
        candidates.set(kind, (candidates.get(kind) ?? 0) + 1);
      }
    }

    return (
      [...candidates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'plains'
    );
  }

  function addRiverEdgeWall(group, material, edge, wallHeight) {
    const mesh =
      edge === 'north' || edge === 'south'
        ? new THREE.Mesh(
            new THREE.BoxGeometry(TILE_SIZE, wallHeight, RIVER_WALL_THICKNESS),
            material
          )
        : new THREE.Mesh(
            new THREE.BoxGeometry(RIVER_WALL_THICKNESS, wallHeight, TILE_SIZE),
            material
          );

    if (edge === 'north') {
      mesh.position.set(0, WATER_SURFACE_DROP + wallHeight * 0.5, -0.5);
    } else if (edge === 'east') {
      mesh.position.set(0.5, WATER_SURFACE_DROP + wallHeight * 0.5, 0);
    } else if (edge === 'south') {
      mesh.position.set(0, WATER_SURFACE_DROP + wallHeight * 0.5, 0.5);
    } else {
      mesh.position.set(-0.5, WATER_SURFACE_DROP + wallHeight * 0.5, 0);
    }

    group.add(mesh);
  }

  function getWaterBodyInset(state, tileX, tileY, kind) {
    if (!state) {
      return { north: 0, east: 0, south: 0, west: 0 };
    }

    if (kind === 'ocean') {
      return { north: 0, east: 0, south: 0, west: 0 };
    }

    return {
      north: shouldInsetWaterEdge(state, tileX, tileY - 1, kind)
        ? WATER_BODY_INSET
        : 0,
      east: shouldInsetWaterEdge(state, tileX + 1, tileY, kind)
        ? WATER_BODY_INSET
        : 0,
      south: shouldInsetWaterEdge(state, tileX, tileY + 1, kind)
        ? WATER_BODY_INSET
        : 0,
      west: shouldInsetWaterEdge(state, tileX - 1, tileY, kind)
        ? WATER_BODY_INSET
        : 0,
    };
  }

  function shouldInsetWaterEdge(state, tileX, tileY, kind) {
    const neighborTile = state.getCurrentTile(tileX, tileY);
    const profile = getTileSurfaceProfile(state, neighborTile, tileX, tileY);
    if (profile.underlayKind === 'ocean' || profile.underlayKind === 'river') {
      return false;
    }
    if (neighborTile.kind === 'bridge') {
      return false;
    }
    if (kind === 'ocean') {
      return neighborTile.kind !== 'ocean' && neighborTile.kind !== 'river';
    }
    return neighborTile.kind !== 'river' && neighborTile.kind !== 'ocean';
  }

  function getAdjacentBoundaryNeighbors(state, tileX, tileY, surfaceProfile) {
    if (!surfaceProfile.chamferEligible) {
      return null;
    }

    const neighbors = {
      north: getBoundaryRole(
        state,
        state.getCurrentTile(tileX, tileY - 1),
        tileX,
        tileY - 1
      ),
      northeast: getBoundaryRole(
        state,
        state.getCurrentTile(tileX + 1, tileY - 1),
        tileX + 1,
        tileY - 1
      ),
      east: getBoundaryRole(
        state,
        state.getCurrentTile(tileX + 1, tileY),
        tileX + 1,
        tileY
      ),
      southeast: getBoundaryRole(
        state,
        state.getCurrentTile(tileX + 1, tileY + 1),
        tileX + 1,
        tileY + 1
      ),
      south: getBoundaryRole(
        state,
        state.getCurrentTile(tileX, tileY + 1),
        tileX,
        tileY + 1
      ),
      southwest: getBoundaryRole(
        state,
        state.getCurrentTile(tileX - 1, tileY + 1),
        tileX - 1,
        tileY + 1
      ),
      west: getBoundaryRole(
        state,
        state.getCurrentTile(tileX - 1, tileY),
        tileX - 1,
        tileY
      ),
      northwest: getBoundaryRole(
        state,
        state.getCurrentTile(tileX - 1, tileY - 1),
        tileX - 1,
        tileY - 1
      ),
      count: 0,
    };
    neighbors.count =
      Number(neighbors.north) +
      Number(neighbors.northeast) +
      Number(neighbors.east) +
      Number(neighbors.southeast) +
      Number(neighbors.south) +
      Number(neighbors.southwest) +
      Number(neighbors.west) +
      Number(neighbors.northwest);
    return neighbors;
  }

  function getBoundaryRole(
    state,
    tile,
    tileX,
    tileY
  ): SurfaceBoundaryRole3D | null {
    return getTileSurfaceProfile(state, tile, tileX, tileY).boundaryRole;
  }

  function getCornerSurfaceHeight(
    surfaceHeight,
    riverEdgeHeight,
    oceanEdgeHeight,
    boundaries
  ) {
    if (boundaries.includes('sea')) {
      return oceanEdgeHeight;
    }
    if (boundaries.some(Boolean)) {
      return riverEdgeHeight;
    }
    return surfaceHeight;
  }

  function getBoundaryWallHeight(kind, riverEdgeHeight, oceanEdgeHeight) {
    if (kind === 'sea') {
      return oceanEdgeHeight - WATER_SURFACE_DROP;
    }
    if (kind === 'channel' || kind === 'crossing') {
      return riverEdgeHeight - WATER_SURFACE_DROP;
    }
    return 0;
  }

  function createMountainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    context.fillStyle = MOUNTAIN_BASE_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < canvas.height; row += 4) {
      const shade = 90 + ((row * 7) % 55);
      context.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 12})`;
      context.fillRect(0, row, canvas.width, 2);
    }

    for (let index = 0; index < 180; index += 1) {
      const x = Math.floor(
        hash2D('mountain-texture-x', index, 0) * canvas.width
      );
      const y = Math.floor(
        hash2D('mountain-texture-y', index, 0) * canvas.height
      );
      const length = 2 + Math.floor(hash2D('mountain-texture-l', index, 0) * 6);
      const brightness =
        110 + Math.floor(hash2D('mountain-texture-b', index, 0) * 70);
      context.fillStyle = `rgba(${brightness}, ${brightness + 4}, ${brightness + 10}, 0.35)`;
      context.fillRect(x, y, length, 1);
    }

    for (let index = 0; index < 120; index += 1) {
      const x = Math.floor(hash2D('mountain-crack-x', index, 0) * canvas.width);
      const y = Math.floor(
        hash2D('mountain-crack-y', index, 0) * canvas.height
      );
      const depth = 1 + Math.floor(hash2D('mountain-crack-l', index, 0) * 4);
      context.fillStyle = 'rgba(39, 48, 58, 0.32)';
      context.fillRect(x, y, 1, depth);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.4, 1.4);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  return {
    canOccupy,
    render,
    resize,
  };
}

function getTileDefinitionFromRegistry(kind) {
  return getActivePluginRegistry().resolveTileDefinition(
    kind,
    FALLBACK_TILE_DEFINITION
  );
}
