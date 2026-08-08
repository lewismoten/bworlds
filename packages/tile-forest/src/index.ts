import { hash2D, octaveNoise2D } from '@bworlds/core';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import { getPoiLightActivation, markPoiLightEmitter } from '@bworlds/poi-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import {
  createCoordinateValueResolver,
  createRegionKey,
  tintHexColor,
} from '@bworlds/procedural-style';
import { createThresholdTerrainClassifier } from '@bworlds/tile-support';
import { createPaintedCanvasTexture } from '@bworlds/three-support';
import type {
  CanOccupy3DContext,
  ClassifyOverworldTileContext,
  Create3DModelContext,
  Paint2DContext,
  RuntimePlugin,
  ThreeGeometryLike,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeObject3DLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const TREE_FOLIAGE_COLOR = '#163b20';
const TREE_BARK_COLOR = '#4a2f1b';
const FIREFLY_KEY = 'forestFirefly';
const FIREFLY_LIGHT_KEY = 'forestFireflyLight';
const FLOOR_DETAIL_KEY = 'forestFloorDetail';
const TREE_CLUSTER_SIZE = 4;
const TREE_REGION_SIZE = 14;

const treeDescriptorCache = new Map<string, ForestTreeDescriptor[]>();
const treeStyleCache = new Map<string, ForestTreeStyle>();
const resolveForestTreeDescriptors = createCoordinateValueResolver(
  treeDescriptorCache,
  ({ tileX, tileY }) => {
    const groveCenterX =
      (hash2D('forest-grove-center-x', tileX, tileY) - 0.5) * 0.36;
    const groveCenterY =
      (hash2D('forest-grove-center-y', tileX, tileY) - 0.5) * 0.36;
    const loneTree =
      hash2D('forest-lone-tree', tileX, tileY) > 0.9 &&
      hash2D('forest-tree-count', tileX, tileY) < 0.25;
    const count = loneTree
      ? 1
      : 3 + Math.floor(hash2D('forest-tree-count', tileX, tileY) * 4);
    const descriptors: ForestTreeDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const baseSeed = `forest-tree:${tileX}:${tileY}:${index}`;
      const variety = getTreeVarietyIndex(tileX, tileY, index);
      const outlierChance = hash2D(baseSeed, 0, 0);
      const spread = loneTree ? 0.06 : outlierChance > 0.84 ? 0.28 : 0.17;
      const descriptor: ForestTreeDescriptor = {
        x: clampToTile(
          groveCenterX + (hash2D(baseSeed, 1, 0) - 0.5) * spread * 2
        ),
        y: clampToTile(
          groveCenterY + (hash2D(baseSeed, 2, 0) - 0.5) * spread * 2
        ),
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
      for (let foliageIndex = 0; foliageIndex < foliageCount; foliageIndex += 1) {
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

    return descriptors;
  }
);
const forestFloorDetailCache = new Map<string, ForestFloorDetailDescriptor[]>();
const resolveForestFloorDetailDescriptors = createCoordinateValueResolver(
  forestFloorDetailCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const details: ForestFloorDetailDescriptor[] = [];
    const denseForest = trees.length >= 5;
    const stumpChance = hash2D('forest-stump-detail', tileX, tileY);
    const fallenTreeChance = hash2D('forest-fallen-detail', tileX, tileY);

    if (stumpChance > (denseForest ? 0.34 : 0.54)) {
      const stump = createForestFloorDetailDescriptor(
        'stump',
        tileX,
        tileY,
        trees,
        0
      );
      if (stump) {
        details.push(stump);
      }
    }

    if (fallenTreeChance > (denseForest ? 0.44 : 0.74)) {
      const fallenTree = createForestFloorDetailDescriptor(
        'fallen-tree',
        tileX,
        tileY,
        trees,
        details.length
      );
      if (fallenTree) {
        details.push(fallenTree);
      }
    }

    return details;
  }
);
const treeGeometryCache = new WeakMap<
  object,
  {
    trunk: ThreeGeometryLike;
    branch: ThreeGeometryLike;
    foliage: ThreeGeometryLike;
  }
>();
type TreeGeometry = NonNullable<ReturnType<typeof treeGeometryCache.get>>;

export function createForestTilePlugin(): RuntimePlugin {
  return createTilePlugin('tile-forest', [
    {
      kind: 'forest',
      definition: {
        name: 'Forest',
        color: '#2f6f3e',
        miniColor: '#429154',
        walkable: true,
        wallHeight: 0.38,
      },
      classifyTerrainTile(context: ClassifyOverworldTileContext) {
        if (
          context.signals.continent <= 0.42 ||
          context.signals.continent >= 0.9
        ) {
          return null;
        }
        if (
          context.signals.elevation >= 0.74 ||
          context.signals.riverSignal >= 0.86
        ) {
          return null;
        }

        const groveSignal = octaveNoise2D(
          `${context.seed}:forest-grove`,
          context.x / 24,
          context.y / 24,
          {
            octaves: 3,
            persistence: 0.58,
          }
        );
        const edgeSignal = octaveNoise2D(
          `${context.seed}:forest-edge`,
          context.x / 9,
          context.y / 9,
          {
            octaves: 2,
            persistence: 0.5,
          }
        );
        const localMoisture = context.sampleTerrainSignals
          ? averageMoisture(context.sampleTerrainSignals, context.x, context.y)
          : context.signals.moisture;
        const clusterStrength =
          context.signals.moisture * 0.3 +
          localMoisture * 0.34 +
          groveSignal * 0.28 +
          edgeSignal * 0.08;
        const loneTreeChance = hash2D(
          `${context.seed}:forest-loner`,
          context.x,
          context.y
        );

          if (clusterStrength >= 0.54) {
            return { kind: 'forest' };
          }
          if (
            context.signals.moisture >= 0.64 &&
            groveSignal >= 0.42 &&
            loneTreeChance >= 0.955
          ) {
            return { kind: 'forest' };
          }

        return null;
      },
      paint2D: createPlainsBackedTilePainter(({ context, x, y, motif, fillRect }) => {
        const trees = 2 + motif.int(0, 2);
        for (let tree = 0; tree < trees; tree += 1) {
          const offset = 2 + tree * 4 + motif.int(-1, 1);
          fillRect(context, x + offset + 1, y + 8, 1, 4, TREE_BARK_COLOR);
          context.fillStyle = TREE_FOLIAGE_COLOR;
          context.beginPath();
          context.arc(x + offset + 1.5, y + 7, 2.6, 0, Math.PI * 2);
          context.fill();
          context.beginPath();
          context.arc(x + offset - 0.2, y + 6.2, 2, 0, Math.PI * 2);
          context.fill();
        }
        return true;
      }),
      create3DModel({
        three,
        tileX,
        tileY,
        detailLevel = 'full',
      }: Create3DModelContext) {
        const group = new three.Group();
        const descriptors =
          detailLevel === 'low'
            ? getForestTreeDescriptors(tileX, tileY).filter(
                (_descriptor, index) => index % 2 === 0
              )
            : getForestTreeDescriptors(tileX, tileY);
        const geometry = getTreeGeometry(three);

        for (const descriptor of descriptors) {
          const style = getTreeStyle(three, tileX, tileY, descriptor.variety);
          const tree = new three.Group();
          tree.position.set(tileX + descriptor.x, 0, tileY + descriptor.y);
          tree.scale.setScalar(descriptor.scale);

          const trunk = new three.Mesh(geometry.trunk, style.trunkMaterial);
          trunk.position.y = descriptor.trunkHeight * 0.5;
          trunk.scale.y = descriptor.trunkHeight;
          tree.add(trunk);

          if (detailLevel === 'low') {
            const canopy = new three.Mesh(
              geometry.foliage,
              style.foliageMaterial
            );
            canopy.position.set(0, descriptor.trunkHeight * 0.9, 0);
            canopy.scale.set(0.84, 0.72, 0.84);
            tree.add(canopy);
            group.add(tree);
            continue;
          }

          for (const branch of descriptor.branches) {
            const limb = new three.Mesh(geometry.branch, style.trunkMaterial);
            limb.position.set(branch.x, branch.y, branch.z);
            limb.rotation.z = branch.roll;
            limb.rotation.x = branch.pitch;
            limb.scale.y = branch.length;
            tree.add(limb);
          }

          for (const clump of descriptor.foliage) {
            const foliage = new three.Mesh(
              geometry.foliage,
              style.foliageMaterial
            );
            foliage.position.set(clump.x, clump.y, clump.z);
            foliage.scale.set(clump.scaleX, clump.scaleY, clump.scaleZ);
            tree.add(foliage);
          }

          group.add(tree);
        }

        if (detailLevel === 'full') {
          const floorDetailStyle = getTreeStyle(three, tileX, tileY, 0);
          for (const detail of getForestFloorDetails(tileX, tileY)) {
            if (detail.kind === 'stump') {
              const stump = new three.Mesh(
                geometry.trunk,
                floorDetailStyle.trunkMaterial
              );
              stump.position.set(
                tileX + detail.x,
                detail.height * 0.5,
                tileY + detail.y
              );
              stump.rotation.y = detail.rotation;
              stump.scale.set(detail.radius, detail.height, detail.radius);
              stump.userData = {
                ...(stump.userData ?? {}),
                [FLOOR_DETAIL_KEY]: detail.kind,
              };
              group.add(stump);
              continue;
            }

            const log = new three.Mesh(
              geometry.trunk,
              floorDetailStyle.trunkMaterial
            );
            log.position.set(tileX + detail.x, detail.radius * 0.8, tileY + detail.y);
            log.rotation.z = Math.PI / 2;
            log.rotation.y = detail.rotation;
            log.scale.set(detail.radius, detail.length, detail.radius);
            log.userData = {
              ...(log.userData ?? {}),
              [FLOOR_DETAIL_KEY]: detail.kind,
            };
            group.add(log);
          }

          for (const firefly of getForestFireflies(three, tileX, tileY)) {
            group.add(firefly);
          }
        }

        return group;
      },
      sync3DModel({ model, cycle, timeMs = 0 }) {
        if (!model || typeof model !== 'object') {
          return;
        }
        syncForestFireflies(model as ThreeObject3DLike, cycle, timeMs);
      },
      canOccupy3D({
        tileX,
        tileY,
        nextX,
        nextY,
        playerRadius,
      }: CanOccupy3DContext) {
        const descriptors = getForestTreeDescriptors(tileX, tileY);
        for (const descriptor of descriptors) {
          const dx = nextX - (tileX + descriptor.x);
          const dy = nextY - (tileY + descriptor.y);
          const distance = Math.hypot(dx, dy);
          if (distance < descriptor.radius + playerRadius) {
            return false;
          }
        }
        return true;
      },
    },
  ]);
}

function getTreeGeometry(three: ThreeHostLike): TreeGeometry {
  if (!treeGeometryCache.has(three)) {
    treeGeometryCache.set(three, {
      trunk: new three.CylinderGeometry(0.075, 0.1, 1, 6),
      branch: new three.CylinderGeometry(0.028, 0.045, 0.45, 5),
      foliage: new three.SphereGeometry(0.34, 6, 6),
    });
  }
  return treeGeometryCache.get(three)!;
}

function getForestTreeDescriptors(
  tileX: number,
  tileY: number
): ForestTreeDescriptor[] {
  return resolveForestTreeDescriptors(tileX, tileY);
}

export function getForestFloorDetails(
  tileX: number,
  tileY: number
): ForestFloorDetailDescriptor[] {
  return resolveForestFloorDetailDescriptors(tileX, tileY);
}

function getTreeVarietyIndex(
  tileX: number,
  tileY: number,
  treeIndex: number
): number {
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

function getTreeStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  variety: number
) {
  const {
    regionX,
    regionY,
    key: regionKey,
  } = createRegionKey(tileX, tileY, TREE_REGION_SIZE);
  const key = `${regionKey}:${variety}`;

  if (!treeStyleCache.has(key)) {
    const barkBase = tintHexColor(
      TREE_BARK_COLOR,
      0.82 + hash2D('tree-bark-tint', regionX + variety, regionY) * 0.32
    );
    const foliageBase = tintHexColor(
      TREE_FOLIAGE_COLOR,
      0.82 + hash2D('tree-foliage-tint', regionX, regionY + variety) * 0.34
    );

    const barkTexture = createTreeBarkTexture(
      three,
      barkBase,
      regionX,
      regionY,
      variety
    );
    const foliageTexture = createTreeFoliageTexture(
      three,
      foliageBase,
      regionX,
      regionY,
      variety
    );

    treeStyleCache.set(key, {
      trunkMaterial: new three.MeshStandardMaterial({
        color: '#ffffff',
        map: barkTexture,
        roughness: 0.95,
        metalness: 0.02,
      }),
      foliageMaterial: new three.MeshStandardMaterial({
        color: '#ffffff',
        map: foliageTexture,
        roughness: 0.98,
        metalness: 0.01,
        flatShading: true,
      }),
    });
  }

  return treeStyleCache.get(key)!;
}

function getForestFireflies(three: ThreeHostLike, tileX: number, tileY: number) {
  const count = 2 + Math.floor(hash2D('forest-firefly-count', tileX, tileY) * 2);
  const fireflies = [];

  for (let index = 0; index < count; index += 1) {
    const group = new three.Group();
    const phase = hash2D('forest-firefly-phase', tileX * 17 + index, tileY * 13);
    const drift = hash2D('forest-firefly-drift', tileX + index, tileY - index);
    group.userData = {
      ...(group.userData ?? {}),
      [FIREFLY_KEY]: {
        phase,
        drift,
        baseX: (hash2D('forest-firefly-x', tileX + index, tileY) - 0.5) * 0.56,
        baseZ: (hash2D('forest-firefly-z', tileX, tileY + index) - 0.5) * 0.56,
        baseY: 0.32 + hash2D('forest-firefly-y', tileX - index, tileY + index) * 0.34,
      },
    };

    const glow = markPoiLightEmitter(
      new three.Mesh(
        new three.SphereGeometry(0.028, 6, 6),
        new three.MeshStandardMaterial({
          color: '#d9ff8a',
          emissive: '#d9ff8a',
          emissiveIntensity: 0,
          roughness: 0.18,
          metalness: 0.02,
        })
      ),
      {
        kind: 'emissive-mesh',
        dayIntensity: 0,
        nightIntensity: 0.92,
      }
    );
    group.add(glow);

    if (index === 0) {
      const light = markPoiLightEmitter(
        new three.PointLight('#d9ff8a', 0, 1.9, 2.1),
        {
          kind: 'point-light',
          nightIntensity: 0.22,
          visibleThreshold: 0.02,
        }
      );
      light.userData = {
        ...(light.userData ?? {}),
        [FIREFLY_LIGHT_KEY]: true,
      };
      light.visible = false;
      group.add(light);
    }

    fireflies.push(group);
  }

  return fireflies;
}

function createForestFloorDetailDescriptor(
  kind: ForestFloorDetailDescriptor['kind'],
  tileX: number,
  tileY: number,
  trees: ForestTreeDescriptor[],
  detailIndex: number
): ForestFloorDetailDescriptor | null {
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = `forest-floor:${kind}:${tileX}:${tileY}:${detailIndex}:${attempt}`;
    const x = clampToTile((hash2D(seed, 1, 0) - 0.5) * 0.56);
    const y = clampToTile((hash2D(seed, 2, 0) - 0.5) * 0.56);
    const clearance = kind === 'stump' ? 0.09 : 0.12;
    const nearTree = trees.some((tree) => {
      const distance = Math.hypot(x - tree.x, y - tree.y);
      return distance < tree.radius + clearance;
    });

    if (nearTree) {
      continue;
    }

    if (kind === 'stump') {
      return {
        kind,
        x,
        y,
        rotation: hash2D(seed, 3, 0) * Math.PI * 2,
        radius: 0.48 + hash2D(seed, 4, 0) * 0.24,
        height: 0.12 + hash2D(seed, 5, 0) * 0.08,
      };
    }

    return {
      kind,
      x,
      y,
      rotation: hash2D(seed, 3, 0) * Math.PI * 2,
      radius: 0.34 + hash2D(seed, 4, 0) * 0.12,
      length: 0.42 + hash2D(seed, 5, 0) * 0.24,
      height: 0.12,
    };
  }

  return null;
}

function syncForestFireflies(
  root: ThreeObject3DLike,
  cycle: { daylight: number; twilight: number; night: number },
  timeMs: number
) {
  const activation = getPoiLightActivation(cycle);
  root.traverse?.((node) => {
    const firefly = node.userData?.[FIREFLY_KEY] as
      | {
          phase: number;
          drift: number;
          baseX: number;
          baseY: number;
          baseZ: number;
        }
      | undefined;
    if (!firefly) {
      return;
    }

    const flutter =
      timeMs * (0.0014 + firefly.drift * 0.0011) + firefly.phase * Math.PI * 2;
    const pulse = (Math.sin(flutter * 1.9) + 1) * 0.5;
    const swayX = Math.cos(flutter) * 0.05;
    const swayY = Math.sin(flutter * 1.6) * 0.04;
    const swayZ = Math.sin(flutter * 1.2) * 0.05;
    node.position.set(
      firefly.baseX + swayX,
      firefly.baseY + swayY,
      firefly.baseZ + swayZ
    );
    node.visible = activation > 0.08;

    node.traverse?.((child) => {
      if (child === node) {
        return;
      }
      const tagged = child as ThreeObject3DLike & {
        material?: ThreeMaterialLike | ThreeMaterialLike[];
        intensity?: number;
      };
      if (child.userData?.poiNightLightEmitter && tagged.material) {
        const materials = Array.isArray(tagged.material)
          ? tagged.material
          : [tagged.material];
        materials.forEach((material) => {
          (material as ThreeMaterialLike & { emissiveIntensity?: number }).emissiveIntensity =
            activation * pulse * 0.92;
        });
      }
      if (child.userData?.[FIREFLY_LIGHT_KEY] && typeof tagged.intensity === 'number') {
        tagged.intensity = activation * pulse * 0.22;
        child.visible = tagged.intensity > 0.02;
      }
    });
  });
}

function averageMoisture(
  sampleTerrainSignals: NonNullable<
    ClassifyOverworldTileContext['sampleTerrainSignals']
  >,
  x: number,
  y: number
) {
  const samples = [
    sampleTerrainSignals(x, y).moisture,
    sampleTerrainSignals(x + 1, y).moisture,
    sampleTerrainSignals(x - 1, y).moisture,
    sampleTerrainSignals(x, y + 1).moisture,
    sampleTerrainSignals(x, y - 1).moisture,
  ];
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

function clampToTile(value: number): number {
  return Math.max(-0.34, Math.min(0.34, value));
}

function createTreeBarkTexture(
  three: ThreeHostLike,
  baseColor: string,
  regionX: number,
  regionY: number,
  variety: number
) {
  return createPaintedCanvasTexture(three, {
    width: 64,
    height: 64,
    repeatX: 1.2,
    repeatY: 1.2,
    paint(context, canvas) {
      context.fillStyle = baseColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      for (let x = 0; x < canvas.width; x += 5) {
        const darkness = 34 + ((x * 9 + variety * 17) % 26);
        context.fillStyle = `rgba(${darkness}, ${darkness - 6}, ${darkness - 10}, 0.28)`;
        context.fillRect(x, 0, 2, canvas.height);
      }

      for (let index = 0; index < 120; index += 1) {
        const x = Math.floor(
          hash2D('tree-bark-crack-x', regionX * 31 + variety, index) *
            canvas.width
        );
        const y = Math.floor(
          hash2D('tree-bark-crack-y', regionY * 29 + variety, index) *
            canvas.height
        );
        const height =
          3 + Math.floor(hash2D('tree-bark-crack-h', index, variety) * 8);
        context.fillStyle = 'rgba(20, 12, 8, 0.22)';
        context.fillRect(x, y, 1, height);
      }
    },
  });
}

function createTreeFoliageTexture(
  three: ThreeHostLike,
  baseColor: string,
  regionX: number,
  regionY: number,
  variety: number
) {
  return createPaintedCanvasTexture(three, {
    width: 64,
    height: 64,
    repeatX: 1.15,
    repeatY: 1.15,
    paint(context, canvas) {
      context.fillStyle = baseColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      for (let index = 0; index < 180; index += 1) {
        const x = Math.floor(
          hash2D('tree-leaf-x', regionX * 17 + variety, index) * canvas.width
        );
        const y = Math.floor(
          hash2D('tree-leaf-y', regionY * 19 + variety, index) * canvas.height
        );
        const size = 1 + Math.floor(hash2D('tree-leaf-s', index, variety) * 3);
        const tint =
          90 + Math.floor(hash2D('tree-leaf-b', index, regionX + regionY) * 80);
        context.fillStyle = `rgba(${24 + (tint % 40)}, ${tint}, ${30 + (tint % 30)}, 0.22)`;
        context.fillRect(x, y, size, size);
      }

      for (let row = 0; row < canvas.height; row += 8) {
        context.fillStyle = 'rgba(255,255,255,0.08)';
        context.fillRect(0, row, canvas.width, 1);
      }
    },
  });
}
interface ForestTreeStyle {
  trunkMaterial: ThreeMaterialLike;
  foliageMaterial: ThreeMaterialLike;
}

interface ForestBranchDescriptor {
  x: number;
  y: number;
  z: number;
  length: number;
  pitch: number;
  roll: number;
}

interface ForestFoliageDescriptor {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

interface ForestTreeDescriptor {
  x: number;
  y: number;
  radius: number;
  scale: number;
  trunkHeight: number;
  variety: number;
  branches: ForestBranchDescriptor[];
  foliage: ForestFoliageDescriptor[];
}

interface ForestFloorDetailDescriptor {
  kind: 'stump' | 'fallen-tree';
  x: number;
  y: number;
  rotation: number;
  radius: number;
  height: number;
  length?: number;
}
