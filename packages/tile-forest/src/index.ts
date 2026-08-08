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
const BUSH_KEY = 'forestBush';
const LANDMARK_KEY = 'forestLandmark';
const HOLLOW_KEY = 'forestHollow';
const OWL_KEY = 'forestOwl';
const CARVING_KEY = 'forestCarving';
const MEADOW_KEY = 'forestMeadow';
const BIRD_KEY = 'forestBird';
const TREE_CLUSTER_SIZE = 4;
const TREE_REGION_SIZE = 14;

const treeDescriptorCache = new Map<string, ForestTreeDescriptor[]>();
const treeStyleCache = new Map<string, ForestTreeStyle>();
const resolveForestTreeDescriptors = createCoordinateValueResolver(
  treeDescriptorCache,
  ({ tileX, tileY }) => {
    const groveCenter = getForestGroveCenter(tileX, tileY);
    const loneTree = hasForestLoneTree(tileX, tileY);
    const count = getForestTreeCount(tileX, tileY);
    const landmark = getForestLandmark(tileX, tileY);
    const descriptors: ForestTreeDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const baseSeed = `forest-tree:${tileX}:${tileY}:${index}`;
      const variety = getTreeVarietyIndex(tileX, tileY, index);
      const outlierChance = hash2D(baseSeed, 0, 0);
      const spread = loneTree ? 0.06 : outlierChance > 0.84 ? 0.28 : 0.17;
      const descriptor: ForestTreeDescriptor = {
        x: clampToTile(
          groveCenter.x + (hash2D(baseSeed, 1, 0) - 0.5) * spread * 2
        ),
        y: clampToTile(
          groveCenter.y + (hash2D(baseSeed, 2, 0) - 0.5) * spread * 2
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

      if (landmark) {
        const distanceFromLandmark = Math.hypot(
          descriptor.x - landmark.x,
          descriptor.y - landmark.y
        );
        if (distanceFromLandmark < landmark.ringRadius + 0.1) {
          continue;
        }
      }

      descriptors.push(descriptor);
    }

    return descriptors;
  }
);
const forestLandmarkCache = new Map<string, ForestLandmarkDescriptor | null>();
const resolveForestLandmarkDescriptor = createCoordinateValueResolver(
  forestLandmarkCache,
  ({ tileX, tileY }) => {
    const treeCount = getForestTreeCount(tileX, tileY);
    if (treeCount < 5) {
      return null;
    }

    const landmarkChance = hash2D('forest-landmark', tileX, tileY);
    if (landmarkChance < 0.8) {
      return null;
    }

    const groveCenter = getForestGroveCenter(tileX, tileY);
    const kind: ForestLandmarkDescriptor['kind'] =
      hash2D('forest-landmark-kind', tileX, tileY) > 0.54
        ? 'mushroom-ring'
        : 'stone-ring';
    return {
      kind,
      x: clampToTile(groveCenter.x * 0.45),
      y: clampToTile(groveCenter.y * 0.45),
      rotation: hash2D('forest-landmark-rotation', tileX, tileY) * Math.PI * 2,
      ringRadius: 0.16 + hash2D('forest-landmark-radius', tileX, tileY) * 0.05,
      memberCount: 5 + Math.floor(hash2D('forest-landmark-members', tileX, tileY) * 3),
      scale: 0.8 + hash2D('forest-landmark-scale', tileX, tileY) * 0.35,
    };
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
    const interiorChance = hash2D('forest-interior-floor-detail', tileX, tileY);

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

    if (denseForest && interiorChance > 0.58) {
      const interiorKind: ForestFloorDetailDescriptor['kind'] =
        interiorChance > 0.8 ? 'fallen-tree' : 'stump';
      const interiorDetail = createForestFloorDetailDescriptor(
        interiorKind,
        tileX,
        tileY,
        trees,
        details.length,
        {
          preferInterior: true,
        }
      );
      if (interiorDetail) {
        details.push(interiorDetail);
      }
    }

    return details;
  }
);
const forestBushCache = new Map<string, ForestBushDescriptor[]>();
const resolveForestBushDescriptors = createCoordinateValueResolver(
  forestBushCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const floorDetails = resolveForestFloorDetailDescriptors(tileX, tileY);
    const landmark = getForestLandmark(tileX, tileY);
    const count = Math.floor(hash2D('forest-bush-count', tileX, tileY) * 3);
    const bushes: ForestBushDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const bush = createForestBushDescriptor(
        tileX,
        tileY,
        index,
        trees,
        floorDetails,
        landmark
      );
      if (bush) {
        bushes.push(bush);
      }
    }

    return bushes;
  }
);
const forestHollowCache = new Map<string, ForestHollowDescriptor[]>();
const resolveForestHollowDescriptors = createCoordinateValueResolver(
  forestHollowCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const landmark = getForestLandmark(tileX, tileY);
    const hollows: ForestHollowDescriptor[] = [];

    trees.forEach((tree, treeIndex) => {
      const chance = hash2D('forest-hollow', tileX * 17 + treeIndex, tileY * 19);
      if (chance < 0.78) {
        return;
      }

      if (landmark) {
        const distanceFromLandmark = Math.hypot(tree.x - landmark.x, tree.y - landmark.y);
        if (distanceFromLandmark < landmark.ringRadius + 0.08) {
          return;
        }
      }

      hollows.push({
        treeIndex,
        sideOffset: chance > 0.9 ? 1 : -1,
        height: tree.trunkHeight * (0.38 + hash2D('forest-hollow-height', treeIndex, tileY) * 0.16),
        scale: 0.12 + hash2D('forest-hollow-scale', tileX + treeIndex, tileY) * 0.05,
        depth: 0.08 + hash2D('forest-hollow-depth', tileX, tileY + treeIndex) * 0.03,
      });
    });

    return hollows;
  }
);
const forestOwlCache = new Map<string, ForestOwlDescriptor[]>();
const resolveForestOwlDescriptors = createCoordinateValueResolver(
  forestOwlCache,
  ({ tileX, tileY }) => {
    const hollows = resolveForestHollowDescriptors(tileX, tileY);
    const owls: ForestOwlDescriptor[] = [];

    hollows.forEach((hollow, hollowIndex) => {
      const chance = hash2D('forest-owl', tileX * 23 + hollowIndex, tileY * 29);
      if (chance < 0.58) {
        return;
      }

      owls.push({
        hollowIndex,
        bodyScale: 0.08 + hash2D('forest-owl-body', tileX + hollowIndex, tileY) * 0.03,
        eyeSpread: 0.022 + hash2D('forest-owl-eye-spread', tileX, tileY + hollowIndex) * 0.012,
        perchOffset: 0.01 + hash2D('forest-owl-perch', tileX - hollowIndex, tileY) * 0.02,
      });
    });

    return owls;
  }
);
const forestCarvingCache = new Map<string, ForestCarvingDescriptor[]>();
const resolveForestCarvingDescriptors = createCoordinateValueResolver(
  forestCarvingCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const carvings: ForestCarvingDescriptor[] = [];

    trees.forEach((tree, treeIndex) => {
      const chance = hash2D('forest-carving', tileX * 31 + treeIndex, tileY * 37);
      if (chance < 0.88) {
        return;
      }

      carvings.push({
        treeIndex,
        sideOffset: chance > 0.94 ? 1 : -1,
        height:
          tree.trunkHeight *
          (0.44 + hash2D('forest-carving-height', treeIndex, tileY) * 0.14),
        scale: 0.018 + hash2D('forest-carving-scale', tileX + treeIndex, tileY) * 0.006,
        text: 'LM+FG',
      });
    });

    return carvings;
  }
);
const forestMeadowCache = new Map<string, ForestMeadowDescriptor[]>();
const resolveForestMeadowDescriptors = createCoordinateValueResolver(
  forestMeadowCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const landmark = getForestLandmark(tileX, tileY);
    const count = hash2D('forest-meadow-count', tileX, tileY) > 0.86 ? 1 : 0;
    const meadows: ForestMeadowDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const meadow = createForestMeadowDescriptor(tileX, tileY, index, trees, landmark);
      if (meadow) {
        meadows.push(meadow);
      }
    }

    return meadows;
  }
);
const forestBirdCache = new Map<string, ForestBirdDescriptor[]>();
const resolveForestBirdDescriptors = createCoordinateValueResolver(
  forestBirdCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const count = hash2D('forest-bird-count', tileX, tileY) > 0.72 ? 1 : 0;
    const birds: ForestBirdDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const seed = `forest-bird:${tileX}:${tileY}:${index}`;
      const averageHeight =
        trees.reduce((sum, tree) => sum + tree.trunkHeight * tree.scale, 0) /
        Math.max(1, trees.length);
      birds.push({
        x: (hash2D(seed, 1, 0) - 0.5) * 0.58,
        y: (hash2D(seed, 2, 0) - 0.5) * 0.58,
        height: 0.92 + averageHeight * 0.46 + hash2D(seed, 3, 0) * 0.3,
        radius: 0.12 + hash2D(seed, 4, 0) * 0.1,
        phase: hash2D(seed, 5, 0),
        speed: 0.0008 + hash2D(seed, 6, 0) * 0.0007,
        wingScale: 0.05 + hash2D(seed, 7, 0) * 0.02,
      });
    }

    return birds;
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
          const hollows = getForestTreeHollows(tileX, tileY);
          for (const hollow of hollows) {
            const treeDescriptor = descriptors[hollow.treeIndex];
            if (!treeDescriptor) {
              continue;
            }

            const hollowMesh = new three.Mesh(
              geometry.foliage,
              floorDetailStyle.hollowMaterial
            );
            hollowMesh.position.set(
              tileX + treeDescriptor.x + treeDescriptor.radius * 0.7 * hollow.sideOffset,
              hollow.height,
              tileY + treeDescriptor.y
            );
            hollowMesh.scale.set(hollow.scale, hollow.scale * 0.82, hollow.depth);
            hollowMesh.userData = {
              ...(hollowMesh.userData ?? {}),
              [HOLLOW_KEY]: true,
            };
            group.add(hollowMesh);
          }
          for (const owl of getForestOwls(tileX, tileY)) {
            const hollow = hollows[owl.hollowIndex];
            const treeDescriptor = hollow
              ? descriptors[hollow.treeIndex]
              : null;
            if (!hollow || !treeDescriptor) {
              continue;
            }

            const owlBody = new three.Mesh(
              geometry.foliage,
              floorDetailStyle.owlBodyMaterial
            );
            owlBody.position.set(
              tileX +
                treeDescriptor.x +
                treeDescriptor.radius * 0.56 * hollow.sideOffset,
              hollow.height - owl.perchOffset,
              tileY + treeDescriptor.y + hollow.depth * 0.2
            );
            owlBody.scale.set(
              owl.bodyScale,
              owl.bodyScale * 1.18,
              owl.bodyScale * 0.92
            );
            owlBody.userData = {
              ...(owlBody.userData ?? {}),
              [OWL_KEY]: true,
            };
            group.add(owlBody);

            const leftEye = new three.Mesh(
              geometry.foliage,
              floorDetailStyle.owlEyeMaterial
            );
            leftEye.position.set(
              owlBody.position.x + owl.eyeSpread * 0.5,
              owlBody.position.y + owl.bodyScale * 0.16,
              owlBody.position.z + owl.bodyScale * 0.68
            );
            leftEye.scale.setScalar(owl.bodyScale * 0.16);
            leftEye.userData = {
              ...(leftEye.userData ?? {}),
              [OWL_KEY]: true,
            };
            group.add(leftEye);

            const rightEye = new three.Mesh(
              geometry.foliage,
              floorDetailStyle.owlEyeMaterial
            );
            rightEye.position.set(
              owlBody.position.x - owl.eyeSpread * 0.5,
              owlBody.position.y + owl.bodyScale * 0.16,
              owlBody.position.z + owl.bodyScale * 0.68
            );
            rightEye.scale.setScalar(owl.bodyScale * 0.16);
            rightEye.userData = {
              ...(rightEye.userData ?? {}),
              [OWL_KEY]: true,
            };
            group.add(rightEye);
          }
          for (const carving of getForestCarvings(tileX, tileY)) {
            const treeDescriptor = descriptors[carving.treeIndex];
            if (!treeDescriptor) {
              continue;
            }

            for (const marker of getForestCarvingMarkers(carving)) {
              const notch = new three.Mesh(
                geometry.foliage,
                floorDetailStyle.carvingMaterial
              );
              notch.position.set(
                tileX +
                  treeDescriptor.x +
                  treeDescriptor.radius * 0.74 * carving.sideOffset,
                carving.height + marker.y * carving.scale,
                tileY + treeDescriptor.y + marker.x * carving.scale
              );
              notch.scale.setScalar(carving.scale);
              notch.userData = {
                ...(notch.userData ?? {}),
                [CARVING_KEY]: carving.text,
              };
              group.add(notch);
            }
          }
          for (const meadow of getForestMeadows(tileX, tileY)) {
            const patch = new three.Mesh(
              geometry.foliage,
              floorDetailStyle.meadowGrassMaterial
            );
            patch.position.set(tileX + meadow.x, 0.03, tileY + meadow.y);
            patch.scale.set(meadow.radiusX, 0.08, meadow.radiusY);
            patch.userData = {
              ...(patch.userData ?? {}),
              [MEADOW_KEY]: 'grass',
            };
            group.add(patch);

            meadow.flowers.forEach((flower) => {
              const stem = new three.Mesh(
                geometry.branch,
                floorDetailStyle.meadowStemMaterial
              );
              stem.position.set(
                tileX + meadow.x + flower.x,
                0.08,
                tileY + meadow.y + flower.y
              );
              stem.scale.set(0.22, flower.height, 0.22);
              stem.userData = {
                ...(stem.userData ?? {}),
                [MEADOW_KEY]: 'flower-stem',
              };
              group.add(stem);

              const bloom = new three.Mesh(
                geometry.foliage,
                flower.color === 'white'
                  ? floorDetailStyle.meadowFlowerWhiteMaterial
                  : floorDetailStyle.meadowFlowerYellowMaterial
              );
              bloom.position.set(
                tileX + meadow.x + flower.x,
                0.12 + flower.height,
                tileY + meadow.y + flower.y
              );
              bloom.scale.setScalar(flower.scale);
              bloom.userData = {
                ...(bloom.userData ?? {}),
                [MEADOW_KEY]: flower.color,
              };
              group.add(bloom);
            });
          }
          for (const bird of getForestBirds(tileX, tileY)) {
            const birdGroup = new three.Group();
            birdGroup.userData = {
              ...(birdGroup.userData ?? {}),
              [BIRD_KEY]: bird,
            };

            const leftWing = new three.Mesh(
              geometry.branch,
              floorDetailStyle.birdMaterial
            );
            leftWing.position.set(-bird.wingScale * 0.5, 0, 0);
            leftWing.rotation.z = -0.35;
            leftWing.scale.set(0.18, bird.wingScale, 0.18);
            birdGroup.add(leftWing);

            const rightWing = new three.Mesh(
              geometry.branch,
              floorDetailStyle.birdMaterial
            );
            rightWing.position.set(bird.wingScale * 0.5, 0, 0);
            rightWing.rotation.z = 0.35;
            rightWing.scale.set(0.18, bird.wingScale, 0.18);
            birdGroup.add(rightWing);

            const body = new three.Mesh(
              geometry.foliage,
              floorDetailStyle.birdMaterial
            );
            body.scale.set(bird.wingScale * 0.55, bird.wingScale * 0.3, bird.wingScale * 0.3);
            birdGroup.add(body);
            group.add(birdGroup);
          }
          const landmark = getForestLandmark(tileX, tileY);
          if (landmark) {
            createForestLandmarkMeshes(
              three,
              group,
              tileX,
              tileY,
              landmark,
              floorDetailStyle
            );
          }
          for (const bush of getForestBushes(tileX, tileY)) {
            const shrub = new three.Mesh(
              geometry.foliage,
              floorDetailStyle.foliageMaterial
            );
            shrub.position.set(tileX + bush.x, bush.height, tileY + bush.y);
            shrub.scale.set(bush.width, bush.height, bush.depth);
            shrub.userData = {
              ...(shrub.userData ?? {}),
              [BUSH_KEY]: true,
            };
            group.add(shrub);
          }
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
        syncForestBirds(model as ThreeObject3DLike, timeMs);
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

export function getForestLandmark(
  tileX: number,
  tileY: number
): ForestLandmarkDescriptor | null {
  return resolveForestLandmarkDescriptor(tileX, tileY);
}

export function getForestBushes(
  tileX: number,
  tileY: number
): ForestBushDescriptor[] {
  return resolveForestBushDescriptors(tileX, tileY);
}

export function getForestTreeHollows(
  tileX: number,
  tileY: number
): ForestHollowDescriptor[] {
  return resolveForestHollowDescriptors(tileX, tileY);
}

export function getForestOwls(
  tileX: number,
  tileY: number
): ForestOwlDescriptor[] {
  return resolveForestOwlDescriptors(tileX, tileY);
}

export function getForestCarvings(
  tileX: number,
  tileY: number
): ForestCarvingDescriptor[] {
  return resolveForestCarvingDescriptors(tileX, tileY);
}

export function getForestMeadows(
  tileX: number,
  tileY: number
): ForestMeadowDescriptor[] {
  return resolveForestMeadowDescriptors(tileX, tileY);
}

export function getForestBirds(
  tileX: number,
  tileY: number
): ForestBirdDescriptor[] {
  return resolveForestBirdDescriptors(tileX, tileY);
}

function getForestGroveCenter(tileX: number, tileY: number) {
  return {
    x: (hash2D('forest-grove-center-x', tileX, tileY) - 0.5) * 0.36,
    y: (hash2D('forest-grove-center-y', tileX, tileY) - 0.5) * 0.36,
  };
}

function hasForestLoneTree(tileX: number, tileY: number) {
  return (
    hash2D('forest-lone-tree', tileX, tileY) > 0.9 &&
    hash2D('forest-tree-count', tileX, tileY) < 0.25
  );
}

function getForestTreeCount(tileX: number, tileY: number) {
  return hasForestLoneTree(tileX, tileY)
    ? 1
    : 3 + Math.floor(hash2D('forest-tree-count', tileX, tileY) * 4);
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
      stoneMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#7f847a',
          0.86 + hash2D('tree-stone-tint', regionX, regionY + variety) * 0.24
        ),
        roughness: 0.99,
        metalness: 0.01,
        flatShading: true,
      }),
      mushroomCapMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#c75442',
          0.84 + hash2D('tree-mushroom-cap-tint', regionX + variety, regionY) * 0.28
        ),
        roughness: 0.88,
        metalness: 0.01,
        flatShading: true,
      }),
      mushroomStemMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#ded6bb',
          0.9 + hash2D('tree-mushroom-stem-tint', regionX, regionY + variety) * 0.14
        ),
        roughness: 0.94,
        metalness: 0.01,
      }),
      hollowMaterial: new three.MeshStandardMaterial({
        color: '#120b07',
        roughness: 1,
        metalness: 0,
      }),
      owlBodyMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#6b4d31',
          0.92 + hash2D('tree-owl-body-tint', regionX, regionY + variety) * 0.18
        ),
        roughness: 0.98,
        metalness: 0.01,
      }),
      owlEyeMaterial: new three.MeshStandardMaterial({
        color: '#f6e6a0',
        roughness: 0.82,
        metalness: 0.02,
      }),
      carvingMaterial: new three.MeshStandardMaterial({
        color: '#d3a06d',
        roughness: 0.96,
        metalness: 0.01,
      }),
      meadowGrassMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#79a85a',
          0.92 + hash2D('tree-meadow-grass-tint', regionX, regionY + variety) * 0.16
        ),
        roughness: 0.98,
        metalness: 0.01,
      }),
      meadowStemMaterial: new three.MeshStandardMaterial({
        color: '#5f8d41',
        roughness: 0.98,
        metalness: 0.01,
      }),
      meadowFlowerWhiteMaterial: new three.MeshStandardMaterial({
        color: '#fff5df',
        roughness: 0.9,
        metalness: 0.01,
      }),
      meadowFlowerYellowMaterial: new three.MeshStandardMaterial({
        color: '#f3cf62',
        roughness: 0.9,
        metalness: 0.01,
      }),
      birdMaterial: new three.MeshStandardMaterial({
        color: '#2f2420',
        roughness: 0.95,
        metalness: 0.01,
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
  detailIndex: number,
  options: {
    preferInterior?: boolean;
  } = {}
): ForestFloorDetailDescriptor | null {
  const landmark = getForestLandmark(tileX, tileY);
  const maxAttempts = options.preferInterior ? 6 : 4;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = `forest-floor:${kind}:${tileX}:${tileY}:${detailIndex}:${attempt}`;
    const spread = options.preferInterior ? 0.24 : 0.56;
    const x = clampToTile((hash2D(seed, 1, 0) - 0.5) * spread);
    const y = clampToTile((hash2D(seed, 2, 0) - 0.5) * spread);
    const clearance = kind === 'stump' ? 0.09 : 0.12;
    const nearTree = trees.some((tree) => {
      const distance = Math.hypot(x - tree.x, y - tree.y);
      return distance < tree.radius + clearance;
    });

    if (nearTree) {
      continue;
    }
    if (landmark) {
      const distanceFromLandmark = Math.hypot(x - landmark.x, y - landmark.y);
      if (distanceFromLandmark < landmark.ringRadius + 0.08) {
        continue;
      }
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

function createForestBushDescriptor(
  tileX: number,
  tileY: number,
  bushIndex: number,
  trees: ForestTreeDescriptor[],
  floorDetails: ForestFloorDetailDescriptor[],
  landmark: ForestLandmarkDescriptor | null
): ForestBushDescriptor | null {
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = `forest-bush:${tileX}:${tileY}:${bushIndex}:${attempt}`;
    const x = clampToTile((hash2D(seed, 1, 0) - 0.5) * 0.6);
    const y = clampToTile((hash2D(seed, 2, 0) - 0.5) * 0.6);
    const width = 0.26 + hash2D(seed, 3, 0) * 0.12;
    const depth = 0.24 + hash2D(seed, 4, 0) * 0.12;
    const height = 0.14 + hash2D(seed, 5, 0) * 0.1;
    const bushRadius = Math.max(width, depth) * 0.42;
    const nearTree = trees.some((tree) => {
      const distance = Math.hypot(x - tree.x, y - tree.y);
      return distance < tree.radius + bushRadius;
    });
    if (nearTree) {
      continue;
    }

    const nearFloorDetail = floorDetails.some((detail) => {
      const distance = Math.hypot(x - detail.x, y - detail.y);
      const detailRadius = (detail.length ?? detail.radius) * 0.3;
      return distance < detailRadius + bushRadius + 0.04;
    });
    if (nearFloorDetail) {
      continue;
    }

    if (landmark) {
      const distanceFromLandmark = Math.hypot(x - landmark.x, y - landmark.y);
      if (distanceFromLandmark < landmark.ringRadius + bushRadius + 0.05) {
        continue;
      }
    }

    return {
      x,
      y,
      width,
      depth,
      height,
    };
  }

  return null;
}

function createForestLandmarkMeshes(
  three: ThreeHostLike,
  group: ThreeObject3DLike,
  tileX: number,
  tileY: number,
  landmark: ForestLandmarkDescriptor,
  style: ForestTreeStyle
) {
  for (let index = 0; index < landmark.memberCount; index += 1) {
    const angle =
      landmark.rotation + (index / landmark.memberCount) * Math.PI * 2;
    const x = tileX + landmark.x + Math.cos(angle) * landmark.ringRadius;
    const z = tileY + landmark.y + Math.sin(angle) * landmark.ringRadius;

    if (landmark.kind === 'stone-ring') {
      const stone = new three.Mesh(
        new three.SphereGeometry(0.12, 6, 6),
        style.stoneMaterial
      );
      stone.position.set(x, 0.12, z);
      stone.scale.set(
        0.7 * landmark.scale,
        1 + (index % 2) * 0.25,
        0.58 * landmark.scale
      );
      stone.rotation.y = angle;
      stone.userData = {
        ...(stone.userData ?? {}),
        [LANDMARK_KEY]: landmark.kind,
      };
      group.add(stone);
      continue;
    }

    const stem = new three.Mesh(
      new three.CylinderGeometry(0.03, 0.05, 0.18, 6),
      style.mushroomStemMaterial
    );
    stem.position.set(x, 0.1, z);
    stem.scale.setScalar(landmark.scale);
    stem.userData = {
      ...(stem.userData ?? {}),
      [LANDMARK_KEY]: landmark.kind,
    };
    group.add(stem);

    const cap = new three.Mesh(
      new three.SphereGeometry(0.11, 7, 7),
      style.mushroomCapMaterial
    );
    cap.position.set(x, 0.18 * landmark.scale, z);
    cap.scale.set(1.2 * landmark.scale, 0.62 * landmark.scale, 1.2 * landmark.scale);
    cap.userData = {
      ...(cap.userData ?? {}),
      [LANDMARK_KEY]: landmark.kind,
    };
    group.add(cap);
  }
}

function getForestCarvingMarkers(carving: ForestCarvingDescriptor) {
  const glyphs = [
    ...offsetMarkers(CARVING_LETTER_L, -5.3, 0),
    ...offsetMarkers(CARVING_LETTER_M, -3.1, 0),
    ...offsetMarkers(CARVING_HEART, -0.8, 0),
    ...offsetMarkers(CARVING_PLUS, 0.8, 0),
    ...offsetMarkers(CARVING_LETTER_F, 2.3, 0),
    ...offsetMarkers(CARVING_LETTER_G, 4.7, 0),
  ];

  return glyphs.map((marker) => ({
    x: marker.x * carving.scale * 1.25,
    y: marker.y * carving.scale * 1.7,
  }));
}

function offsetMarkers(
  markers: readonly ForestMarkerPoint[],
  offsetX: number,
  offsetY: number
) {
  return markers.map((marker) => ({
    x: marker.x + offsetX,
    y: marker.y + offsetY,
  }));
}

function createForestMeadowDescriptor(
  tileX: number,
  tileY: number,
  meadowIndex: number,
  trees: ForestTreeDescriptor[],
  landmark: ForestLandmarkDescriptor | null
): ForestMeadowDescriptor | null {
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = `forest-meadow:${tileX}:${tileY}:${meadowIndex}:${attempt}`;
    const x = clampToTile((hash2D(seed, 1, 0) - 0.5) * 0.56);
    const y = clampToTile((hash2D(seed, 2, 0) - 0.5) * 0.56);
    const radiusX = 0.2 + hash2D(seed, 3, 0) * 0.08;
    const radiusY = 0.18 + hash2D(seed, 4, 0) * 0.08;
    const clearance = Math.max(radiusX, radiusY) * 0.8;
    const nearTree = trees.some((tree) => {
      const distance = Math.hypot(x - tree.x, y - tree.y);
      return distance < tree.radius + clearance;
    });
    if (nearTree) {
      continue;
    }
    if (landmark) {
      const distanceFromLandmark = Math.hypot(x - landmark.x, y - landmark.y);
      if (distanceFromLandmark < landmark.ringRadius + clearance) {
        continue;
      }
    }

    const flowerCount = 4 + Math.floor(hash2D(seed, 5, 0) * 4);
    const flowers: ForestFlowerDescriptor[] = [];
    for (let flowerIndex = 0; flowerIndex < flowerCount; flowerIndex += 1) {
      const flowerSeed = `${seed}:flower:${flowerIndex}`;
      flowers.push({
        x: (hash2D(flowerSeed, 1, 0) - 0.5) * radiusX * 1.4,
        y: (hash2D(flowerSeed, 2, 0) - 0.5) * radiusY * 1.4,
        height: 0.06 + hash2D(flowerSeed, 3, 0) * 0.03,
        scale: 0.026 + hash2D(flowerSeed, 4, 0) * 0.014,
        color: hash2D(flowerSeed, 5, 0) > 0.52 ? 'white' : 'yellow',
      });
    }

    return {
      x,
      y,
      radiusX,
      radiusY,
      flowers,
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

function syncForestBirds(root: ThreeObject3DLike, timeMs: number) {
  root.traverse?.((node) => {
    const bird = node.userData?.[BIRD_KEY] as ForestBirdDescriptor | undefined;
    if (!bird) {
      return;
    }
    const birdNode = node as ThreeObject3DLike & {
      children?: Array<{ rotation: { z: number } }>;
    };

    const angle = bird.phase * Math.PI * 2 + timeMs * bird.speed;
    birdNode.position.set(
      bird.x + Math.cos(angle) * bird.radius,
      bird.height + Math.sin(angle * 2.2) * 0.04,
      bird.y + Math.sin(angle) * bird.radius
    );
    birdNode.rotation.y = angle + Math.PI / 2;

    const flap = Math.sin(angle * 8);
    if ((birdNode.children?.length ?? 0) >= 2) {
      birdNode.children![0].rotation.z = -0.35 - flap * 0.4;
      birdNode.children![1].rotation.z = 0.35 + flap * 0.4;
    }
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
  stoneMaterial: ThreeMaterialLike;
  mushroomCapMaterial: ThreeMaterialLike;
  mushroomStemMaterial: ThreeMaterialLike;
  hollowMaterial: ThreeMaterialLike;
  owlBodyMaterial: ThreeMaterialLike;
  owlEyeMaterial: ThreeMaterialLike;
  carvingMaterial: ThreeMaterialLike;
  meadowGrassMaterial: ThreeMaterialLike;
  meadowStemMaterial: ThreeMaterialLike;
  meadowFlowerWhiteMaterial: ThreeMaterialLike;
  meadowFlowerYellowMaterial: ThreeMaterialLike;
  birdMaterial: ThreeMaterialLike;
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

interface ForestLandmarkDescriptor {
  kind: 'mushroom-ring' | 'stone-ring';
  x: number;
  y: number;
  rotation: number;
  ringRadius: number;
  memberCount: number;
  scale: number;
}

interface ForestBushDescriptor {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
}

interface ForestHollowDescriptor {
  treeIndex: number;
  sideOffset: -1 | 1;
  height: number;
  scale: number;
  depth: number;
}

interface ForestOwlDescriptor {
  hollowIndex: number;
  bodyScale: number;
  eyeSpread: number;
  perchOffset: number;
}

interface ForestCarvingDescriptor {
  treeIndex: number;
  sideOffset: -1 | 1;
  height: number;
  scale: number;
  text: 'LM+FG';
}

interface ForestMarkerPoint {
  x: number;
  y: number;
}

interface ForestFlowerDescriptor {
  x: number;
  y: number;
  height: number;
  scale: number;
  color: 'white' | 'yellow';
}

interface ForestMeadowDescriptor {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  flowers: ForestFlowerDescriptor[];
}

interface ForestBirdDescriptor {
  x: number;
  y: number;
  height: number;
  radius: number;
  phase: number;
  speed: number;
  wingScale: number;
}

const CARVING_LETTER_L = [
  { x: -0.4, y: 1.8 },
  { x: -0.4, y: 0.9 },
  { x: -0.4, y: 0 },
  { x: 0.4, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_LETTER_M = [
  { x: -0.7, y: 0 },
  { x: -0.7, y: 0.9 },
  { x: -0.7, y: 1.8 },
  { x: 0, y: 0.9 },
  { x: 0.7, y: 1.8 },
  { x: 0.7, y: 0.9 },
  { x: 0.7, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_HEART = [
  { x: -0.5, y: 1.6 },
  { x: 0.5, y: 1.6 },
  { x: -0.8, y: 1.1 },
  { x: 0.8, y: 1.1 },
  { x: 0, y: 0.5 },
  { x: 0, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_PLUS = [
  { x: 0, y: 1.2 },
  { x: 0, y: 0.6 },
  { x: 0, y: 0 },
  { x: -0.5, y: 0.6 },
  { x: 0.5, y: 0.6 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_LETTER_F = [
  { x: -0.5, y: 1.8 },
  { x: -0.5, y: 0.9 },
  { x: -0.5, y: 0 },
  { x: 0.4, y: 1.8 },
  { x: 0.2, y: 0.9 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_LETTER_G = [
  { x: 0.4, y: 1.8 },
  { x: -0.3, y: 1.8 },
  { x: -0.8, y: 1.2 },
  { x: -0.8, y: 0.5 },
  { x: -0.3, y: 0 },
  { x: 0.4, y: 0 },
  { x: 0.4, y: 0.7 },
  { x: 0, y: 0.7 },
] as const satisfies readonly ForestMarkerPoint[];
