import * as THREE from 'three';
import {
  getTileAtlasCanvas,
  getTilePixelSize,
  getTileSpriteRect,
  getTileVariantIndex,
} from '@bworlds/atlas';
import {
  getDaylightCycleState,
  hash2D,
  smoothstep,
} from '@bworlds/core';
import { isWaterKind } from '@bworlds/tile-support';
import {
  getActivePluginRegistry,
  type WorldEnvironmentLike,
  type SurfaceBoundaryRole3D,
} from '@bworlds/plugin-api';

const TILE_SIZE = 1;
const CHUNK_RADIUS = 18;
const FLOOR_THICKNESS = 0.03;
const WATER_FLOOR_THICKNESS = 0.28;
const RIVER_WALL_THICKNESS = 0.05;
const SKY_RADIUS = 58;
const SHADOW_CAMERA_RADIUS = 18;
const SKY_DAY_COLOR = '#9ed8ff';
const SKY_SUNSET_COLOR = '#f08b64';
const SKY_NIGHT_COLOR = '#06111f';
const FOG_DAY_COLOR = '#9ed8ff';
const FOG_NIGHT_COLOR = '#0a1524';
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_DAY_COLOR);
  scene.fog = new THREE.Fog(FOG_DAY_COLOR, 12, 34);

  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 120);
  camera.rotation.order = 'YXZ';

  const ambientLight = new THREE.HemisphereLight('#eaf6ff', '#28442f', 1.35);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight('#fff3cf', 1.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.bias = -0.00018;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -SHADOW_CAMERA_RADIUS;
  sunLight.shadow.camera.right = SHADOW_CAMERA_RADIUS;
  sunLight.shadow.camera.top = SHADOW_CAMERA_RADIUS;
  sunLight.shadow.camera.bottom = -SHADOW_CAMERA_RADIUS;
  scene.add(sunLight);
  const sunTarget = new THREE.Object3D();
  scene.add(sunTarget);
  sunLight.target = sunTarget;

  const moonLight = new THREE.DirectionalLight('#9ec5ff', 0.16);
  scene.add(moonLight);
  const moonTarget = new THREE.Object3D();
  scene.add(moonTarget);
  moonLight.target = moonTarget;

  const skyRoot = new THREE.Group();
  scene.add(skyRoot);

  const stars = createStarField();
  skyRoot.add(stars);

  const constellationRoot = new THREE.Group();
  skyRoot.add(constellationRoot);

  const eventRoot = new THREE.Group();
  skyRoot.add(eventRoot);

  const sunSprite = createSunSprite();
  skyRoot.add(sunSprite);

  const moonSprite = createMoonSprite();
  skyRoot.add(moonSprite);

  const worldRoot = new THREE.Group();
  scene.add(worldRoot);

  const atlasTexture = new THREE.CanvasTexture(getTileAtlasCanvas());
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  atlasTexture.magFilter = THREE.NearestFilter;
  atlasTexture.minFilter = THREE.NearestFilter;
  atlasTexture.generateMipmaps = false;

  const materialCache = new Map();
  const visibleTileNodes = new Map();
  const backgroundColor = new THREE.Color(SKY_DAY_COLOR);
  const twilightColor = new THREE.Color(SKY_SUNSET_COLOR);
  const nightColor = new THREE.Color(SKY_NIGHT_COLOR);
  const fogDayColor = new THREE.Color(FOG_DAY_COLOR);
  const fogNightColor = new THREE.Color(FOG_NIGHT_COLOR);
  let lastMoonPhaseIndex = -1;
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
    });

    if (pluginModel) {
      applyShadowSettings(pluginModel, {
        castShadow: true,
        receiveShadow: true,
      });
      tileNode.add(pluginModel);
    } else if (!isWaterKind(tile.kind) && definition.wallHeight > 0.08) {
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
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
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
      timeMs?: number;
      environment?: WorldEnvironmentLike;
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

    updateSkyAndLights(
      state.player.x * TILE_SIZE,
      state.player.y * TILE_SIZE,
      options.timeMs ?? performance.now(),
      options.environment ?? {}
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
      boundaryTransition: pluginProfile.boundaryTransition ?? null,
    };
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
      getActivePluginRegistry().resolveFloorKind3D({
        state,
        tile,
        tileX,
        tileY,
      }) ?? tile.kind;
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
      if (isWaterKind(floorKind)) {
        return createWaterFloorMesh(
          state,
          tileX,
          tileY,
          floorKind,
          surfaceHeight
        );
      }
      const floorThickness =
        isWaterKind(floorKind)
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
      floorMesh.receiveShadow = true;
      return floorMesh;
    }

    const cornerHeights = {
      nw: surfaceHeight,
      ne: surfaceHeight,
      se: surfaceHeight,
      sw: surfaceHeight,
    };

    cornerHeights.nw = getCornerSurfaceHeight(
      surfaceHeight,
      [riverNeighbors.north, riverNeighbors.west, riverNeighbors.northwest]
    );
    cornerHeights.ne = getCornerSurfaceHeight(
      surfaceHeight,
      [riverNeighbors.north, riverNeighbors.east, riverNeighbors.northeast]
    );
    cornerHeights.se = getCornerSurfaceHeight(
      surfaceHeight,
      [riverNeighbors.south, riverNeighbors.east, riverNeighbors.southeast]
    );
    cornerHeights.sw = getCornerSurfaceHeight(
      surfaceHeight,
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
    const topMesh = new THREE.Mesh(topGeometry, material);
    topMesh.receiveShadow = true;
    group.add(topMesh);

    const northWallHeight = getBoundaryWallHeight(
      surfaceHeight,
      riverNeighbors.north
    );
    const eastWallHeight = getBoundaryWallHeight(
      surfaceHeight,
      riverNeighbors.east
    );
    const southWallHeight = getBoundaryWallHeight(
      surfaceHeight,
      riverNeighbors.south
    );
    const westWallHeight = getBoundaryWallHeight(
      surfaceHeight,
      riverNeighbors.west
    );

    if (northWallHeight > 0.01) {
      addRiverEdgeWall(
        group,
        material,
        'north',
        northWallHeight,
        riverNeighbors.north.surfaceHeight
      );
    }
    if (eastWallHeight > 0.01) {
      addRiverEdgeWall(
        group,
        material,
        'east',
        eastWallHeight,
        riverNeighbors.east.surfaceHeight
      );
    }
    if (southWallHeight > 0.01) {
      addRiverEdgeWall(
        group,
        material,
        'south',
        southWallHeight,
        riverNeighbors.south.surfaceHeight
      );
    }
    if (westWallHeight > 0.01) {
      addRiverEdgeWall(
        group,
        material,
        'west',
        westWallHeight,
        riverNeighbors.west.surfaceHeight
      );
    }

    return group;
  }

  function createUnderlayFloor(tileX, tileY, kind, surfaceHeight) {
    if (isWaterKind(kind)) {
      return createWaterFloorMesh(
        null,
        tileX,
        tileY,
        kind,
        surfaceHeight
      );
    }
    const floorThickness =
      isWaterKind(kind)
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
    floorMesh.receiveShadow = true;
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
    surfaceMesh.receiveShadow = true;
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
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    return group;
  }

  function addRiverEdgeWall(group, material, edge, wallHeight, baseHeight) {
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
      mesh.position.set(0, baseHeight + wallHeight * 0.5, -0.5);
    } else if (edge === 'east') {
      mesh.position.set(0.5, baseHeight + wallHeight * 0.5, 0);
    } else if (edge === 'south') {
      mesh.position.set(0, baseHeight + wallHeight * 0.5, 0.5);
    } else {
      mesh.position.set(-0.5, baseHeight + wallHeight * 0.5, 0);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  function getWaterBodyInset(state, tileX, tileY, kind) {
    if (!state) {
      return { north: 0, east: 0, south: 0, west: 0 };
    }

    if (kind === 'ocean') {
      return { north: 0, east: 0, south: 0, west: 0 };
    }

    const tile = state.getCurrentTile(tileX, tileY);
    const profile = getTileSurfaceProfile(state, tile, tileX, tileY);
    const insetAmount = profile.boundaryTransition?.bodyInset ?? 0;

    return {
      north: shouldInsetWaterEdge(state, tileX, tileY - 1, kind)
        ? insetAmount
        : 0,
      east: shouldInsetWaterEdge(state, tileX + 1, tileY, kind)
        ? insetAmount
        : 0,
      south: shouldInsetWaterEdge(state, tileX, tileY + 1, kind)
        ? insetAmount
        : 0,
      west: shouldInsetWaterEdge(state, tileX - 1, tileY, kind)
        ? insetAmount
        : 0,
    };
  }

  function shouldInsetWaterEdge(state, tileX, tileY, kind) {
    const neighborTile = state.getCurrentTile(tileX, tileY);
    const profile = getTileSurfaceProfile(state, neighborTile, tileX, tileY);
    if (profile.underlayKind && isWaterKind(profile.underlayKind)) {
      return false;
    }
    if (neighborTile.kind === 'bridge') {
      return false;
    }
    if (kind === 'ocean') {
      return !isWaterKind(neighborTile.kind);
    }
    return !isWaterKind(neighborTile.kind);
  }

  function getAdjacentBoundaryNeighbors(state, tileX, tileY, surfaceProfile) {
    if (!surfaceProfile.chamferEligible) {
      return null;
    }

    const neighbors = {
      north: getBoundaryProfile(
        state,
        state.getCurrentTile(tileX, tileY - 1),
        tileX,
        tileY - 1
      ),
      northeast: getBoundaryProfile(
        state,
        state.getCurrentTile(tileX + 1, tileY - 1),
        tileX + 1,
        tileY - 1
      ),
      east: getBoundaryProfile(
        state,
        state.getCurrentTile(tileX + 1, tileY),
        tileX + 1,
        tileY
      ),
      southeast: getBoundaryProfile(
        state,
        state.getCurrentTile(tileX + 1, tileY + 1),
        tileX + 1,
        tileY + 1
      ),
      south: getBoundaryProfile(
        state,
        state.getCurrentTile(tileX, tileY + 1),
        tileX,
        tileY + 1
      ),
      southwest: getBoundaryProfile(
        state,
        state.getCurrentTile(tileX - 1, tileY + 1),
        tileX - 1,
        tileY + 1
      ),
      west: getBoundaryProfile(
        state,
        state.getCurrentTile(tileX - 1, tileY),
        tileX - 1,
        tileY
      ),
      northwest: getBoundaryProfile(
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

  function getBoundaryProfile(
    state,
    tile,
    tileX,
    tileY
  ) {
    const profile = getTileSurfaceProfile(state, tile, tileX, tileY);
    return profile.boundaryRole ? profile : null;
  }

  function getCornerSurfaceHeight(surfaceHeight, boundaries) {
    const boundary = pickCornerBoundaryProfile(boundaries);
    if (boundary) {
      return getBoundaryEdgeHeight(surfaceHeight, boundary);
    }
    return surfaceHeight;
  }

  function getBoundaryWallHeight(surfaceHeight, boundaryProfile) {
    if (!boundaryProfile) {
      return 0;
    }
    return getBoundaryEdgeHeight(surfaceHeight, boundaryProfile) - boundaryProfile.surfaceHeight;
  }

  function getBoundaryEdgeHeight(surfaceHeight, boundaryProfile) {
    const transition = boundaryProfile.boundaryTransition ?? {};
    const maxChamferDrop = transition.maxChamferDrop ?? 0;
    const minBankHeight = transition.minBankHeight ?? 0;
    return Math.max(
      surfaceHeight - maxChamferDrop,
      boundaryProfile.surfaceHeight + minBankHeight
    );
  }

  function pickCornerBoundaryProfile(boundaries) {
    return boundaries
      .filter(Boolean)
      .sort(
        (left, right) =>
          getBoundaryPriority(left.boundaryRole) -
          getBoundaryPriority(right.boundaryRole)
      )[0] ?? null;
  }

  function getBoundaryPriority(boundaryRole: SurfaceBoundaryRole3D | null) {
    if (boundaryRole === 'sea') {
      return 0;
    }
    if (boundaryRole === 'channel' || boundaryRole === 'crossing') {
      return 1;
    }
    return 2;
  }

  function updateSkyAndLights(worldX, worldY, timeMs, environment) {
    const cycle = getDaylightCycleState(timeMs, environment.cycle ?? {});
    const dayBlend = cycle.daylight;
    const twilightBlend = Math.max(0, 1 - Math.abs(cycle.daylight - 0.5) * 2);
    const sky = environment.sky ?? {};
    const lighting = environment.lighting ?? {};
    const starDensity = environment.stars?.density ?? 1;
    const daySkyColor = new THREE.Color(sky.dayColor ?? SKY_DAY_COLOR);
    const sunsetSkyColor = new THREE.Color(sky.sunsetColor ?? SKY_SUNSET_COLOR);
    const nightSkyColor = new THREE.Color(sky.nightColor ?? SKY_NIGHT_COLOR);
    const dayFogColor = new THREE.Color(sky.fogDayColor ?? FOG_DAY_COLOR);
    const nightFogColor = new THREE.Color(sky.fogNightColor ?? FOG_NIGHT_COLOR);

    scene.background
      .copy(nightSkyColor)
      .lerp(sunsetSkyColor, cycle.twilight)
      .lerp(daySkyColor, dayBlend);
    scene.fog.color.copy(nightFogColor).lerp(dayFogColor, cycle.twilight);

    ambientLight.intensity = 0.2 + cycle.twilight * 0.75 + dayBlend * 0.45;
    ambientLight.color
      .set(lighting.ambientNightColor ?? '#9fc4ff')
      .lerp(new THREE.Color(lighting.ambientDayColor ?? '#eaf6ff'), dayBlend);
    ambientLight.groundColor
      .set(lighting.groundNightColor ?? '#101826')
      .lerp(
        new THREE.Color(lighting.groundDayColor ?? '#28442f'),
        0.35 + dayBlend * 0.65
      );

    const sunHeight = Math.max(-0.2, cycle.sunAltitude);
    const sunDistance = 18;
    const sunOrbitX = Math.cos(cycle.sunAzimuth) * sunDistance;
    const sunOrbitY = 5 + Math.max(0, sunHeight) * 18;
    const sunOrbitZ = Math.sin(cycle.sunAzimuth) * sunDistance * 0.65;
    sunLight.position.set(worldX - sunOrbitX, sunOrbitY, worldY - sunOrbitZ);
    sunTarget.position.set(worldX, 0, worldY);
    sunLight.intensity = dayBlend * 1.75 + twilightBlend * 0.25;
    sunLight.color
      .set('#ffb06e')
      .lerp(
        new THREE.Color(lighting.sunColor ?? '#fff3cf'),
        Math.min(1, dayBlend + 0.2)
      );

    const shadowStrength = Math.max(0, cycle.daylight - 0.12);
    sunLight.castShadow =
      shadowStrength * (lighting.shadowStrength ?? 1) > 0.08;

    const moonDistance = 22;
    const moonOrbitX = Math.cos(cycle.moonAzimuth) * moonDistance;
    const moonOrbitY = 6 + Math.max(0, cycle.moonAltitude) * 12;
    const moonOrbitZ = Math.sin(cycle.moonAzimuth) * moonDistance * 0.7;
    moonLight.position.set(worldX - moonOrbitX, moonOrbitY, worldY - moonOrbitZ);
    moonTarget.position.set(worldX, 0, worldY);
    moonLight.color.set(lighting.moonColor ?? '#9ec5ff');
    moonLight.intensity = cycle.night * (0.1 + cycle.moonIllumination * 0.24);

    skyRoot.position.set(worldX, 0, worldY);
    skyRoot.rotation.z = (-cycle.observerLatitudeDegrees / 180) * Math.PI * 0.5;
    syncStarField(stars, cycle, starDensity);
    syncConstellationSky(constellationRoot, cycle);
    syncCelestialEvents(eventRoot, cycle);
    constellationRoot.visible = cycle.starsOpacity > 0.02;
    eventRoot.visible = cycle.starsOpacity > 0.05;

    sunSprite.position.set(
      sunOrbitX * 1.45,
      14 + Math.max(-0.12, cycle.sunAltitude) * 15,
      sunOrbitZ * 1.45
    );
    sunSprite.material.opacity = Math.max(
      0,
      Math.min(0.92, cycle.twilight * 0.72 + dayBlend * 0.32)
    );
    sunSprite.visible = sunSprite.material.opacity > 0.03;

    moonSprite.position.set(moonOrbitX * 1.7, 16 + Math.max(0, cycle.moonAltitude) * 14, moonOrbitZ * 1.7);
    moonSprite.material.opacity =
      Math.max(
        0,
        (cycle.night * 0.82 + (cycle.moonAltitude > -0.08 ? 0.16 : 0)) *
          (0.22 + cycle.moonIllumination * 0.78)
      );
    moonSprite.visible = moonSprite.material.opacity > 0.03;

    if (lastMoonPhaseIndex !== cycle.moonPhaseIndex) {
      updateMoonPhaseTexture(
        moonSprite.material.map,
        cycle.moonPhaseIndex,
        cycle.moonIllumination
      );
      moonSprite.material.map.needsUpdate = true;
      lastMoonPhaseIndex = cycle.moonPhaseIndex;
    }
  }

  return {
    canOccupy,
    render,
    resize,
  };
}

function applyShadowSettings(node, options) {
  node.traverse?.((child) => {
    if (child && child.isMesh) {
      child.castShadow = options.castShadow;
      child.receiveShadow = options.receiveShadow;
    }
  });
}

function createStarField() {
  const root = new THREE.Group();

  for (let index = 0; index < 360; index += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: '#eef6ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        fog: false,
      })
    );
    sprite.userData = {
      theta: hash2D('star-theta', index, 0) * Math.PI * 2,
      phi: hash2D('star-phi', 0, index) * Math.PI * 0.88 + 0.16,
      radius: SKY_RADIUS + hash2D('star-radius', index, index) * 4,
      brightness: 0.25 + hash2D('star-brightness', index, 3) * 0.75,
      scale: 0.14 + hash2D('star-scale', 7, index) * 0.46,
    };
    root.add(sprite);
  }

  return root;
}

function syncStarField(root, cycle, starDensity) {
  const seasonalRotation = cycle.yearProgress * Math.PI * 2;
  root.children.forEach((child, index) => {
    if (!(child instanceof THREE.Sprite)) {
      return;
    }
    const theta =
      child.userData.theta +
      seasonalRotation +
      hash2D('star-drift', index, cycle.activeConstellationIndex ?? 0) * 0.08;
    const position = createSkyPosition(theta, child.userData.phi, child.userData.radius);
    child.position.copy(position);

    const horizonFade = smoothstep(-1.8, 5.4, position.y);
    const opacity =
      cycle.starsOpacity *
      child.userData.brightness *
      horizonFade *
      Math.max(0.72, Math.min(1.6, starDensity));
    child.material.opacity = opacity;
    child.visible = opacity > 0.015;
    const scale = child.userData.scale * Math.max(0.75, Math.min(1.8, starDensity));
    child.scale.set(scale, scale, 1);
  });
}

function syncConstellationSky(root, cycle) {
  root.clear();
  const constellations = cycle.constellations ?? [];
  if (constellations.length === 0) {
    return;
  }

  const activeIndex = cycle.activeConstellationIndex ?? 0;
  const focusIndices = [
    (activeIndex + constellations.length - 1) % constellations.length,
    activeIndex,
    (activeIndex + 1) % constellations.length,
  ];

  focusIndices.forEach((constellationIndex, slotIndex) => {
    const constellation = constellations[constellationIndex];
    const slotTheta =
      cycle.sunriseAzimuth +
      (slotIndex - 1) * 0.82 +
      (cycle.dayProgress - cycle.sunriseProgress) * 0.16;
    const slotPhi = 1.18 + (slotIndex - 1) * 0.08;
    const anchor = createSkyPosition(slotTheta, slotPhi, SKY_RADIUS - 4);

    constellation.connections.forEach(([startIndex, endIndex]) => {
      const start = constellation.stars[startIndex];
      const end = constellation.stars[endIndex];
      if (!start || !end) {
        return;
      }
      const geometry = new THREE.BufferGeometry().setFromPoints([
        createConstellationPoint(anchor, start),
        createConstellationPoint(anchor, end),
      ]);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: '#b9d4ff',
          transparent: true,
          opacity: 0.18 + cycle.starsOpacity * 0.34,
          depthTest: true,
        })
      );
      const horizonFade = smoothstep(
        -1.6,
        5.8,
        Math.min(
          createConstellationPoint(anchor, start).y,
          createConstellationPoint(anchor, end).y
        )
      );
      line.material.opacity *= horizonFade;
      line.visible = line.material.opacity > 0.015;
      root.add(line);
    });

    constellation.stars.forEach((star) => {
      const point = createConstellationPoint(anchor, star);
      const horizonFade = smoothstep(-1.6, 5.8, point.y);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          color: '#f5fbff',
          transparent: true,
          opacity:
            (0.28 + star.brightness * cycle.starsOpacity * 0.56) * horizonFade,
          depthWrite: false,
          depthTest: true,
        })
      );
      sprite.position.copy(point);
      const scale = 0.34 + star.brightness * 0.34;
      sprite.scale.set(scale, scale, 1);
      sprite.visible = sprite.material.opacity > 0.015;
      root.add(sprite);
    });
  });
}

function createConstellationPoint(anchor, star) {
  return new THREE.Vector3(
    anchor.x + (star.x - 0.5) * 10,
    anchor.y + (0.5 - star.y) * 6,
    anchor.z
  );
}

function createSkyPosition(theta, phi, radius) {
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    Math.cos(theta) * sinPhi * radius,
    Math.cos(phi) * radius,
    Math.sin(theta) * sinPhi * radius
  );
}

function syncCelestialEvents(root, cycle) {
  root.clear();
  const events = cycle.visibleEvents ?? [];
  events.forEach((event, index) => {
    const theta = cycle.yearProgress * Math.PI * 2 + index * 0.42 - 0.6;
    const phi = 0.42 + (index % 3) * 0.06;
    const position = createSkyPosition(theta, phi, SKY_RADIUS - 6);

    if (event.type === 'meteor-shower') {
      for (let streak = 0; streak < 3; streak += 1) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          position.clone().add(new THREE.Vector3(streak * 0.3, streak * 0.12, 0)),
          position.clone().add(new THREE.Vector3(1.4 + streak * 0.3, -0.5 + streak * 0.12, 0)),
        ]);
        root.add(
          new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({
              color: '#eef6ff',
              transparent: true,
              opacity: 0.26 + event.intensity * 0.32,
              depthTest: true,
            })
          )
        );
      }
      return;
    }

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: event.type === 'planet' ? '#ffd7a6' : '#d8f5ff',
        transparent: true,
        opacity: 0.34 + event.intensity * 0.42,
        depthWrite: false,
        depthTest: true,
      })
    );
    sprite.position.copy(position);
    const scale = event.type === 'planet' ? 0.72 : 0.48;
    sprite.scale.set(scale, scale, 1);
    sprite.material.opacity *= smoothstep(-1.4, 6, position.y);
    sprite.visible = sprite.material.opacity > 0.015;
    root.add(sprite);

    if (event.type === 'comet') {
      const tail = new THREE.BufferGeometry().setFromPoints([
        position.clone().add(new THREE.Vector3(-1.2, -0.2, 0)),
        position.clone(),
      ]);
      root.add(
        new THREE.Line(
          tail,
          new THREE.LineBasicMaterial({
            color: '#d8f5ff',
            transparent: true,
            opacity: 0.24 + event.intensity * 0.3,
            depthTest: true,
          })
        )
      );
    }
  });
}

function createMoonSprite() {
  const texture = new THREE.CanvasTexture(buildMoonPhaseCanvas(4, 1));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0,
    color: '#ffffff',
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.2, 3.2, 1);
  return sprite;
}

function createSunSprite() {
  const texture = new THREE.CanvasTexture(buildSunCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0,
    color: '#ffffff',
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.4, 4.4, 1);
  return sprite;
}

function buildSunCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create sun canvas.');
  }
  const center = canvas.width / 2;
  const glow = context.createRadialGradient(center, center, 4, center, center, 54);
  glow.addColorStop(0, 'rgba(255, 247, 200, 1)');
  glow.addColorStop(0.25, 'rgba(255, 217, 125, 0.96)');
  glow.addColorStop(0.55, 'rgba(255, 176, 88, 0.45)');
  glow.addColorStop(1, 'rgba(255, 176, 88, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(center, center, 54, 0, Math.PI * 2);
  context.fill();
  return canvas;
}

function updateMoonPhaseTexture(texture, phaseIndex, illumination) {
  const canvas = texture.image;
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const phaseDirection = phaseIndex < 4 ? 1 : -1;
  paintMoonPhaseCanvas(context, canvas, illumination, phaseDirection);
}

function buildMoonPhaseCanvas(phaseIndex, illumination) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create moon phase canvas.');
  }
  const phaseDirection = phaseIndex < 4 ? 1 : -1;
  paintMoonPhaseCanvas(context, canvas, illumination, phaseDirection);
  return canvas;
}

function paintMoonPhaseCanvas(context, canvas, illumination, phaseDirection) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  const center = canvas.width / 2;
  const radius = canvas.width * 0.34;

  context.fillStyle = 'rgba(170, 196, 255, 0.18)';
  context.beginPath();
  context.arc(center, center, radius * 1.18, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#f6f6fb';
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fill();

  const shadowWidth = radius * 2 * (1 - illumination);
  if (shadowWidth > 0.001) {
    context.save();
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = '#1a2230';
    context.beginPath();
    context.ellipse(
      center + phaseDirection * shadowWidth * 0.5,
      center,
      radius * (1 - illumination * 0.65),
      radius,
      0,
      0,
      Math.PI * 2
    );
    context.fill();
    context.restore();
  }
}

function getTileDefinitionFromRegistry(kind) {
  return getActivePluginRegistry().resolveTileDefinition(
    kind,
    FALLBACK_TILE_DEFINITION
  );
}
