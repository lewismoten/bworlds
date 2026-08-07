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
const SIGN_REGION_SIZE = 10;

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
  const signStyleCache = new Map();
  const signLabelCache = new Map();
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
        } else if (tile.kind === 'sign') {
          worldRoot.add(createSignGroup(state, x, y));
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
