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
const TREE_REGION_SIZE = 14;
const TREE_CLUSTER_SIZE = 4;
const SIGN_REGION_SIZE = 10;
const TOWN_REGION_SIZE = 18;
const BRIDGE_REGION_SIZE = 22;
const ROAD_REGION_SIZE = 20;
const MOUNTAIN_BASE_COLOR = '#6b7280';
const RIVER_SURFACE_DROP = -0.12;
const MAX_RIVER_CHAMFER_DROP = 0.08;
const RIVER_WALL_THICKNESS = 0.05;
const BRIDGE_DECK_THICKNESS = 0.08;
const BRIDGE_RAIL_HEIGHT = 0.18;
const ROAD_SURFACE_HEIGHT = 0.012;
const ROAD_CORE_HEIGHT = 0.02;

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
  const treeStyleCache = new Map();
  const signStyleCache = new Map();
  const signLabelCache = new Map();
  const townStyleCache = new Map();
  const townDescriptorCache = new Map();
  const bridgeStyleCache = new Map();
  const bridgeClusterCache = new Map();
  const roadStyleCache = new Map();
  const mountainTexture = createMountainTexture();
  const treeGeometry = {
    trunk: new THREE.CylinderGeometry(0.075, 0.1, 1, 6),
    branch: new THREE.CylinderGeometry(0.028, 0.045, 0.45, 5),
    foliage: new THREE.SphereGeometry(0.34, 6, 6),
  };
  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: '#dbe4ea',
    map: mountainTexture,
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true,
  });
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
    bridgeClusterCache.clear();
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
        const surfaceHeight = getTileSurfaceHeight(tile.kind);
        worldRoot.add(createFloorMesh(state, tile, x, y, variant));

        if (tile.kind === 'forest') {
          const treeGroup = createForestTileGroup(x, y);
          worldRoot.add(treeGroup);
        } else if (tile.kind === 'road' && context.type === 'overworld') {
          worldRoot.add(createRoadGroup(state, x, y));
        } else if (tile.kind === 'bridge') {
          worldRoot.add(createBridgeGroup(state, x, y));
        } else if (tile.kind === 'mountain') {
          worldRoot.add(createMountainGroup(state, x, y));
        } else if (tile.kind === 'cave') {
          worldRoot.add(createCaveGroup(state, x, y));
        } else if (tile.kind === 'town') {
          worldRoot.add(createTownGroup(tile, x, y));
        } else if (tile.kind === 'sign') {
          worldRoot.add(createSignGroup(state, x, y));
        } else if (definition.wallHeight > 0.08) {
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

  function getTileSurfaceHeight(kind) {
    if (kind === 'river') {
      return RIVER_SURFACE_DROP;
    }

    return 0;
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
    if (tile.kind === 'bridge') {
      return createBridgeWaterFloor(tileX, tileY);
    }

    const floorKind =
      tile.kind === 'road' && state.getCurrentContext().type === 'overworld'
        ? getRoadBedKind(state, tileX, tileY)
        : tile.kind;
    const material = getTileMaterial(
      floorKind,
      getTileVariantIndex(floorKind, tileX, tileY)
    );
    const surfaceHeight = getTileSurfaceHeight(floorKind);
    const riverNeighbors = getAdjacentRiverNeighbors(
      state,
      tileX,
      tileY,
      floorKind
    );

    if (!riverNeighbors || riverNeighbors.count === 0) {
      const floorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(TILE_SIZE, FLOOR_THICKNESS, TILE_SIZE),
        material
      );
      floorMesh.position.set(
        tileX * TILE_SIZE,
        surfaceHeight - FLOOR_THICKNESS * 0.5,
        tileY * TILE_SIZE
      );
      return floorMesh;
    }

    const edgeHeight = Math.max(
      surfaceHeight - MAX_RIVER_CHAMFER_DROP,
      RIVER_SURFACE_DROP
    );
    const cornerHeights = {
      nw: surfaceHeight,
      ne: surfaceHeight,
      se: surfaceHeight,
      sw: surfaceHeight,
    };

    if (
      riverNeighbors.north ||
      riverNeighbors.west ||
      riverNeighbors.northwest
    ) {
      cornerHeights.nw = edgeHeight;
    }
    if (
      riverNeighbors.north ||
      riverNeighbors.east ||
      riverNeighbors.northeast
    ) {
      cornerHeights.ne = edgeHeight;
    }
    if (
      riverNeighbors.south ||
      riverNeighbors.east ||
      riverNeighbors.southeast
    ) {
      cornerHeights.se = edgeHeight;
    }
    if (
      riverNeighbors.south ||
      riverNeighbors.west ||
      riverNeighbors.southwest
    ) {
      cornerHeights.sw = edgeHeight;
    }

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

    const wallHeight = edgeHeight - RIVER_SURFACE_DROP;
    if (wallHeight > 0.01) {
      if (riverNeighbors.north) {
        addRiverEdgeWall(group, material, 'north', wallHeight);
      }
      if (riverNeighbors.east) {
        addRiverEdgeWall(group, material, 'east', wallHeight);
      }
      if (riverNeighbors.south) {
        addRiverEdgeWall(group, material, 'south', wallHeight);
      }
      if (riverNeighbors.west) {
        addRiverEdgeWall(group, material, 'west', wallHeight);
      }
    }

    return group;
  }

  function createBridgeWaterFloor(tileX, tileY) {
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE, FLOOR_THICKNESS, TILE_SIZE),
      getTileMaterial('river', getTileVariantIndex('river', tileX, tileY))
    );
    floorMesh.position.set(
      tileX * TILE_SIZE,
      RIVER_SURFACE_DROP - FLOOR_THICKNESS * 0.5,
      tileY * TILE_SIZE
    );
    return floorMesh;
  }

  function getRoadBedKind(state, tileX, tileY) {
    const candidates = new Map();
    for (let y = tileY - 1; y <= tileY + 1; y += 1) {
      for (let x = tileX - 1; x <= tileX + 1; x += 1) {
        if (x === tileX && y === tileY) continue;
        const kind = state.getCurrentTile(x, y).kind;
        if (
          kind === 'road' ||
          kind === 'bridge' ||
          kind === 'town' ||
          kind === 'sign'
        ) {
          continue;
        }
        if (kind === 'ocean' || kind === 'river') continue;
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
      mesh.position.set(0, RIVER_SURFACE_DROP + wallHeight * 0.5, -0.5);
    } else if (edge === 'east') {
      mesh.position.set(0.5, RIVER_SURFACE_DROP + wallHeight * 0.5, 0);
    } else if (edge === 'south') {
      mesh.position.set(0, RIVER_SURFACE_DROP + wallHeight * 0.5, 0.5);
    } else {
      mesh.position.set(-0.5, RIVER_SURFACE_DROP + wallHeight * 0.5, 0);
    }

    group.add(mesh);
  }

  function getAdjacentRiverNeighbors(state, tileX, tileY, kind) {
    if (!isRiverChamferTile(kind)) {
      return null;
    }

    const neighbors = {
      north: isWaterBoundaryKind(state.getCurrentTile(tileX, tileY - 1).kind),
      northeast: isWaterBoundaryKind(
        state.getCurrentTile(tileX + 1, tileY - 1).kind
      ),
      east: isWaterBoundaryKind(state.getCurrentTile(tileX + 1, tileY).kind),
      southeast: isWaterBoundaryKind(
        state.getCurrentTile(tileX + 1, tileY + 1).kind
      ),
      south: isWaterBoundaryKind(state.getCurrentTile(tileX, tileY + 1).kind),
      southwest: isWaterBoundaryKind(
        state.getCurrentTile(tileX - 1, tileY + 1).kind
      ),
      west: isWaterBoundaryKind(state.getCurrentTile(tileX - 1, tileY).kind),
      northwest: isWaterBoundaryKind(
        state.getCurrentTile(tileX - 1, tileY - 1).kind
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

  function isRiverChamferTile(kind) {
    return (
      kind !== 'river' &&
      kind !== 'ocean' &&
      kind !== 'bridge' &&
      getTileSurfaceHeight(kind) >= 0
    );
  }

  function isWaterBoundaryKind(kind) {
    return kind === 'river' || kind === 'bridge';
  }

  function createRoadGroup(state, tileX, tileY) {
    const style = getRoadStyle(tileX, tileY);
    const connections = getRoadConnections(state, tileX, tileY);
    const group = new THREE.Group();
    group.position.set(tileX, 0, tileY);

    if (connections.length === 0) {
      group.add(
        createRoadRibbonMesh(
          [
            new THREE.Vector3(-0.18, ROAD_SURFACE_HEIGHT, 0),
            new THREE.Vector3(0, ROAD_SURFACE_HEIGHT, 0),
            new THREE.Vector3(0.18, ROAD_SURFACE_HEIGHT, 0),
          ],
          0.18,
          style.shoulderMaterial,
          `${tileX}:${tileY}:stub:shoulder`,
          0.04
        )
      );
      group.add(
        createRoadRibbonMesh(
          [
            new THREE.Vector3(-0.14, ROAD_CORE_HEIGHT, 0),
            new THREE.Vector3(0, ROAD_CORE_HEIGHT, 0),
            new THREE.Vector3(0.14, ROAD_CORE_HEIGHT, 0),
          ],
          0.12,
          style.roadMaterial,
          `${tileX}:${tileY}:stub`,
          0.028
        )
      );
      return group;
    }

    const centerPatch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.02, 8),
      style.shoulderMaterial
    );
    centerPatch.position.y = ROAD_SURFACE_HEIGHT;
    centerPatch.scale.z = 0.85;
    group.add(centerPatch);

    if (connections.length === 2) {
      const curve = createRoadCurve(
        tileX,
        tileY,
        connections[0],
        connections[1]
      );
      group.add(
        createRoadRibbonMesh(
          curve,
          style.shoulderWidth,
          style.shoulderMaterial,
          `${tileX}:${tileY}:shoulder`,
          0.045
        )
      );
      group.add(
        createRoadRibbonMesh(
          curve,
          style.roadWidth,
          style.roadMaterial,
          `${tileX}:${tileY}:road`,
          0.03
        )
      );
      return group;
    }

    connections.forEach((connection, index) => {
      const branch = createRoadBranch(tileX, tileY, connection, index);
      group.add(
        createRoadRibbonMesh(
          branch,
          style.shoulderWidth,
          style.shoulderMaterial,
          `${tileX}:${tileY}:branch:${connection.id}:shoulder`,
          0.04
        )
      );
      group.add(
        createRoadRibbonMesh(
          branch,
          style.roadWidth,
          style.roadMaterial,
          `${tileX}:${tileY}:branch:${connection.id}`,
          0.026
        )
      );
    });

    return group;
  }

  function getRoadConnections(state, tileX, tileY) {
    const directions = [
      {
        id: 'north',
        dx: 0,
        dy: -1,
        edgeX: 0,
        edgeZ: -0.5,
        inwardX: 0,
        inwardZ: -0.18,
      },
      {
        id: 'east',
        dx: 1,
        dy: 0,
        edgeX: 0.5,
        edgeZ: 0,
        inwardX: 0.18,
        inwardZ: 0,
      },
      {
        id: 'south',
        dx: 0,
        dy: 1,
        edgeX: 0,
        edgeZ: 0.5,
        inwardX: 0,
        inwardZ: 0.18,
      },
      {
        id: 'west',
        dx: -1,
        dy: 0,
        edgeX: -0.5,
        edgeZ: 0,
        inwardX: -0.18,
        inwardZ: 0,
      },
      {
        id: 'northeast',
        dx: 1,
        dy: -1,
        edgeX: 0.5,
        edgeZ: -0.5,
        inwardX: 0.22,
        inwardZ: -0.22,
      },
      {
        id: 'southeast',
        dx: 1,
        dy: 1,
        edgeX: 0.5,
        edgeZ: 0.5,
        inwardX: 0.22,
        inwardZ: 0.22,
      },
      {
        id: 'southwest',
        dx: -1,
        dy: 1,
        edgeX: -0.5,
        edgeZ: 0.5,
        inwardX: -0.22,
        inwardZ: 0.22,
      },
      {
        id: 'northwest',
        dx: -1,
        dy: -1,
        edgeX: -0.5,
        edgeZ: -0.5,
        inwardX: -0.22,
        inwardZ: -0.22,
      },
    ];

    return directions
      .filter(({ dx, dy }) =>
        isRoadNetworkKind(state.getCurrentTile(tileX + dx, tileY + dy).kind)
      )
      .sort(
        (a, b) => Math.atan2(a.edgeZ, a.edgeX) - Math.atan2(b.edgeZ, b.edgeX)
      );
  }

  function isRoadNetworkKind(kind) {
    return (
      kind === 'road' ||
      kind === 'bridge' ||
      kind === 'town' ||
      kind === 'sign' ||
      kind === 'cave' ||
      kind === 'dungeon'
    );
  }

  function createRoadCurve(tileX, tileY, start, end) {
    const startPoint = new THREE.Vector3(
      start.edgeX,
      ROAD_CORE_HEIGHT,
      start.edgeZ
    );
    const endPoint = new THREE.Vector3(end.edgeX, ROAD_CORE_HEIGHT, end.edgeZ);
    const jitter = (hash2D('road-curve-jitter', tileX, tileY) - 0.5) * 0.12;
    const opposite = start.dx === -end.dx && start.dy === -end.dy;
    const control = opposite
      ? new THREE.Vector3(
          start.dy !== 0 ? jitter : 0,
          ROAD_SURFACE_HEIGHT,
          start.dx !== 0 ? jitter : 0
        )
      : new THREE.Vector3(
          (start.inwardX + end.inwardX) * 0.55,
          ROAD_SURFACE_HEIGHT,
          (start.inwardZ + end.inwardZ) * 0.55
        );

    return sampleQuadraticCurve(startPoint, control, endPoint, 9);
  }

  function createRoadBranch(tileX, tileY, connection, index) {
    const start = new THREE.Vector3(0, ROAD_CORE_HEIGHT, 0);
    const end = new THREE.Vector3(
      connection.edgeX,
      ROAD_CORE_HEIGHT,
      connection.edgeZ
    );
    const bend =
      (hash2D('road-branch-bend', tileX * 11 + index, tileY * 13) - 0.5) * 0.1;
    const control = new THREE.Vector3(
      connection.inwardX + (connection.dy !== 0 ? bend : 0),
      ROAD_SURFACE_HEIGHT,
      connection.inwardZ + (connection.dx !== 0 ? bend : 0)
    );
    return sampleQuadraticCurve(start, control, end, 7);
  }

  function sampleQuadraticCurve(start, control, end, segments) {
    const curve = new THREE.QuadraticBezierCurve3(start, control, end);
    return curve.getPoints(segments);
  }

  function createRoadRibbonMesh(points, width, material, seedKey, lipDepth) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const indices = [];
    let distance = 0;

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const tangent = new THREE.Vector3()
        .subVectors(next, previous)
        .setY(0)
        .normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const widthNoise =
        1 +
        (hash2D(`road-width:${seedKey}`, index, points.length) - 0.5) *
          lipDepth;
      const halfWidth = width * widthNoise * 0.5;
      const left = point.clone().addScaledVector(normal, halfWidth);
      const right = point.clone().addScaledVector(normal, -halfWidth);
      positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
      if (index > 0) {
        distance += point.distanceTo(previous);
      }
      uvs.push(0, distance, 1, distance);
    }

    for (let index = 0; index < points.length - 1; index += 1) {
      const base = index * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  }

  function getRoadStyle(tileX, tileY) {
    const regionX = Math.floor(tileX / ROAD_REGION_SIZE);
    const regionY = Math.floor(tileY / ROAD_REGION_SIZE);
    const key = `${regionX}:${regionY}`;

    if (!roadStyleCache.has(key)) {
      const tier = Math.floor(hash2D('road-tier', regionX, regionY) * 3);
      const styleType = ['footpath', 'cobble', 'brick'][tier];
      const palette =
        styleType === 'brick'
          ? { road: '#a14d34', shoulder: '#6b5d48', accent: '#7a2f1d' }
          : styleType === 'cobble'
            ? { road: '#8f8578', shoulder: '#6e7a68', accent: '#5f5b56' }
            : { road: '#8d6a42', shoulder: '#5f7a4d', accent: '#5a4025' };
      const roadTexture = createRoadTexture(
        palette.road,
        palette.accent,
        styleType,
        regionX,
        regionY
      );
      const shoulderTexture = createRoadShoulderTexture(
        palette.shoulder,
        palette.road,
        regionX,
        regionY
      );

      roadStyleCache.set(key, {
        roadWidth: styleType === 'footpath' ? 0.24 : 0.3,
        shoulderWidth: styleType === 'footpath' ? 0.36 : 0.42,
        roadMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: roadTexture,
          roughness: 0.95,
          metalness: styleType === 'cobble' ? 0.04 : 0.02,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
          side: THREE.DoubleSide,
        }),
        shoulderMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: shoulderTexture,
          roughness: 0.98,
          metalness: 0.01,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
          side: THREE.DoubleSide,
        }),
      });
    }

    return roadStyleCache.get(key);
  }

  function createRoadTexture(
    baseColor,
    accentColor,
    styleType,
    regionX,
    regionY
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (styleType === 'brick') {
      for (let row = 0; row < canvas.height; row += 10) {
        const shift = ((row / 10) % 2) * 8;
        context.fillStyle = accentColor;
        context.fillRect(0, row, canvas.width, 2);
        for (let column = -8 + shift; column < canvas.width + 8; column += 16) {
          context.fillRect(column, row, 2, 10);
        }
      }
    } else if (styleType === 'cobble') {
      for (let index = 0; index < 42; index += 1) {
        const x = Math.floor(
          hash2D('road-cobble-x', regionX * 37 + index, regionY) * canvas.width
        );
        const y = Math.floor(
          hash2D('road-cobble-y', regionY * 41 + index, regionX) * canvas.height
        );
        const width =
          5 + Math.floor(hash2D('road-cobble-w', index, regionX) * 4);
        const height =
          3 + Math.floor(hash2D('road-cobble-h', index, regionY) * 3);
        context.fillStyle =
          index % 2 === 0 ? accentColor : 'rgba(255,255,255,0.14)';
        context.fillRect(x, y, width, height);
      }
    } else {
      for (let row = 0; row < canvas.height; row += 7) {
        const shade = 80 + ((row * 9 + regionX * 7) % 36);
        context.fillStyle = `rgba(${shade}, ${Math.max(35, shade - 20)}, ${Math.max(20, shade - 34)}, 0.28)`;
        context.fillRect(0, row, canvas.width, 2);
      }
      for (let index = 0; index < 80; index += 1) {
        const x = Math.floor(
          hash2D('road-track-x', regionX, index + regionY) * canvas.width
        );
        const y = Math.floor(
          hash2D('road-track-y', regionY, index + regionX) * canvas.height
        );
        context.fillStyle = 'rgba(50,30,18,0.16)';
        context.fillRect(x, y, 2, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.2, 1.2);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function createRoadShoulderTexture(baseColor, accentColor, regionX, regionY) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 140; index += 1) {
      const x = Math.floor(
        hash2D('road-shoulder-x', regionX * 31 + index, regionY) * canvas.width
      );
      const y = Math.floor(
        hash2D('road-shoulder-y', regionY * 29 + index, regionX) * canvas.height
      );
      const size =
        1 + Math.floor(hash2D('road-shoulder-s', index, regionX + regionY) * 3);
      context.fillStyle =
        index % 3 === 0 ? accentColor : 'rgba(255,255,255,0.12)';
      context.fillRect(x, y, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.2, 1.2);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function createBridgeGroup(state, tileX, tileY) {
    const info = getBridgeClusterInfo(state, tileX, tileY);
    const style = getBridgeStyle(info.clusterKey, info.anchorX, info.anchorY);
    const axis = info.axis;
    const alongX = axis === 'ew';
    const deckLength =
      TILE_SIZE +
      (info.connectNegative ? 0.08 : 0) +
      (info.connectPositive ? 0.08 : 0);
    const deckWidth = 0.72 + style.widthJitter;
    const group = new THREE.Group();
    group.position.set(tileX, 0, tileY);

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(
        alongX ? deckLength : deckWidth,
        BRIDGE_DECK_THICKNESS,
        alongX ? deckWidth : deckLength
      ),
      style.deckMaterial
    );
    deck.position.y = -BRIDGE_DECK_THICKNESS * 0.5;
    group.add(deck);

    if (style.type === 'stone') {
      addBridgeParapets(group, style, alongX, deckLength, deckWidth);
    } else {
      addBridgeRailings(group, style, alongX, deckLength, deckWidth, info);
    }

    if (style.covered) {
      addBridgeCover(group, style, alongX, deckLength, deckWidth, info);
    }

    if (style.drawbridge) {
      addDrawbridgeDetails(group, style, alongX, deckWidth);
    }

    if (info.length > 1 && style.pillarSpacing > 0) {
      addBridgePillars(group, style, alongX, info, deckWidth);
    }

    return group;
  }

  function addBridgeParapets(group, style, alongX, deckLength, deckWidth) {
    const railThickness = 0.08;
    const sideOffset = deckWidth * 0.5 - railThickness * 0.35;
    const length = deckLength + 0.02;
    const createWall = () =>
      new THREE.Mesh(
        new THREE.BoxGeometry(
          alongX ? length : railThickness,
          BRIDGE_RAIL_HEIGHT,
          alongX ? railThickness : length
        ),
        style.railMaterial
      );

    const first = createWall();
    const second = createWall();
    if (alongX) {
      first.position.set(0, BRIDGE_RAIL_HEIGHT * 0.5, -sideOffset);
      second.position.set(0, BRIDGE_RAIL_HEIGHT * 0.5, sideOffset);
    } else {
      first.position.set(-sideOffset, BRIDGE_RAIL_HEIGHT * 0.5, 0);
      second.position.set(sideOffset, BRIDGE_RAIL_HEIGHT * 0.5, 0);
    }
    group.add(first);
    group.add(second);
  }

  function addBridgeRailings(
    group,
    style,
    alongX,
    deckLength,
    deckWidth,
    info
  ) {
    const sideOffset = deckWidth * 0.5 - 0.05;
    const postCount = Math.max(2, Math.round(deckLength / 0.32));
    for (let side = -1; side <= 1; side += 2) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(
          alongX ? deckLength + 0.02 : 0.05,
          0.05,
          alongX ? 0.05 : deckLength + 0.02
        ),
        style.railMaterial
      );
      if (alongX) {
        rail.position.set(0, BRIDGE_RAIL_HEIGHT, side * sideOffset);
      } else {
        rail.position.set(side * sideOffset, BRIDGE_RAIL_HEIGHT, 0);
      }
      group.add(rail);

      for (let index = 0; index < postCount; index += 1) {
        const t = postCount === 1 ? 0.5 : index / (postCount - 1);
        const local = -deckLength * 0.5 + t * deckLength;
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, BRIDGE_RAIL_HEIGHT, 0.05),
          style.postMaterial
        );
        if (alongX) {
          post.position.set(local, BRIDGE_RAIL_HEIGHT * 0.5, side * sideOffset);
        } else {
          post.position.set(side * sideOffset, BRIDGE_RAIL_HEIGHT * 0.5, local);
        }
        group.add(post);
      }
    }

    if (style.type === 'metal' && info.length > 1) {
      const truss = new THREE.Mesh(
        new THREE.BoxGeometry(
          alongX ? deckLength * 0.86 : 0.04,
          0.04,
          alongX ? 0.04 : deckLength * 0.86
        ),
        style.trimMaterial
      );
      if (alongX) {
        truss.position.set(0, BRIDGE_RAIL_HEIGHT * 0.64, 0);
        truss.rotation.z = 0.16;
      } else {
        truss.position.set(0, BRIDGE_RAIL_HEIGHT * 0.64, 0);
        truss.rotation.x = -0.16;
      }
      group.add(truss);
    }
  }

  function addBridgeCover(group, style, alongX, deckLength, deckWidth, info) {
    const postHeight = 0.38 + style.coverHeight;
    const coverY = postHeight + 0.08;
    const postOffset = deckWidth * 0.5 - 0.08;
    const spanCount = Math.max(2, Math.round(deckLength / 0.5));
    for (let index = 0; index < spanCount; index += 1) {
      const t = spanCount === 1 ? 0.5 : index / (spanCount - 1);
      const local = -deckLength * 0.5 + t * deckLength;
      for (let side = -1; side <= 1; side += 2) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, postHeight, 0.05),
          style.postMaterial
        );
        if (alongX) {
          post.position.set(local, postHeight * 0.5, side * postOffset);
        } else {
          post.position.set(side * postOffset, postHeight * 0.5, local);
        }
        group.add(post);
      }
    }

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(
        alongX ? deckLength + 0.12 : deckWidth + 0.22,
        0.1,
        alongX ? deckWidth + 0.22 : deckLength + 0.12
      ),
      style.coverMaterial
    );
    roof.position.y = coverY;
    roof.rotation.y = alongX ? 0 : Math.PI * 0.5;
    group.add(roof);

    if (style.type !== 'stone' && info.length > 1) {
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(
          alongX ? deckLength + 0.08 : 0.06,
          0.08,
          alongX ? 0.06 : deckLength + 0.08
        ),
        style.trimMaterial
      );
      ridge.position.y = coverY + 0.08;
      group.add(ridge);
    }
  }

  function addDrawbridgeDetails(group, style, alongX, deckWidth) {
    const towerOffset = 0.24;
    for (let side = -1; side <= 1; side += 2) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.42, 0.09),
        style.postMaterial
      );
      if (alongX) {
        frame.position.set(side * towerOffset, 0.21, 0);
      } else {
        frame.position.set(0, 0.21, side * towerOffset);
      }
      group.add(frame);
    }

    const spindle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, deckWidth * 0.72, 6),
      style.trimMaterial
    );
    spindle.rotation.z = Math.PI * 0.5;
    spindle.position.y = 0.4;
    if (!alongX) {
      spindle.rotation.x = Math.PI * 0.5;
      spindle.rotation.z = 0;
    }
    group.add(spindle);
  }

  function addBridgePillars(group, style, alongX, info, deckWidth) {
    const shouldPlace =
      info.segmentIndex > 0 &&
      info.segmentIndex < info.length - 1 &&
      info.segmentIndex % style.pillarSpacing === 0;
    if (!shouldPlace) {
      return;
    }

    const pillarHeight = BRIDGE_DECK_THICKNESS - RIVER_SURFACE_DROP;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(
        style.pillarWidth,
        pillarHeight,
        Math.max(0.14, deckWidth * 0.3)
      ),
      style.pillarMaterial
    );
    pillar.position.y = RIVER_SURFACE_DROP + pillarHeight * 0.5;
    pillar.rotation.y = alongX ? 0 : Math.PI * 0.5;
    group.add(pillar);
  }

  function getBridgeClusterInfo(state, tileX, tileY) {
    const key = `${tileX}:${tileY}`;
    if (bridgeClusterCache.has(key)) {
      return bridgeClusterCache.get(key);
    }

    const queue = [[tileX, tileY]];
    const visited = new Set([key]);
    const tiles = [];

    while (queue.length > 0) {
      const [currentX, currentY] = queue.shift();
      tiles.push({ x: currentX, y: currentY });
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]) {
        const nextX = currentX + dx;
        const nextY = currentY + dy;
        const nextKey = `${nextX}:${nextY}`;
        if (visited.has(nextKey)) continue;
        if (state.getCurrentTile(nextX, nextY).kind !== 'bridge') continue;
        visited.add(nextKey);
        queue.push([nextX, nextY]);
      }
    }

    tiles.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
    const bounds = tiles.reduce(
      (acc, tile) => ({
        minX: Math.min(acc.minX, tile.x),
        maxX: Math.max(acc.maxX, tile.x),
        minY: Math.min(acc.minY, tile.y),
        maxY: Math.max(acc.maxY, tile.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
    const spanX = bounds.maxX - bounds.minX + 1;
    const spanY = bounds.maxY - bounds.minY + 1;
    const axis = spanX >= spanY ? 'ew' : 'ns';
    const orderedTiles = [...tiles].sort((a, b) =>
      axis === 'ew' ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x
    );
    const anchor = orderedTiles[0];
    const clusterKey = `${axis}:${anchor.x}:${anchor.y}`;

    for (let index = 0; index < orderedTiles.length; index += 1) {
      const tile = orderedTiles[index];
      const negativeKey =
        axis === 'ew' ? `${tile.x - 1}:${tile.y}` : `${tile.x}:${tile.y - 1}`;
      const positiveKey =
        axis === 'ew' ? `${tile.x + 1}:${tile.y}` : `${tile.x}:${tile.y + 1}`;
      bridgeClusterCache.set(`${tile.x}:${tile.y}`, {
        axis,
        clusterKey,
        anchorX: anchor.x,
        anchorY: anchor.y,
        length: orderedTiles.length,
        segmentIndex: index,
        connectNegative: visited.has(negativeKey),
        connectPositive: visited.has(positiveKey),
      });
    }

    return bridgeClusterCache.get(key);
  }

  function getBridgeStyle(clusterKey, tileX, tileY) {
    if (!bridgeStyleCache.has(clusterKey)) {
      const regionX = Math.floor(tileX / BRIDGE_REGION_SIZE);
      const regionY = Math.floor(tileY / BRIDGE_REGION_SIZE);
      const typeIndex = Math.floor(hash2D('bridge-type', tileX, tileY) * 4);
      const type = ['wood', 'stone', 'metal', 'drawbridge'][typeIndex];
      const covered = hash2D('bridge-covered', regionX, regionY) > 0.72;
      const drawbridge = type === 'drawbridge';
      const pillarSpacing =
        2 + Math.floor(hash2D('bridge-pillar', tileX, tileY) * 3);
      const palette =
        type === 'stone'
          ? {
              deck: '#c9c2b8',
              rail: '#8b857d',
              trim: '#6d655d',
            }
          : type === 'metal'
            ? {
                deck: '#9b6b3d',
                rail: '#8e9aa7',
                trim: '#4b5563',
              }
            : {
                deck: '#8b5a2b',
                rail: '#6f4a28',
                trim: '#4a2f1b',
              };
      const deckTexture = createBridgeTexture(
        palette.deck,
        palette.trim,
        type,
        'deck',
        tileX,
        tileY
      );
      const railTexture = createBridgeTexture(
        palette.rail,
        palette.trim,
        type,
        'rail',
        tileX,
        tileY
      );
      const coverTexture = createBridgeTexture(
        palette.deck,
        palette.trim,
        type === 'stone' ? 'roof-stone' : 'roof',
        'cover',
        tileX,
        tileY
      );
      bridgeStyleCache.set(clusterKey, {
        type,
        covered: covered && !drawbridge,
        drawbridge,
        key: clusterKey,
        widthJitter: hash2D('bridge-width', tileX, tileY) * 0.12,
        coverHeight: hash2D('bridge-cover-height', tileX, tileY) * 0.16,
        pillarSpacing,
        pillarWidth: 0.14 + hash2D('bridge-pillar-width', tileX, tileY) * 0.09,
        deckMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: deckTexture,
          roughness: 0.9,
          metalness: type === 'metal' ? 0.28 : 0.04,
        }),
        railMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: railTexture,
          roughness: 0.86,
          metalness: type === 'metal' ? 0.36 : 0.05,
        }),
        postMaterial: new THREE.MeshStandardMaterial({
          color: palette.trim,
          roughness: 0.88,
          metalness: type === 'metal' ? 0.22 : 0.03,
        }),
        trimMaterial: new THREE.MeshStandardMaterial({
          color: palette.trim,
          roughness: 0.82,
          metalness: type === 'metal' ? 0.34 : 0.04,
        }),
        coverMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: coverTexture,
          roughness: 0.9,
          metalness: 0.03,
        }),
        pillarMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: railTexture,
          roughness: 0.92,
          metalness: type === 'metal' ? 0.18 : 0.02,
        }),
      });
    }

    return bridgeStyleCache.get(clusterKey);
  }

  function createBridgeTexture(
    baseColor,
    accentColor,
    type,
    layer,
    tileX,
    tileY
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (type === 'stone' || type === 'roof-stone') {
      for (let row = 0; row < canvas.height; row += 12) {
        context.fillStyle = accentColor;
        context.fillRect(0, row, canvas.width, 2);
      }
      for (let column = 0; column < canvas.width; column += 16) {
        for (let row = 0; row < canvas.height; row += 12) {
          const offset =
            ((row / 12 + column / 16) % 2) * 8 + (layer === 'cover' ? 2 : 0);
          context.fillRect(column + offset, row, 2, 12);
        }
      }
    } else if (type === 'metal') {
      for (let row = 0; row < canvas.height; row += 8) {
        context.fillStyle =
          row % 16 === 0 ? accentColor : 'rgba(255,255,255,0.16)';
        context.fillRect(0, row, canvas.width, 2);
      }
      for (let i = 0; i < 24; i += 1) {
        const x = Math.floor(
          hash2D('bridge-rivet-x', tileX, i + tileY) * canvas.width
        );
        const y = Math.floor(
          hash2D('bridge-rivet-y', tileY, i + tileX) * canvas.height
        );
        context.fillStyle = 'rgba(255,255,255,0.34)';
        context.fillRect(x, y, 2, 2);
      }
    } else {
      for (let column = 0; column < canvas.width; column += 7) {
        const shade = 70 + ((column * 5 + tileX * 3) % 36);
        context.fillStyle = `rgba(${shade}, ${Math.max(30, shade - 16)}, ${Math.max(18, shade - 28)}, 0.32)`;
        context.fillRect(column, 0, 3, canvas.height);
      }
      for (let row = 0; row < canvas.height; row += 10) {
        context.fillStyle = 'rgba(255,255,255,0.08)';
        context.fillRect(0, row, canvas.width, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(type === 'stone' ? 1 : 1.15, 1.15);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function createForestTileGroup(tileX, tileY) {
    const group = new THREE.Group();
    const descriptors = getForestTreeDescriptors(tileX, tileY);

    for (const descriptor of descriptors) {
      const style = getTreeStyle(tileX, tileY, descriptor.variety);
      const tree = new THREE.Group();
      tree.position.set(tileX + descriptor.x, 0, tileY + descriptor.y);
      tree.scale.setScalar(descriptor.scale);

      const trunk = new THREE.Mesh(treeGeometry.trunk, style.trunkMaterial);
      trunk.position.y = descriptor.trunkHeight * 0.5;
      trunk.scale.y = descriptor.trunkHeight;
      tree.add(trunk);

      for (const branch of descriptor.branches) {
        const limb = new THREE.Mesh(treeGeometry.branch, style.trunkMaterial);
        limb.position.set(branch.x, branch.y, branch.z);
        limb.rotation.z = branch.roll;
        limb.rotation.x = branch.pitch;
        limb.scale.y = branch.length;
        tree.add(limb);
      }

      for (const clump of descriptor.foliage) {
        const foliage = new THREE.Mesh(
          treeGeometry.foliage,
          style.foliageMaterial
        );
        foliage.position.set(clump.x, clump.y, clump.z);
        foliage.scale.set(clump.scaleX, clump.scaleY, clump.scaleZ);
        tree.add(foliage);
      }

      group.add(tree);
    }

    return group;
  }

  function createMountainGroup(state, tileX, tileY) {
    const group = new THREE.Group();
    const peakScale = getMountainPeakScale(state, tileX, tileY);
    const height = 1.4 * peakScale;
    const width = 0.9 + hash2D('mountain-width', tileX, tileY) * 0.22;
    const depth = 0.9 + hash2D('mountain-depth', tileX, tileY) * 0.22;
    const upperHeight =
      height * (0.5 + hash2D('mountain-upper', tileX, tileY) * 0.16);
    const lowerHeight = height - upperHeight * 0.45;

    const base = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width, depth) * 0.72, lowerHeight, 4),
      mountainMaterial
    );
    base.position.set(tileX, lowerHeight * 0.5, tileY);
    base.rotation.y = hash2D('mountain-rot-a', tileX, tileY) * Math.PI;
    base.scale.z = depth / width;
    group.add(base);

    const upper = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width, depth) * 0.44, upperHeight, 4),
      mountainMaterial
    );
    upper.position.set(
      tileX + (hash2D('mountain-offset-x', tileX, tileY) - 0.5) * 0.12,
      lowerHeight * 0.62 + upperHeight * 0.5,
      tileY + (hash2D('mountain-offset-y', tileX, tileY) - 0.5) * 0.12
    );
    upper.rotation.y = hash2D('mountain-rot-b', tileX, tileY) * Math.PI;
    upper.scale.z = depth / width;
    group.add(upper);

    if (peakScale > 1.3) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(
          Math.max(width, depth) * 0.26,
          upperHeight * 0.68,
          4
        ),
        mountainMaterial
      );
      crown.position.set(
        upper.position.x,
        upper.position.y + upperHeight * 0.42,
        upper.position.z
      );
      crown.rotation.y = hash2D('mountain-rot-c', tileX, tileY) * Math.PI;
      crown.scale.z = depth / width;
      group.add(crown);
    }

    if (peakScale > 1.55) {
      const snow = new THREE.Mesh(
        new THREE.ConeGeometry(
          Math.max(width, depth) * 0.16,
          upperHeight * 0.3,
          4
        ),
        new THREE.MeshStandardMaterial({
          color: '#f8fafc',
          roughness: 0.88,
          metalness: 0.02,
          flatShading: true,
        })
      );
      snow.position.set(
        upper.position.x,
        upper.position.y + upperHeight * 0.56,
        upper.position.z
      );
      snow.rotation.y = upper.rotation.y;
      snow.scale.z = depth / width;
      group.add(snow);
    }

    return group;
  }

  function createCaveGroup(state, tileX, tileY) {
    const group = new THREE.Group();
    const entrance = getCaveEntranceDirection(state, tileX, tileY);
    const width = 0.9 + hash2D('cave-width', tileX, tileY) * 0.22;
    const depth = 0.92 + hash2D('cave-depth', tileX, tileY) * 0.24;
    const height = 0.96 + hash2D('cave-height', tileX, tileY) * 0.26;
    const boulderCount =
      3 + Math.floor(hash2D('cave-boulders', tileX, tileY) * 3);

    for (let index = 0; index < boulderCount; index += 1) {
      const boulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 8, 7),
        mountainMaterial
      );
      const radiusScale =
        0.9 +
        hash2D('cave-boulder-scale', tileX * 13 + index, tileY * 17) * 0.45;
      const xOffset =
        (hash2D('cave-boulder-x', tileX * 19 + index, tileY) - 0.5) * 0.34;
      const zOffset =
        (hash2D('cave-boulder-z', tileX, tileY * 23 + index) - 0.5) * 0.32;
      const yOffset =
        0.2 + hash2D('cave-boulder-y', tileX + index, tileY - index) * 0.32;
      boulder.position.set(tileX + xOffset, yOffset, tileY + zOffset);
      boulder.scale.set(
        width * radiusScale,
        height * (0.72 + radiusScale * 0.12),
        depth * radiusScale
      );
      group.add(boulder);
    }

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 7, 6),
      mountainMaterial
    );
    cap.position.set(
      tileX + (hash2D('cave-cap-x', tileX, tileY) - 0.5) * 0.08,
      height * 0.82,
      tileY + (hash2D('cave-cap-z', tileX, tileY) - 0.5) * 0.08
    );
    cap.scale.set(width * 0.88, height * 0.6, depth * 0.82);
    group.add(cap);

    const portal = new THREE.Group();
    portal.position.set(
      tileX + entrance.dx * 0.5,
      0,
      tileY + entrance.dy * 0.5
    );
    portal.rotation.y = entrance.rotationY;

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 7, 6),
      mountainMaterial
    );
    crown.position.set(0, 0.42, 0.08);
    crown.scale.set(2.2, 1.5, 1.05);
    portal.add(crown);

    const leftCheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 7, 6),
      mountainMaterial
    );
    leftCheek.position.set(-0.24, 0.2, 0.08);
    leftCheek.scale.set(1.4, 1.9, 1.1);
    portal.add(leftCheek);

    const rightCheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 7, 6),
      mountainMaterial
    );
    rightCheek.position.set(0.24, 0.2, 0.08);
    rightCheek.scale.set(1.4, 1.9, 1.1);
    portal.add(rightCheek);

    const mouthVoid = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 20),
      new THREE.MeshBasicMaterial({
        color: '#010308',
        side: THREE.DoubleSide,
      })
    );
    mouthVoid.position.set(0, 0.2, 0.22);
    portal.add(mouthVoid);

    const tunnelBack = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 18),
      new THREE.MeshBasicMaterial({
        color: '#000000',
        side: THREE.DoubleSide,
      })
    );
    tunnelBack.position.set(0, 0.19, -0.16);
    portal.add(tunnelBack);

    const tunnelCeiling = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.46),
      new THREE.MeshBasicMaterial({
        color: '#03060a',
        side: THREE.DoubleSide,
      })
    );
    tunnelCeiling.position.set(0, 0.26, 0.01);
    tunnelCeiling.rotation.x = Math.PI * 0.5;
    portal.add(tunnelCeiling);

    const tunnelFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.34),
      new THREE.MeshBasicMaterial({
        color: '#080b10',
        side: THREE.DoubleSide,
      })
    );
    tunnelFloor.position.set(0, 0.04, 0.02);
    tunnelFloor.rotation.x = -Math.PI * 0.5;
    portal.add(tunnelFloor);

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.06, 6, 12, Math.PI),
      mountainMaterial
    );
    arch.position.set(0, 0.31, 0.22);
    arch.rotation.z = Math.PI;
    portal.add(arch);

    const leftPillar = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      mountainMaterial
    );
    leftPillar.position.set(-0.2, 0.16, 0.16);
    leftPillar.scale.set(1, 1.9, 1.2);
    portal.add(leftPillar);

    const rightPillar = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      mountainMaterial
    );
    rightPillar.position.set(0.2, 0.16, 0.16);
    rightPillar.scale.set(1, 1.9, 1.2);
    portal.add(rightPillar);

    const sill = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      mountainMaterial
    );
    sill.position.set(0, 0.03, 0.22);
    sill.scale.set(2.8, 0.55, 1.2);
    portal.add(sill);

    group.add(portal);
    return group;
  }

  function getCaveEntranceDirection(state, tileX, tileY) {
    const directions = [
      { dx: 0, dy: -1, rotationY: Math.PI, label: 'north' },
      { dx: 1, dy: 0, rotationY: -Math.PI * 0.5, label: 'east' },
      { dx: 0, dy: 1, rotationY: 0, label: 'south' },
      { dx: -1, dy: 0, rotationY: Math.PI * 0.5, label: 'west' },
    ];

    return directions
      .map((direction) => {
        const tile = state.getCurrentTile(
          tileX + direction.dx,
          tileY + direction.dy
        );
        const walkable = getTileDefinition(tile.kind).walkable;
        const landFacing =
          walkable && tile.kind !== 'river' && tile.kind !== 'ocean';
        const roadDistance = getNearestAccessibleRoadDistance(
          state,
          tileX,
          tileY,
          direction
        );
        return {
          ...direction,
          score:
            (roadDistance === 1 ? 8 : 0) +
            (roadDistance > 1 && Number.isFinite(roadDistance)
              ? Math.max(0, 6 - roadDistance)
              : 0) +
            (landFacing ? 4 : 0) +
            (walkable ? 2 : 0) +
            hash2D(`cave-facing:${direction.label}`, tileX, tileY),
        };
      })
      .sort((a, b) => b.score - a.score)[0];
  }

  function getNearestAccessibleRoadDistance(state, tileX, tileY, direction) {
    for (let distance = 1; distance <= 5; distance += 1) {
      const tile = state.getCurrentTile(
        tileX + direction.dx * distance,
        tileY + direction.dy * distance
      );
      if (tile.kind === 'road' || tile.kind === 'bridge') {
        return distance;
      }
      if (!getTileDefinition(tile.kind).walkable) {
        return Infinity;
      }
    }

    return Infinity;
  }

  function getMountainPeakScale(state, tileX, tileY) {
    let scale = 1;
    const neighbors = [
      state.getCurrentTile(tileX, tileY - 1).kind,
      state.getCurrentTile(tileX + 1, tileY).kind,
      state.getCurrentTile(tileX, tileY + 1).kind,
      state.getCurrentTile(tileX - 1, tileY).kind,
    ];
    const surroundingCount = neighbors.filter(
      (kind) => kind === 'mountain'
    ).length;

    if (surroundingCount === 4) {
      scale += 0.55;
      const secondRing = [
        state.getCurrentTile(tileX, tileY - 2).kind,
        state.getCurrentTile(tileX + 2, tileY).kind,
        state.getCurrentTile(tileX, tileY + 2).kind,
        state.getCurrentTile(tileX - 2, tileY).kind,
      ].filter((kind) => kind === 'mountain').length;
      scale += secondRing * 0.1;
    } else {
      scale += surroundingCount * 0.12;
    }

    return Math.min(2, scale);
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

  function getForestTreeDescriptors(tileX, tileY) {
    const key = `${tileX}:${tileY}`;
    if (!treeDescriptorCache.has(key)) {
      const count =
        1 + Math.floor(hash2D('forest-tree-count', tileX, tileY) * 3);
      const descriptors = [];

      for (let index = 0; index < count; index += 1) {
        const baseSeed = `forest-tree:${tileX}:${tileY}:${index}`;
        const variety = getTreeVarietyIndex(tileX, tileY, index);
        const descriptor = {
          x: hash2D(baseSeed, 1, 0) * 0.56 - 0.28,
          y: 0,
          z: hash2D(baseSeed, 2, 0) * 0.56 - 0.28,
          radius: 0.08 + hash2D(baseSeed, 3, 0) * 0.05,
          scale: 0.78 + hash2D(baseSeed, 4, 0) * 0.55,
          trunkHeight: 0.72 + hash2D(baseSeed, 5, 0) * 0.45,
          variety,
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

  function getTreeVarietyIndex(tileX, tileY, treeIndex) {
    const clusterX = Math.floor(tileX / TREE_CLUSTER_SIZE);
    const clusterY = Math.floor(tileY / TREE_CLUSTER_SIZE);
    const dominant = Math.floor(
      hash2D('tree-cluster-dominant', clusterX, clusterY) * 3
    );
    const variationChance = hash2D(
      'tree-cluster-variation',
      tileX * 13 + treeIndex,
      tileY * 17
    );

    if (variationChance > 0.72) {
      return (dominant + 1 + Math.floor(variationChance * 7)) % 3;
    }

    return dominant;
  }

  function getTreeStyle(tileX, tileY, variety) {
    const regionX = Math.floor(tileX / TREE_REGION_SIZE);
    const regionY = Math.floor(tileY / TREE_REGION_SIZE);
    const key = `${regionX}:${regionY}:${variety}`;

    if (!treeStyleCache.has(key)) {
      const barkBase = createTintedHex(
        TREE_BARK_COLOR,
        0.82 + hash2D('tree-bark-tint', regionX + variety, regionY) * 0.32
      );
      const foliageBase = createTintedHex(
        TREE_FOLIAGE_COLOR,
        0.82 + hash2D('tree-foliage-tint', regionX, regionY + variety) * 0.34
      );

      const barkTexture = createTreeBarkTexture(
        barkBase,
        regionX,
        regionY,
        variety
      );
      const foliageTexture = createTreeFoliageTexture(
        foliageBase,
        regionX,
        regionY,
        variety
      );

      treeStyleCache.set(key, {
        trunkMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: barkTexture,
          roughness: 0.95,
          metalness: 0.02,
        }),
        foliageMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: foliageTexture,
          roughness: 0.98,
          metalness: 0.01,
          flatShading: true,
        }),
      });
    }

    return treeStyleCache.get(key);
  }

  function createTreeBarkTexture(baseColor, regionX, regionY, variety) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x += 5) {
      const darkness = 34 + ((x * 9 + variety * 17) % 26);
      context.fillStyle = `rgba(${darkness}, ${darkness - 6}, ${darkness - 10}, 0.28)`;
      context.fillRect(x, 0, 2, canvas.height);
    }

    for (let i = 0; i < 120; i += 1) {
      const x = Math.floor(
        hash2D('tree-bark-crack-x', regionX * 31 + variety, i) * canvas.width
      );
      const y = Math.floor(
        hash2D('tree-bark-crack-y', regionY * 29 + variety, i) * canvas.height
      );
      const height =
        3 + Math.floor(hash2D('tree-bark-crack-h', i, variety) * 8);
      context.fillStyle = 'rgba(20, 12, 8, 0.22)';
      context.fillRect(x, y, 1, height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.2, 1.2);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function createTreeFoliageTexture(baseColor, regionX, regionY, variety) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 180; i += 1) {
      const x = Math.floor(
        hash2D('tree-leaf-x', regionX * 17 + variety, i) * canvas.width
      );
      const y = Math.floor(
        hash2D('tree-leaf-y', regionY * 19 + variety, i) * canvas.height
      );
      const size = 1 + Math.floor(hash2D('tree-leaf-s', i, variety) * 3);
      const tint =
        90 + Math.floor(hash2D('tree-leaf-b', i, regionX + regionY) * 80);
      context.fillStyle = `rgba(${24 + (tint % 40)}, ${tint}, ${30 + (tint % 30)}, 0.22)`;
      context.fillRect(x, y, size, size);
    }

    for (let row = 0; row < canvas.height; row += 8) {
      context.fillStyle = 'rgba(255,255,255,0.08)';
      context.fillRect(0, row, canvas.width, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.15, 1.15);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function createTownGroup(tile, tileX, tileY) {
    const style = getTownStyle(tileX, tileY);
    const descriptors = getTownDescriptors(tileX, tileY);
    const group = new THREE.Group();

    for (const descriptor of descriptors) {
      const building = new THREE.Group();
      building.position.set(tileX + descriptor.x, 0, tileY + descriptor.y);
      building.rotation.y = descriptor.rotation;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(
          descriptor.width,
          descriptor.height,
          descriptor.depth
        ),
        style.wallMaterial
      );
      body.position.y = descriptor.height * 0.5;
      building.add(body);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(descriptor.roofRadius, descriptor.roofHeight, 4),
        style.roofMaterial
      );
      roof.position.y = descriptor.height + descriptor.roofHeight * 0.5 - 0.03;
      roof.rotation.y = Math.PI * 0.25;
      building.add(roof);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(
          descriptor.width * 0.18,
          descriptor.height * 0.34,
          0.04
        ),
        style.trimMaterial
      );
      door.position.set(
        0,
        descriptor.height * 0.17,
        descriptor.depth * 0.5 + 0.01
      );
      building.add(door);

      for (const window of descriptor.windows) {
        const pane = new THREE.Mesh(
          new THREE.BoxGeometry(window.width, window.height, 0.03),
          style.windowMaterial
        );
        pane.position.set(window.x, window.y, descriptor.depth * 0.5 + 0.008);
        building.add(pane);
      }

      group.add(building);
    }

    if (tile.poi?.name) {
      group.add(createTownNameSign(tile.poi.name, tileX, tileY, style));
    }

    return group;
  }

  function createTownNameSign(name, tileX, tileY, style) {
    const signStyle = getRegionalSignStyle(tileX, tileY);
    const sign = new THREE.Group();
    const signHeight = signStyle.postHeight * 0.92;
    const postThickness = signStyle.postThickness * 0.9;
    const placardWidth = Math.min(
      1.38,
      Math.max(0.72, 0.5 + name.length * 0.06)
    );
    const placardHeight = signStyle.placardHeight * 1.05;
    const placardDepth = signStyle.placardDepth;
    const label = createTownLabelSprite(
      name,
      placardWidth,
      placardHeight,
      signStyle
    );

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(postThickness, signHeight, postThickness),
      signStyle.postMaterial
    );
    post.position.y = signHeight * 0.5;
    sign.add(post);

    const placard = new THREE.Mesh(
      new THREE.BoxGeometry(placardWidth, placardHeight, placardDepth),
      signStyle.placardMaterial
    );
    placard.position.set(0, signHeight * 0.7, 0);
    sign.add(placard);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(
        placardWidth * 1.04,
        placardHeight * 0.14,
        placardDepth * 1.15
      ),
      style.trimMaterial
    );
    cap.position.set(0, placard.position.y + placardHeight * 0.5 + 0.03, 0);
    sign.add(cap);

    label.position.set(0, placard.position.y, placardDepth * 0.65);
    sign.add(label);

    const backLabel = createTownLabelSprite(
      name,
      placardWidth,
      placardHeight,
      signStyle
    );
    backLabel.position.set(0, placard.position.y, -placardDepth * 0.65);
    backLabel.rotation.y = Math.PI;
    sign.add(backLabel);

    sign.position.set(tileX - 0.34, 0, tileY + 0.34);
    sign.rotation.y = hash2D('town-sign-rotation', tileX, tileY) * 0.35 - 0.18;
    return sign;
  }

  function createTownLabelSprite(name, width, height, signStyle) {
    const texture = getTownLabelTexture(name, signStyle);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.9, height * 0.76),
      material
    );
  }

  function getTownLabelTexture(name, signStyle) {
    const key = `${signStyle.key}:town:${name}`;
    if (!signLabelCache.has(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 96;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = signStyle.placardColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = signStyle.trimColor;
      context.lineWidth = 6;
      context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      context.fillStyle = signStyle.textColor;
      context.font = 'bold 28px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(name, canvas.width * 0.5, canvas.height * 0.5);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      signLabelCache.set(key, texture);
    }

    return signLabelCache.get(key);
  }

  function getTownStyle(tileX, tileY) {
    const regionX = Math.floor(tileX / TOWN_REGION_SIZE);
    const regionY = Math.floor(tileY / TOWN_REGION_SIZE);
    const key = `${regionX}:${regionY}`;

    if (!townStyleCache.has(key)) {
      const wallColor =
        hash2D('town-wall-tone', regionX, regionY) > 0.5
          ? '#ece6dc'
          : '#d8cfbf';
      const roofColor =
        hash2D('town-roof-tone', regionX, regionY) > 0.5
          ? '#b64b3b'
          : '#7b4032';
      const trimColor =
        hash2D('town-trim-tone', regionX, regionY) > 0.45
          ? '#73563f'
          : '#54402f';
      const windowColor =
        hash2D('town-window-tone', regionX, regionY) > 0.55
          ? '#d9f4ff'
          : '#fef3c7';
      const wallTexture = createTownWallTexture(
        wallColor,
        trimColor,
        regionX,
        regionY
      );
      const roofTexture = createTownRoofTexture(
        roofColor,
        trimColor,
        regionX,
        regionY
      );

      townStyleCache.set(key, {
        wallMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: wallTexture,
          roughness: 0.92,
          metalness: 0.02,
        }),
        roofMaterial: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: roofTexture,
          roughness: 0.88,
          metalness: 0.03,
        }),
        trimMaterial: new THREE.MeshStandardMaterial({
          color: trimColor,
          roughness: 0.84,
          metalness: 0.04,
        }),
        windowMaterial: new THREE.MeshStandardMaterial({
          color: windowColor,
          emissive: windowColor,
          emissiveIntensity: 0.08,
          roughness: 0.4,
          metalness: 0.02,
        }),
      });
    }

    return townStyleCache.get(key);
  }

  function createTownWallTexture(baseColor, trimColor, regionX, regionY) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < canvas.height; row += 8) {
      const shade = 210 + ((row * 9 + regionX * 7) % 24);
      context.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 18}, 0.22)`;
      context.fillRect(0, row, canvas.width, 2);
    }

    context.fillStyle = trimColor;
    for (let column = 0; column < canvas.width; column += 16) {
      context.fillRect(column, 0, 2, canvas.height);
    }
    for (let row = 0; row < canvas.height; row += 16) {
      context.fillRect(0, row, canvas.width, 2);
    }

    for (let index = 0; index < 28; index += 1) {
      const x = Math.floor(
        hash2D('town-wall-speck-x', regionX * 100 + regionY, index) *
          canvas.width
      );
      const y = Math.floor(
        hash2D('town-wall-speck-y', regionY * 100 + regionX, index) *
          canvas.height
      );
      context.fillStyle = 'rgba(255,255,255,0.14)';
      context.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.1, 1.1);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function createTownRoofTexture(baseColor, trimColor, regionX, regionY) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < canvas.height; row += 6) {
      const shift = Math.floor(
        hash2D('town-roof-shift', regionX + row, regionY) * 4
      );
      context.fillStyle = trimColor;
      for (let column = -8 + shift; column < canvas.width + 8; column += 14) {
        context.fillRect(column, row, 10, 2);
      }
      context.fillStyle = 'rgba(255,255,255,0.18)';
      context.fillRect(0, row, canvas.width, 1);
    }

    for (let index = 0; index < 18; index += 1) {
      const x = Math.floor(
        hash2D('town-roof-chip-x', regionX, index) * canvas.width
      );
      const y = Math.floor(
        hash2D('town-roof-chip-y', regionY, index) * canvas.height
      );
      context.fillStyle = 'rgba(35, 20, 20, 0.2)';
      context.fillRect(x, y, 3, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1.2);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function createTintedHex(hex, factor) {
    const normalized = hex.replace('#', '');
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `#${[red, green, blue]
      .map((channel) =>
        Math.max(0, Math.min(255, Math.round(channel * factor)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')}`;
  }

  function getTownDescriptors(tileX, tileY) {
    const key = `${tileX}:${tileY}`;
    if (!townDescriptorCache.has(key)) {
      const complexity = hash2D('town-complexity', tileX, tileY);
      const count = 3 + Math.floor(complexity * 4);
      const descriptors = [];

      for (let index = 0; index < count; index += 1) {
        const baseSeed = `town-building:${tileX}:${tileY}:${index}`;
        const width = 0.28 + hash2D(baseSeed, 1, 0) * 0.22;
        const depth = 0.26 + hash2D(baseSeed, 2, 0) * 0.24;
        const height = 0.55 + hash2D(baseSeed, 3, 0) * 0.55;
        const descriptor = {
          x: (hash2D(baseSeed, 4, 0) - 0.5) * 0.54,
          y: 0,
          z: (hash2D(baseSeed, 5, 0) - 0.5) * 0.54,
          width,
          depth,
          height,
          rotation: hash2D(baseSeed, 6, 0) > 0.5 ? 0 : Math.PI * 0.5,
          roofRadius:
            Math.max(width, depth) * (0.96 + hash2D(baseSeed, 7, 0) * 0.26),
          roofHeight: 0.18 + hash2D(baseSeed, 8, 0) * 0.2,
          windows: [],
        };

        const windowCount = 1 + Math.floor(hash2D(baseSeed, 9, 0) * 3);
        for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
          descriptor.windows.push({
            x:
              ((windowIndex + 1) / (windowCount + 1) - 0.5) *
              descriptor.width *
              0.75,
            y:
              descriptor.height *
              (0.48 + hash2D(baseSeed, 10 + windowIndex, 0) * 0.16),
            width: descriptor.width * 0.12,
            height: descriptor.height * 0.14,
          });
        }

        descriptors.push(descriptor);
      }

      townDescriptorCache.set(key, descriptors);
    }

    return townDescriptorCache.get(key);
  }

  function createSignGroup(state, tileX, tileY) {
    const style = getRegionalSignStyle(tileX, tileY);
    const group = new THREE.Group();
    const nearbyPois = getNearbyPois(state, tileX, tileY);
    const placardCount = Math.max(1, Math.min(3, nearbyPois.length || 1));
    const useSecondPost =
      placardCount > 2 && hash2D('sign-second-post', tileX, tileY) > 0.48;

    const primaryPost = createSignPost(style, placardCount);
    group.add(primaryPost);

    const placards =
      nearbyPois.length > 0
        ? nearbyPois.slice(0, 3)
        : [fallbackPlacard(tileX, tileY)];

    placards.forEach((poi, index) => {
      const mount =
        useSecondPost && index === 2 ? createSecondaryPost(style) : primaryPost;

      if (useSecondPost && index === 2) {
        mount.position.x = 0.18 + style.postThickness * 0.7;
        group.add(mount);
      }

      const signArm = createDirectionalPlacard(style, poi, index);
      mount.add(signArm);
    });

    group.position.set(tileX, 0, tileY);
    return group;
  }

  function createSignPost(style, placardCount) {
    const post = new THREE.Group();
    const postMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        style.postThickness,
        style.postHeight,
        style.postThickness
      ),
      style.postMaterial
    );
    postMesh.position.y = style.postHeight * 0.5;
    post.add(postMesh);

    if (placardCount > 1) {
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(
          style.postThickness * 2.1,
          style.postThickness * 0.8,
          style.postThickness * 2.1
        ),
        style.trimMaterial
      );
      brace.position.y = style.postHeight * 0.78;
      post.add(brace);
    }

    return post;
  }

  function createSecondaryPost(style) {
    const post = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        style.postThickness * 0.92,
        style.postHeight * 0.84,
        style.postThickness * 0.92
      ),
      style.postMaterial
    );
    mesh.position.y = style.postHeight * 0.42;
    post.add(mesh);
    return post;
  }

  function createDirectionalPlacard(style, poi, index) {
    const group = new THREE.Group();
    const width = style.placardWidth * (poi.name.length > 12 ? 1.15 : 1);
    const height = style.placardHeight;
    const depth = style.placardDepth;
    const heading = Math.atan2(poi.dy, poi.dx);
    const rowOffset = style.postHeight * (0.68 - index * 0.14);
    const armLength = 0.14 + index * 0.035;

    group.position.y = rowOffset;
    group.rotation.y = -heading;

    const placard = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      style.placardMaterial
    );
    placard.position.x = width * 0.5 + armLength;
    group.add(placard);

    const arrowHead = new THREE.Mesh(
      new THREE.ConeGeometry(height * 0.46, height * 0.68, 3),
      style.placardMaterial
    );
    arrowHead.rotation.z = -Math.PI / 2;
    arrowHead.position.set(width + armLength + height * 0.12, 0, 0);
    arrowHead.scale.z = 1.35;
    group.add(arrowHead);

    const edgeCap = new THREE.Mesh(
      new THREE.BoxGeometry(depth * 1.4, height * 0.9, depth * 1.4),
      style.trimMaterial
    );
    edgeCap.position.x = width + armLength - depth * 0.2;
    group.add(edgeCap);

    const support = new THREE.Mesh(
      new THREE.BoxGeometry(armLength + 0.06, depth * 0.9, depth * 0.9),
      style.postMaterial
    );
    support.position.x = armLength * 0.5 + 0.03;
    group.add(support);

    const textPlane = createSignLabelSprite(style, poi, width, height);
    textPlane.position.set(width * 0.5 + armLength, 0, depth * 0.65);
    group.add(textPlane);

    const backPlane = createSignLabelSprite(style, poi, width, height);
    backPlane.position.set(width * 0.5 + armLength, 0, -depth * 0.65);
    backPlane.rotation.y = Math.PI;
    group.add(backPlane);

    return group;
  }

  function createSignLabelSprite(style, poi, width, height) {
    const texture = getSignLabelTexture(style, poi);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.92, height * 0.78),
      material
    );
    return plane;
  }

  function getSignLabelTexture(style, poi) {
    const key = `${style.key}:${poi.name}:${poi.arrow}`;
    if (!signLabelCache.has(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = style.placardColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = style.trimColor;
      context.lineWidth = 6;
      context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      context.fillStyle = style.textColor;
      context.font = 'bold 28px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const mainY = poi.distance > 20 ? 34 : 46;
      context.fillText(`${poi.arrow} ${poi.name}`, canvas.width * 0.5, mainY);
      if (poi.distance > 20) {
        context.font = '16px sans-serif';
        context.fillText(`${Math.round(poi.distance)}`, canvas.width * 0.5, 70);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      signLabelCache.set(key, texture);
    }

    return signLabelCache.get(key);
  }

  function getNearbyPois(state, signX, signY) {
    const context = state.getCurrentContext();
    if (context.type !== 'overworld') {
      return [];
    }

    const candidates = [];
    for (let y = signY - 40; y <= signY + 40; y += 1) {
      for (let x = signX - 40; x <= signX + 40; x += 1) {
        if (x === signX && y === signY) continue;
        const tile = state.getCurrentTile(x, y);
        if (!tile.poi?.name) continue;
        const dx = x - signX;
        const dy = y - signY;
        const distance = Math.hypot(dx, dy);
        if (distance > 40) continue;
        candidates.push({
          x,
          y,
          dx,
          dy,
          distance,
          name: tile.poi.name,
          arrow: arrowFromVector(dx, dy),
        });
      }
    }

    return candidates
      .sort((a, b) => a.distance - b.distance)
      .filter(
        (candidate, index, all) =>
          all.findIndex((entry) => entry.name === candidate.name) === index
      )
      .slice(0, 3);
  }

  function fallbackPlacard(tileX, tileY) {
    return {
      x: tileX,
      y: tileY,
      dx: 1,
      dy: 0,
      distance: 0.8,
      name: 'Frontier',
      arrow: 'E',
    };
  }

  function getRegionalSignStyle(tileX, tileY) {
    const regionX = Math.floor(tileX / SIGN_REGION_SIZE);
    const regionY = Math.floor(tileY / SIGN_REGION_SIZE);
    const key = `${regionX}:${regionY}`;

    if (!signStyleCache.has(key)) {
      const postHeight =
        1.12 + hash2D('sign-post-height', regionX, regionY) * 0.42;
      const postThickness =
        0.07 + hash2D('sign-post-thickness', regionX, regionY) * 0.04;
      const placardWidth =
        0.54 + hash2D('sign-placard-width', regionX, regionY) * 0.16;
      const placardHeight =
        0.16 + hash2D('sign-placard-height', regionX, regionY) * 0.05;
      const placardDepth =
        0.035 + hash2D('sign-placard-depth', regionX, regionY) * 0.02;
      const barkTint = hash2D('sign-bark', regionX, regionY);
      const placardTint = hash2D('sign-placard', regionX, regionY);
      const trimTint = hash2D('sign-trim', regionX, regionY);
      const postColor = barkTint > 0.5 ? '#5a3418' : TREE_BARK_COLOR;
      const placardColor = placardTint > 0.45 ? '#f0c979' : '#e2b762';
      const trimColor = trimTint > 0.5 ? '#7c4a1a' : '#8c5b24';
      const textColor = '#24150c';

      signStyleCache.set(key, {
        key,
        postHeight,
        postThickness,
        placardWidth,
        placardHeight,
        placardDepth,
        postColor,
        placardColor,
        trimColor,
        textColor,
        postMaterial: new THREE.MeshStandardMaterial({
          color: postColor,
          roughness: 0.94,
          metalness: 0.02,
        }),
        placardMaterial: new THREE.MeshStandardMaterial({
          color: placardColor,
          roughness: 0.88,
          metalness: 0.02,
        }),
        trimMaterial: new THREE.MeshStandardMaterial({
          color: trimColor,
          roughness: 0.86,
          metalness: 0.03,
        }),
      });
    }

    return signStyleCache.get(key);
  }

  function arrowFromVector(dx, dy) {
    const angle = Math.atan2(dy, dx);
    const octant = Math.round(angle / (Math.PI / 4) + 8) % 8;
    return ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][octant];
  }

  return {
    canOccupy,
    render,
    resize,
  };
}
