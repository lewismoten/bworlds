import { createBoundedCache } from '@bworlds/cache-support';
import { octaveNoise2D } from '@bworlds/core';
import {
  appendHashSeedLabel,
  appendHashSeedPart,
  hash2D,
  hash2DWithSeed,
  registerHashLabel,
} from '@bworlds/core/hash';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  getPoiLightActivation,
  markPoiLightEmitter,
  markPoiWindResponder,
  syncPoiWindResponders,
} from '@bworlds/poi-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import {
  createCoordinateValueResolver,
  tintHexColor,
} from '@bworlds/procedural-style';
import { createThresholdTerrainClassifier } from '@bworlds/tile-support';
import { createPaintedCanvasTexture } from '@bworlds/three-support';
import type {
  CanOccupy3DContext,
  ClassifyOverworldTileContext,
  CreateWorldActionContext,
  Create3DModelContext,
  Paint2DContext,
  RuntimePlugin,
  ThreeBufferGeometryLike,
  ThreeGeometryLike,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeMatrix4Like,
  ThreeObject3DLike,
  ThreeTextureLike,
  WorldEnvironmentLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const TREE_FOLIAGE_COLOR = '#163b20';
const TREE_BARK_COLOR = '#4a2f1b';
const FIREFLY_KEY = 'forestFirefly';
const FLOOR_DETAIL_KEY = 'forestFloorDetail';
const BUSH_KEY = 'forestBush';
const LANDMARK_KEY = 'forestLandmark';
const HOLLOW_KEY = 'forestHollow';
const OWL_KEY = 'forestOwl';
const CARVING_KEY = 'forestCarving';
const MEADOW_KEY = 'forestMeadow';
const BIRD_KEY = 'forestBird';
const WEB_KEY = 'forestWeb';
const SPIDER_KEY = 'forestSpider';
const BEAVER_DAMAGE_KEY = 'forestBeaverDamage';
const TRAIL_KEY = 'forestTrail';
const TREE_FORM_KEY = 'forestTreeForm';
const TREE_FOLIAGE_KEY = 'forestTreeFoliage';
const RENDER_STATS_CATEGORY_KEY = 'renderStatKind';
const TREE_CLUSTER_SIZE = 4;
const TREE_REGION_SIZE = 14;
const MAX_FOREST_FIREFLIES = 3;
const FOREST_CLOSE_DETAIL_DISTANCE = 2.5;
const FOREST_CLOSE_DETAIL_DISTANCE_SQUARED =
  FOREST_CLOSE_DETAIL_DISTANCE * FOREST_CLOSE_DETAIL_DISTANCE;
const FOREST_FIREFLY_FULL_DISTANCE = 1.1;
const FOREST_FIREFLY_FULL_DISTANCE_SQUARED =
  FOREST_FIREFLY_FULL_DISTANCE * FOREST_FIREFLY_FULL_DISTANCE;
const FOREST_FIREFLY_MEDIUM_DISTANCE = 1.8;
const FOREST_FIREFLY_MEDIUM_DISTANCE_SQUARED =
  FOREST_FIREFLY_MEDIUM_DISTANCE * FOREST_FIREFLY_MEDIUM_DISTANCE;
const FIREFLY_SEASON_START = 0.18;
const FIREFLY_SEASON_PEAK = 0.5;
const FIREFLY_SEASON_END = 0.82;
const FOREST_COORDINATE_CACHE_LIMIT = 512;
const FOREST_STYLE_CACHE_LIMIT = 96;
const FOREST_QUEST_HINT_LABELS = ['N2', 'E3', 'S4', 'W1'] as const;
const FOREST_TREASURE_CLUE_LABELS = ['X2', 'X4', '>3', '<5'] as const;
const FOREST_HISTORICAL_INSCRIPTION_LABELS = ['OLD', 'MOSS', '1891'] as const;
const FOREST_TRAIL_SEED = registerHashLabel('forest-trail');
const FOREST_TRAIL_ANGLE_SEED = registerHashLabel('forest-trail-angle');
const FOREST_TRAIL_OFFSET_SEED = registerHashLabel('forest-trail-offset');
const FOREST_TRAIL_WIDTH_SEED = registerHashLabel('forest-trail-width');
const FOREST_TRAIL_BREADCRUMB_COUNT_SEED = registerHashLabel(
  'forest-trail-breadcrumb-count'
);
const FOREST_TRAIL_BREADCRUMB_WOBBLE_SEED = registerHashLabel(
  'forest-trail-breadcrumb-wobble'
);
const FOREST_TRAIL_BREADCRUMB_SCALE_SEED = registerHashLabel(
  'forest-trail-breadcrumb-scale'
);
const FOREST_LANDMARK_SEED = registerHashLabel('forest-landmark');
const FOREST_LANDMARK_KIND_SEED = registerHashLabel('forest-landmark-kind');
const FOREST_LANDMARK_ROTATION_SEED = registerHashLabel('forest-landmark-rotation');
const FOREST_LANDMARK_RADIUS_SEED = registerHashLabel('forest-landmark-radius');
const FOREST_LANDMARK_MEMBERS_SEED = registerHashLabel('forest-landmark-members');
const FOREST_LANDMARK_SCALE_SEED = registerHashLabel('forest-landmark-scale');
const FOREST_STUMP_DETAIL_SEED = registerHashLabel('forest-stump-detail');
const FOREST_FALLEN_DETAIL_SEED = registerHashLabel('forest-fallen-detail');
const FOREST_INTERIOR_FLOOR_DETAIL_SEED = registerHashLabel(
  'forest-interior-floor-detail'
);
const FOREST_HOLLOW_SEED = registerHashLabel('forest-hollow');
const FOREST_HOLLOW_HEIGHT_SEED = registerHashLabel('forest-hollow-height');
const FOREST_HOLLOW_SCALE_SEED = registerHashLabel('forest-hollow-scale');
const FOREST_HOLLOW_DEPTH_SEED = registerHashLabel('forest-hollow-depth');
const FOREST_OWL_SEED = registerHashLabel('forest-owl');
const FOREST_OWL_BODY_SEED = registerHashLabel('forest-owl-body');
const FOREST_OWL_EYE_SPREAD_SEED = registerHashLabel('forest-owl-eye-spread');
const FOREST_OWL_PERCH_SEED = registerHashLabel('forest-owl-perch');
const FOREST_CARVING_SEED = registerHashLabel('forest-carving');
const FOREST_CARVING_HEIGHT_SEED = registerHashLabel('forest-carving-height');
const FOREST_CARVING_SCALE_SEED = registerHashLabel('forest-carving-scale');
const FOREST_CARVING_HISTORICAL_SEED = registerHashLabel('forest-carving-historical');
const FOREST_CARVING_TREASURE_SEED = registerHashLabel('forest-carving-treasure');
const FOREST_CARVING_QUEST_SEED = registerHashLabel('forest-carving-quest');
const FOREST_CARVING_ARROW_SEED = registerHashLabel('forest-carving-arrow');
const FOREST_CARVING_DATE_SEED = registerHashLabel('forest-carving-date');
const FOREST_CARVING_AGE_SEED = registerHashLabel('forest-carving-age');
const FOREST_CARVING_BARK_COVERAGE_SEED = registerHashLabel(
  'forest-carving-bark-coverage'
);
const FOREST_CARVING_INSPECT_PRESERVED_SEED = registerHashLabel(
  'forest-carving-inspect-preserved'
);
const FOREST_CARVING_INSPECT_SEED = registerHashLabel('forest-carving-inspect');
const FOREST_CARVING_MARKER_SEED = registerHashLabel('forest-carving-marker');
const FOREST_CARVING_MARKER_VISIBLE_SEED = registerHashLabel('visible');
const FOREST_CARVING_MARKER_PRIORITY_SEED = registerHashLabel('priority');
const FOREST_CARVING_MARKER_JITTER_X_SEED = registerHashLabel('jitter-x');
const FOREST_CARVING_MARKER_JITTER_Y_SEED = registerHashLabel('jitter-y');
const FOREST_MEADOW_COUNT_SEED = registerHashLabel('forest-meadow-count');
const FOREST_MEADOW_SEED = registerHashLabel('forest-meadow');
const FOREST_FLOWER_SEED = registerHashLabel('flower');
const FOREST_BIRD_COUNT_SEED = registerHashLabel('forest-bird-count');
const FOREST_BIRD_SEED = registerHashLabel('forest-bird');
const FOREST_FIREFLY_COUNT_SEED = registerHashLabel('forest-firefly-count');
const FOREST_FIREFLY_ORBIT_ANGLE_SEED = registerHashLabel('forest-firefly-orbit-angle');
const FOREST_FIREFLY_ORBIT_DISTANCE_SEED = registerHashLabel(
  'forest-firefly-orbit-distance'
);
const FOREST_FIREFLY_CANOPY_BIAS_SEED = registerHashLabel('forest-firefly-canopy-bias');
const FOREST_FIREFLY_PHASE_SEED = registerHashLabel('forest-firefly-phase');
const FOREST_FIREFLY_DRIFT_SEED = registerHashLabel('forest-firefly-drift');

const treeDescriptorCache = createBoundedCache<string, ForestTreeDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const treeStyleCache = createBoundedCache<string, ForestTreeStyle>(
  FOREST_STYLE_CACHE_LIMIT
);
const forestTrailCache = createBoundedCache<string, ForestTrailDescriptor | null>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const forestFireflyCache = createBoundedCache<string, ForestFireflyDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const forestFireflyMaterialCache = new WeakMap<ThreeHostLike, ThreeMaterialLike>();
const forestFireflyTextureCache = new WeakMap<ThreeHostLike, ThreeTextureLike>();
const forestWebCache = createBoundedCache<string, ForestWebDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const forestSpiderCache = createBoundedCache<string, ForestSpiderDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const forestBeaverDamageCache = createBoundedCache<
  string,
  ForestBeaverDamageDescriptor[]
>(FOREST_COORDINATE_CACHE_LIMIT);
const forestBeaverPopulationCache = createBoundedCache<
  string,
  ForestBeaverPopulationDescriptor | null
>(FOREST_COORDINATE_CACHE_LIMIT);
const FOREST_FIREFLY_VERTEX_SHADER = `
attribute float fireflyPhase;
attribute float fireflyDrift;
uniform float uTimeMs;
uniform float uActivation;
varying float vAlpha;

void main() {
  float flutter = uTimeMs * (0.0014 + fireflyDrift * 0.0011) + fireflyPhase * 6.28318530718;
  float pulse = (sin(flutter * 1.9) + 1.0) * 0.5;
  vec3 animatedPosition = position + vec3(
    cos(flutter) * 0.05,
    sin(flutter * 1.6) * 0.04,
    sin(flutter * 1.2) * 0.05
  );
  vec4 mvPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
  float distanceScale = 240.0 / max(1.0, -mvPosition.z);
  gl_PointSize = (8.0 + pulse * 6.0) * distanceScale;
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = uActivation * (0.28 + pulse * 0.64);
}
`;
const FOREST_FIREFLY_FRAGMENT_SHADER = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float distanceFromCenter = length(centered);
  float glow = smoothstep(0.5, 0.0, distanceFromCenter);
  float core = smoothstep(0.18, 0.0, distanceFromCenter);
  float alpha = vAlpha * glow;
  if (alpha <= 0.01) {
    discard;
  }
  vec3 color = uColor * (0.78 + core * 0.9);
  gl_FragColor = vec4(color, alpha);
}
`;

type ForestFireflyMaterialLike = ThreeMaterialLike & {
  opacity?: number;
  uniforms?: Record<string, { value: unknown }>;
};

type ForestFireflyNodeState = {
  descriptors: ForestFireflyDescriptor[];
  particleCount: number;
  positionAttribute?: {
    array: ArrayLike<number> & { [index: number]: number };
    needsUpdate?: boolean;
  };
  uniforms?: {
    uTimeMs: { value: number };
    uActivation: { value: number };
  };
};

type ForestFireflyShaderHost = ThreeHostLike & {
  ShaderMaterial?: new (
    options?: Record<string, unknown>
  ) => ForestFireflyMaterialLike;
  AdditiveBlending?: unknown;
};
const resolveForestTrailDescriptor = createCoordinateValueResolver(
  forestTrailCache,
  ({ tileX, tileY }) => {
    if (getForestTreeCount(tileX, tileY) < 4) {
      return null;
    }

    const trailChance = hash2D(FOREST_TRAIL_SEED, tileX, tileY);
    if (trailChance < 0.84) {
      return null;
    }

    const angle = hash2D(FOREST_TRAIL_ANGLE_SEED, tileX, tileY) * Math.PI;
    const normalAngle = angle + Math.PI / 2;
    const offset = (hash2D(FOREST_TRAIL_OFFSET_SEED, tileX, tileY) - 0.5) * 0.32;
    const extent = 0.44;
    const halfWidth = 0.08 + hash2D(FOREST_TRAIL_WIDTH_SEED, tileX, tileY) * 0.03;
    const start = {
      x: Math.cos(angle) * -extent + Math.cos(normalAngle) * offset,
      y: Math.sin(angle) * -extent + Math.sin(normalAngle) * offset,
    };
    const end = {
      x: Math.cos(angle) * extent + Math.cos(normalAngle) * offset,
      y: Math.sin(angle) * extent + Math.sin(normalAngle) * offset,
    };
    const breadcrumbCount =
      trailChance > 0.93
        ? 3 +
          Math.floor(hash2D(FOREST_TRAIL_BREADCRUMB_COUNT_SEED, tileX, tileY) * 3)
        : 0;
    const breadcrumbs: ForestTrailBreadcrumb[] = [];

    for (let index = 0; index < breadcrumbCount; index += 1) {
      const progress = (index + 1) / (breadcrumbCount + 1);
      const wobble =
        (hash2D(
          FOREST_TRAIL_BREADCRUMB_WOBBLE_SEED,
          tileX * 11 + index,
          tileY * 13
        ) -
          0.5) *
        halfWidth *
        0.9;
      const x =
        start.x + (end.x - start.x) * progress + Math.cos(normalAngle) * wobble;
      const y =
        start.y + (end.y - start.y) * progress + Math.sin(normalAngle) * wobble;
      breadcrumbs.push({
        x: clampToTile(x),
        y: clampToTile(y),
        scale:
          0.018 +
          hash2D(FOREST_TRAIL_BREADCRUMB_SCALE_SEED, tileX + index, tileY) * 0.014,
      });
    }

    return {
      start,
      end,
      halfWidth,
      breadcrumbs,
    };
  }
);
const resolveForestTreeDescriptors = createCoordinateValueResolver(
  treeDescriptorCache,
  ({ tileX, tileY }) => {
    const groveCenter = getForestGroveCenter(tileX, tileY);
    const loneTree = hasForestLoneTree(tileX, tileY);
    const count = getForestTreeCount(tileX, tileY);
    const landmark = getForestLandmark(tileX, tileY);
    const trail = getForestTrail(tileX, tileY);
    const descriptors: ForestTreeDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const baseSeed = `forest-tree:${tileX}:${tileY}:${index}`;
      const variety = getTreeVarietyIndex(tileX, tileY, index);
      const outlierChance = hash2D(baseSeed, 0, 0);
      const spread = loneTree ? 0.06 : outlierChance > 0.84 ? 0.28 : 0.17;
      const x = clampToTile(
        groveCenter.x + (hash2D(baseSeed, 1, 0) - 0.5) * spread * 2
      );
      const y = clampToTile(
        groveCenter.y + (hash2D(baseSeed, 2, 0) - 0.5) * spread * 2
      );

      if (landmark) {
        const distanceFromLandmark = Math.hypot(
          x - landmark.x,
          y - landmark.y
        );
        if (distanceFromLandmark < landmark.ringRadius + 0.1) {
          continue;
        }
      }

      if (trail && isPointInsideForestTrail(trail, x, y, 0.02)) {
        continue;
      }

      const trunkHeight = 0.72 + hash2D(baseSeed, 5, 0) * 0.45;
      const form = getTreeForm(variety);
      const branchCount =
        form === 'pine'
          ? 3 + Math.floor(hash2D(baseSeed, 6, 0) * 3)
          : 2 + Math.floor(hash2D(baseSeed, 6, 0) * 3);
      const branches = new Array<ForestBranchDescriptor>(branchCount);
      const foliageCount =
        form === 'pine'
          ? 4 + Math.floor(hash2D(baseSeed, 30, 0) * 2)
          : 3 + Math.floor(hash2D(baseSeed, 30, 0) * 3);
      const foliage = new Array<ForestFoliageDescriptor>(foliageCount);
      const descriptor: ForestTreeDescriptor = {
        x,
        y,
        radius: 0.08 + hash2D(baseSeed, 3, 0) * 0.05,
        scale: 0.78 + hash2D(baseSeed, 4, 0) * 0.55,
        trunkHeight,
        variety,
        form,
        branches,
        foliage,
      };

      for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
        const branchProgress =
          branchCount <= 1 ? 0 : branchIndex / (branchCount - 1);
        const branchHeightFactor =
          form === 'pine'
            ? 0.32 + hash2D(baseSeed, 10 + branchIndex, 2) * 0.48
            : 0.28 + branchProgress * 0.5;
        const broadleafSpread = 0.18 - branchProgress * 0.06;
        const broadleafLengthScale = 1.08 - branchProgress * 0.34;
        branches[branchIndex] = {
          x:
            (hash2D(baseSeed, 10 + branchIndex, 1) - 0.5) *
            (form === 'pine' ? 0.08 : broadleafSpread),
          y: trunkHeight * branchHeightFactor,
          z:
            (hash2D(baseSeed, 10 + branchIndex, 3) - 0.5) *
            (form === 'pine' ? 0.08 : broadleafSpread),
          length:
            form === 'pine'
              ? 0.82 + hash2D(baseSeed, 10 + branchIndex, 4) * 0.34
              : (0.62 + hash2D(baseSeed, 10 + branchIndex, 4) * 0.34) *
                broadleafLengthScale,
          pitch:
            form === 'pine'
              ? 1 + hash2D(baseSeed, 10 + branchIndex, 5) * 0.28
              : 0.3 + branchProgress * 0.38 + hash2D(baseSeed, 10 + branchIndex, 5) * 0.14,
          roll: -1.25 + hash2D(baseSeed, 10 + branchIndex, 6) * Math.PI * 0.9,
        };
      }

      for (let foliageIndex = 0; foliageIndex < foliageCount; foliageIndex += 1) {
        const layerProgress =
          foliageCount <= 1 ? 0 : foliageIndex / (foliageCount - 1);
        const pineLayerScale = 1 - layerProgress * 0.45;
        foliage[foliageIndex] = {
          x:
            (hash2D(baseSeed, 40 + foliageIndex, 1) - 0.5) *
            (form === 'pine' ? 0.08 : 0.28),
          y:
            trunkHeight *
            (form === 'pine'
              ? 0.42 + layerProgress * 0.52
              : 0.78 + hash2D(baseSeed, 40 + foliageIndex, 2) * 0.5),
          z:
            (hash2D(baseSeed, 40 + foliageIndex, 3) - 0.5) *
            (form === 'pine' ? 0.08 : 0.28),
          scaleX:
            form === 'pine'
              ? 0.58 * pineLayerScale + hash2D(baseSeed, 40 + foliageIndex, 4) * 0.16
              : 0.68 + hash2D(baseSeed, 40 + foliageIndex, 4) * 0.52,
          scaleY:
            form === 'pine'
              ? 0.32 + hash2D(baseSeed, 40 + foliageIndex, 5) * 0.18
              : 0.58 + hash2D(baseSeed, 40 + foliageIndex, 5) * 0.48,
          scaleZ:
            form === 'pine'
              ? 0.58 * pineLayerScale + hash2D(baseSeed, 40 + foliageIndex, 6) * 0.16
              : 0.68 + hash2D(baseSeed, 40 + foliageIndex, 6) * 0.52,
        };
      }

      descriptors.push(descriptor);
    }

    return descriptors;
  }
);
const forestLandmarkCache = createBoundedCache<
  string,
  ForestLandmarkDescriptor | null
>(FOREST_COORDINATE_CACHE_LIMIT);
const resolveForestLandmarkDescriptor = createCoordinateValueResolver(
  forestLandmarkCache,
  ({ tileX, tileY }) => {
    const treeCount = getForestTreeCount(tileX, tileY);
    if (treeCount < 5) {
      return null;
    }

    const landmarkChance = hash2D(FOREST_LANDMARK_SEED, tileX, tileY);
    if (landmarkChance < 0.8) {
      return null;
    }

    const groveCenter = getForestGroveCenter(tileX, tileY);
    const kind: ForestLandmarkDescriptor['kind'] =
      hash2D(FOREST_LANDMARK_KIND_SEED, tileX, tileY) > 0.54
        ? 'mushroom-ring'
        : 'stone-ring';
    return {
      kind,
      x: clampToTile(groveCenter.x * 0.45),
      y: clampToTile(groveCenter.y * 0.45),
      rotation: hash2D(FOREST_LANDMARK_ROTATION_SEED, tileX, tileY) * Math.PI * 2,
      ringRadius: 0.16 + hash2D(FOREST_LANDMARK_RADIUS_SEED, tileX, tileY) * 0.05,
      memberCount:
        5 + Math.floor(hash2D(FOREST_LANDMARK_MEMBERS_SEED, tileX, tileY) * 3),
      scale: 0.8 + hash2D(FOREST_LANDMARK_SCALE_SEED, tileX, tileY) * 0.35,
    };
  }
);
const forestFloorDetailCache = createBoundedCache<
  string,
  ForestFloorDetailDescriptor[]
>(FOREST_COORDINATE_CACHE_LIMIT);
const resolveForestFloorDetailDescriptors = createCoordinateValueResolver(
  forestFloorDetailCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const details: ForestFloorDetailDescriptor[] = [];
    const denseForest = trees.length >= 5;
    const stumpChance = hash2D(FOREST_STUMP_DETAIL_SEED, tileX, tileY);
    const fallenTreeChance = hash2D(FOREST_FALLEN_DETAIL_SEED, tileX, tileY);
    const interiorChance = hash2D(FOREST_INTERIOR_FLOOR_DETAIL_SEED, tileX, tileY);

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
const forestBushCache = createBoundedCache<string, ForestBushDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
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
const forestHollowCache = createBoundedCache<string, ForestHollowDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const resolveForestHollowDescriptors = createCoordinateValueResolver(
  forestHollowCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const landmark = getForestLandmark(tileX, tileY);
    const hollows: ForestHollowDescriptor[] = [];

    trees.forEach((tree, treeIndex) => {
      const chance = hash2D(FOREST_HOLLOW_SEED, tileX * 17 + treeIndex, tileY * 19);
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
        height:
          tree.trunkHeight *
          (0.38 + hash2D(FOREST_HOLLOW_HEIGHT_SEED, treeIndex, tileY) * 0.16),
        scale:
          0.12 + hash2D(FOREST_HOLLOW_SCALE_SEED, tileX + treeIndex, tileY) * 0.05,
        depth:
          0.08 + hash2D(FOREST_HOLLOW_DEPTH_SEED, tileX, tileY + treeIndex) * 0.03,
      });
    });

    return hollows;
  }
);
const forestOwlCache = createBoundedCache<string, ForestOwlDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const resolveForestOwlDescriptors = createCoordinateValueResolver(
  forestOwlCache,
  ({ tileX, tileY }) => {
    const hollows = resolveForestHollowDescriptors(tileX, tileY);
    const owls: ForestOwlDescriptor[] = [];

    hollows.forEach((hollow, hollowIndex) => {
      const chance = hash2D(FOREST_OWL_SEED, tileX * 23 + hollowIndex, tileY * 29);
      if (chance < 0.58) {
        return;
      }

      owls.push({
        hollowIndex,
        bodyScale:
          0.08 + hash2D(FOREST_OWL_BODY_SEED, tileX + hollowIndex, tileY) * 0.03,
        eyeSpread:
          0.022 +
          hash2D(FOREST_OWL_EYE_SPREAD_SEED, tileX, tileY + hollowIndex) * 0.012,
        perchOffset:
          0.01 + hash2D(FOREST_OWL_PERCH_SEED, tileX - hollowIndex, tileY) * 0.02,
      });
    });

    return owls;
  }
);
const forestCarvingCache = createBoundedCache<string, ForestCarvingDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const resolveForestCarvingDescriptors = createCoordinateValueResolver(
  forestCarvingCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const carvings: ForestCarvingDescriptor[] = [];

    trees.forEach((tree, treeIndex) => {
      const chance = hash2D(FOREST_CARVING_SEED, tileX * 31 + treeIndex, tileY * 37);
      if (chance < 0.88) {
        return;
      }

      const motif: ForestCarvingDescriptor['motif'] =
        chance > 0.997
          ? 'historical-inscription'
          : chance > 0.994
            ? 'treasure-map-clue'
            : chance > 0.99
              ? 'quest-hint'
              : chance > 0.985
                ? 'warning'
                : chance > 0.979
                  ? 'guild'
                  : chance > 0.973
                    ? 'religious'
                    : chance > 0.967
                      ? 'symbol'
                      : chance > 0.957
                        ? 'arrow'
                        : chance > 0.943
                          ? 'traveler-mark'
                          : chance > 0.926
                            ? 'date'
                            : chance > 0.904
                              ? 'heart'
                              : 'initials';

      carvings.push({
        treeIndex,
        sideOffset: chance > 0.94 ? 1 : -1,
        height:
          tree.trunkHeight *
          (0.44 + hash2D(FOREST_CARVING_HEIGHT_SEED, treeIndex, tileY) * 0.14),
        scale:
          0.018 +
          hash2D(FOREST_CARVING_SCALE_SEED, tileX + treeIndex, tileY) * 0.006,
        preserved: isForestQuestCarvingMotif(motif),
        age: resolveForestCarvingAge(motif, tileX, tileY, treeIndex),
        barkCoverage: resolveForestCarvingBarkCoverage(motif, tileX, tileY, treeIndex),
        markerSeed: createForestCarvingMarkerSeed(tileX, tileY, treeIndex),
        motif,
        text: getForestCarvingText(motif, tileX, tileY, treeIndex),
      });
    });

    return carvings;
  }
);
const forestMeadowCache = createBoundedCache<string, ForestMeadowDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const resolveForestMeadowDescriptors = createCoordinateValueResolver(
  forestMeadowCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const landmark = getForestLandmark(tileX, tileY);
    const count = hash2D(FOREST_MEADOW_COUNT_SEED, tileX, tileY) > 0.86 ? 1 : 0;
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
const forestBirdCache = createBoundedCache<string, ForestBirdDescriptor[]>(
  FOREST_COORDINATE_CACHE_LIMIT
);
const resolveForestBirdDescriptors = createCoordinateValueResolver(
  forestBirdCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const count = hash2D(FOREST_BIRD_COUNT_SEED, tileX, tileY) > 0.72 ? 1 : 0;
    const birds: ForestBirdDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const seed = createForestBirdSeed(tileX, tileY, index);
      const averageHeight =
        trees.reduce((sum, tree) => sum + tree.trunkHeight * tree.scale, 0) /
        Math.max(1, trees.length);
      birds.push({
        x: (hash2DWithSeed(seed, 1, 0) - 0.5) * 0.58,
        y: (hash2DWithSeed(seed, 2, 0) - 0.5) * 0.58,
        height: 0.92 + averageHeight * 0.46 + hash2DWithSeed(seed, 3, 0) * 0.3,
        radius: 0.12 + hash2DWithSeed(seed, 4, 0) * 0.1,
        phase: hash2DWithSeed(seed, 5, 0),
        speed: 0.0008 + hash2DWithSeed(seed, 6, 0) * 0.0007,
        wingScale: 0.05 + hash2DWithSeed(seed, 7, 0) * 0.02,
      });
    }

    return birds;
  }
);
const resolveForestFireflyDescriptors = createCoordinateValueResolver(
  forestFireflyCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const bushes = resolveForestBushDescriptors(tileX, tileY);
    const meadows = resolveForestMeadowDescriptors(tileX, tileY);
    const anchors = getForestFireflyHabitatAnchors(trees, bushes, meadows);
    const humidAnchors = anchors.filter((anchor) => anchor.habitatKind !== 'tree');
    const count = Math.min(
      MAX_FOREST_FIREFLIES,
      2 + Math.floor(hash2D(FOREST_FIREFLY_COUNT_SEED, tileX, tileY) * 2)
    );
    const fireflies: ForestFireflyDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const anchorPool =
        index === 0 && humidAnchors.length > 0 ? humidAnchors : anchors;
      const anchor = pickForestFireflyHabitatAnchor(anchorPool, tileX, tileY, index);
      const orbitAngle =
        hash2D(FOREST_FIREFLY_ORBIT_ANGLE_SEED, tileX * 13 + index, tileY * 17) *
        Math.PI *
        2;
      const orbitDistance =
        anchor.radius *
        (0.2 +
          hash2D(FOREST_FIREFLY_ORBIT_DISTANCE_SEED, tileX + index, tileY - index) *
            0.8);
      const canopyBias = hash2D(
        FOREST_FIREFLY_CANOPY_BIAS_SEED,
        tileX - index,
        tileY + index
      );
      fireflies.push({
        phase: hash2D(FOREST_FIREFLY_PHASE_SEED, tileX * 17 + index, tileY * 13),
        drift: hash2D(FOREST_FIREFLY_DRIFT_SEED, tileX + index, tileY - index),
        habitatKind: anchor.habitatKind,
        anchorX: anchor.x,
        anchorZ: anchor.z,
        anchorRadius: anchor.radius,
        baseX: clampToTile(anchor.x + Math.cos(orbitAngle) * orbitDistance),
        baseZ: clampToTile(anchor.z + Math.sin(orbitAngle) * orbitDistance),
        baseY:
          anchor.height +
          (canopyBias - 0.5) *
            (anchor.habitatKind === 'tree' ? 0.12 : 0.08),
      });
    }

    return fireflies;
  }
);
const resolveForestWebDescriptors = createCoordinateValueResolver(
  forestWebCache,
  ({ tileX, tileY }) => {
    const trees = resolveForestTreeDescriptors(tileX, tileY);
    const hollows = resolveForestHollowDescriptors(tileX, tileY);
    const floorDetails = resolveForestFloorDetailDescriptors(tileX, tileY);
    const webs: ForestWebDescriptor[] = [];

    trees.forEach((tree, treeIndex) => {
      if (tree.form !== 'broadleaf' || tree.branches.length < 2) {
        return;
      }

      const sortedBranches = [...tree.branches].sort((left, right) => left.y - right.y);
      for (let branchIndex = 1; branchIndex < sortedBranches.length; branchIndex += 1) {
        const lower = sortedBranches[branchIndex - 1]!;
        const upper = sortedBranches[branchIndex]!;
        const chance = hash2D(
          'forest-web-branch',
          tileX * 37 + treeIndex * 11 + branchIndex,
          tileY * 39 - treeIndex * 13 - branchIndex
        );
        const branchGap = Math.hypot(upper.x - lower.x, upper.z - lower.z);
        if (chance < 0.78 || branchGap > 0.18) {
          continue;
        }

        const midX = tree.x + (lower.x + upper.x) * 0.5;
        const midY = (lower.y + upper.y) * 0.5;
        const midZ = tree.y + (lower.z + upper.z) * 0.5;
        webs.push({
          kind: 'branch',
          x: midX,
          y: midY,
          z: midZ,
          radius: Math.max(0.03, branchGap * 0.42),
          strandCount: 4 + Math.floor(chance * 3),
        });
      }
    });

    hollows.forEach((hollow, hollowIndex) => {
      const tree = trees[hollow.treeIndex];
      if (!tree) {
        return;
      }

      const chance = hash2D('forest-web-hollow', tileX * 41 + hollowIndex, tileY * 43);
      if (chance < 0.34) {
        return;
      }

      webs.push({
        kind: 'hollow',
        x: tree.x + tree.radius * 0.64 * hollow.sideOffset,
        y: hollow.height,
        z: tree.y + hollow.depth * 0.18,
        radius: hollow.scale * (0.68 + chance * 0.22),
        strandCount: 5 + Math.floor(chance * 4),
      });
    });

    floorDetails.forEach((detail, detailIndex) => {
      const chance = hash2D('forest-web-deadwood', tileX * 47 + detailIndex, tileY * 53);
      const threshold = detail.kind === 'fallen-tree' ? 0.18 : 0.28;
      if (chance < threshold) {
        return;
      }

      webs.push({
        kind: 'deadwood',
        x: detail.x,
        y: detail.kind === 'fallen-tree' ? detail.height * 1.25 : detail.height * 1.4,
        z: detail.y,
        radius:
          detail.kind === 'fallen-tree'
            ? (detail.length ?? detail.radius) * 0.18
            : detail.radius * 0.12,
        strandCount:
          detail.kind === 'fallen-tree'
            ? 6 + Math.floor(chance * 4)
            : 5 + Math.floor(chance * 3),
      });
    });

    return webs;
  }
);
const resolveForestSpiderDescriptors = createCoordinateValueResolver(
  forestSpiderCache,
  ({ tileX, tileY }) => {
    const webs = resolveForestWebDescriptors(tileX, tileY);
    const spiders: ForestSpiderDescriptor[] = [];

    webs.forEach((web, webIndex) => {
      const chance = hash2D('forest-spider-web', tileX * 59 + webIndex, tileY * 61);
      const threshold =
        web.kind === 'deadwood' ? 0.26 : web.kind === 'branch' ? 0.58 : 0.42;
      if (chance < threshold) {
        return;
      }

      const count = web.kind === 'deadwood' && chance > 0.82 ? 2 : 1;
      for (let spiderIndex = 0; spiderIndex < count; spiderIndex += 1) {
        const angle =
          hash2D(
            'forest-spider-angle',
            tileX * 67 + webIndex * 7 + spiderIndex,
            tileY * 71 - webIndex * 5 - spiderIndex
          ) *
          Math.PI *
          2;
        const distance =
          web.radius *
          (0.12 +
            hash2D(
              'forest-spider-distance',
              tileX + webIndex + spiderIndex,
              tileY - webIndex - spiderIndex
            ) *
              0.54);
        spiders.push({
          webKind: web.kind,
          x: web.x + Math.cos(angle) * distance,
          y:
            web.y +
            Math.sin(angle * 1.3) * web.radius * 0.08 +
            spiderIndex * 0.006,
          z: web.z + Math.sin(angle) * distance,
          bodyScale: 0.018 + hash2D('forest-spider-size', webIndex, spiderIndex) * 0.01,
          legSpan: 0.032 + hash2D('forest-spider-legs', webIndex, spiderIndex) * 0.016,
        });
      }
    });

    return spiders;
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
      createWorldAction(context: CreateWorldActionContext) {
        return createForestCarvingInspectAction(context);
      },
      create3DModel({
        three,
        state,
        tileX,
        tileY,
        detailLevel = 'full',
      }: Create3DModelContext) {
        const group = new three.Group();
        const renderCloseDetails = shouldRenderForestCloseDetails(
          state,
          tileX,
          tileY
        );
        const descriptors =
          detailLevel === 'low'
            ? getForestTreeDescriptors(tileX, tileY).filter(
                (_descriptor, index) => index % 2 === 0
              )
            : getForestTreeDescriptors(tileX, tileY);
        const geometry = getTreeGeometry(three);
        if (detailLevel === 'low') {
          addLowDetailForestTreeInstances(
            three,
            group,
            geometry,
            tileX,
            tileY,
            descriptors
          );
        }

        for (const descriptor of descriptors) {
          if (detailLevel === 'low') {
            continue;
          }
          const style = getTreeStyle(three, tileX, tileY, descriptor.variety);

          const tree = new three.Group();
          tree.position.set(tileX + descriptor.x, 0, tileY + descriptor.y);
          tree.scale.setScalar(descriptor.scale);
          tree.userData = {
            ...(tree.userData ?? {}),
            [TREE_FORM_KEY]: descriptor.form,
            [RENDER_STATS_CATEGORY_KEY]: 'tree',
          };

          const trunk = new three.Mesh(geometry.trunk, style.trunkMaterial);
          trunk.position.y = descriptor.trunkHeight * 0.5;
          trunk.scale.y = descriptor.trunkHeight;
          tree.add(trunk);

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
            tagForestFoliageWind(
              foliage,
              tileX,
              tileY,
              descriptor.variety,
              clump.x + clump.y + clump.z
            );
            tree.add(foliage);
          }

          group.add(tree);
        }

        if (detailLevel === 'full') {
          const floorDetailStyle = getTreeStyle(three, tileX, tileY, 0);
          const hollows = renderCloseDetails
            ? getForestTreeHollows(tileX, tileY)
            : [];
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
          if (renderCloseDetails) {
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
          }
          if (renderCloseDetails) {
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
                notch.scale.setScalar(
                  carving.scale * (0.94 - carving.age * 0.16 - carving.barkCoverage * 0.08)
                );
                notch.userData = {
                  ...(notch.userData ?? {}),
                  [CARVING_KEY]: carving.text,
                  forestCarvingAge: carving.age,
                  forestCarvingBarkCoverage: carving.barkCoverage,
                };
                group.add(notch);
              }
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
            addForestMeadowFlowerInstances(
              three,
              group,
              geometry,
              floorDetailStyle,
              tileX,
              tileY,
              meadow
            );
          }
          if (renderCloseDetails) {
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
              body.scale.set(
                bird.wingScale * 0.55,
                bird.wingScale * 0.3,
                bird.wingScale * 0.3
              );
              birdGroup.add(body);
              group.add(birdGroup);
            }
          }
          if (renderCloseDetails) {
            addForestWebInstances(
              three,
              group,
              geometry,
              floorDetailStyle,
              tileX,
              tileY,
              getForestWebs(tileX, tileY)
            );
          }
          if (renderCloseDetails) {
            addForestSpiderInstances(
              three,
              group,
              geometry,
              floorDetailStyle,
              tileX,
              tileY,
              getForestSpiders(tileX, tileY)
            );
          }
          if (renderCloseDetails) {
            addForestBeaverDamageInstances(
              three,
              group,
              geometry,
              floorDetailStyle,
              tileX,
              tileY,
              descriptors,
              getForestBeaverDamage(state, tileX, tileY)
            );
          }
          const trail = getForestTrail(tileX, tileY);
          if (trail) {
            addForestBreadcrumbInstances(
              three,
              group,
              geometry,
              floorDetailStyle,
              tileX,
              tileY,
              trail
            );
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
          addForestBushInstances(
            three,
            group,
            geometry,
            floorDetailStyle,
            tileX,
            tileY,
            getForestBushes(tileX, tileY)
          );
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

          if (renderCloseDetails) {
            for (const firefly of getForestFireflies(three, state, tileX, tileY)) {
              group.add(firefly);
            }
          }
        }

        return group;
      },
      sync3DModel({ model, cycle, timeMs = 0, environment }) {
        if (!model || typeof model !== 'object') {
          return;
        }
        syncForestWebGlint(model as ThreeObject3DLike, cycle, environment);
        syncForestFireflies(
          model as ThreeObject3DLike,
          cycle,
          timeMs
        );
        syncPoiWindResponders(model as ThreeObject3DLike, environment, timeMs);
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

export function getForestFireflyDescriptors(
  tileX: number,
  tileY: number
): ForestFireflyDescriptor[] {
  return resolveForestFireflyDescriptors(tileX, tileY);
}

export function getForestWebs(
  tileX: number,
  tileY: number
): ForestWebDescriptor[] {
  return resolveForestWebDescriptors(tileX, tileY);
}

export function getForestSpiders(
  tileX: number,
  tileY: number
): ForestSpiderDescriptor[] {
  return resolveForestSpiderDescriptors(tileX, tileY);
}

export function getForestBeaverDamage(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
): ForestBeaverDamageDescriptor[] {
  const beaverPopulation = getForestBeaverPopulation(state, tileX, tileY);
  const habitatSignature = beaverPopulation?.habitatSignature ?? 'dry';
  const cacheKey = `${tileX}:${tileY}:${habitatSignature}`;
  if (!forestBeaverDamageCache.has(cacheKey)) {
    if (!beaverPopulation || !habitatSignature.includes('river')) {
      forestBeaverDamageCache.set(cacheKey, []);
    } else {
      const trees = resolveForestTreeDescriptors(tileX, tileY);
      const damages: ForestBeaverDamageDescriptor[] = [];

      trees.forEach((tree, treeIndex) => {
        const chance = hash2D(
          'forest-beaver-damage',
          tileX * 73 + treeIndex,
          tileY * 79
        );
        if (chance < 0.72) {
          return;
        }

        damages.push({
          treeIndex,
          chewHeight:
            0.08 + hash2D('forest-beaver-chew-height', treeIndex, tileY) * 0.05,
          chewRadiusScale:
            0.82 + hash2D('forest-beaver-chew-radius', tileX, treeIndex) * 0.14,
          coneScale:
            0.55 + hash2D('forest-beaver-cone', tileX + treeIndex, tileY) * 0.18,
          severity:
            chance > 0.975
              ? 'felled'
              : chance > 0.94
                ? 'near-felled'
                : chance > 0.9
                  ? 'deep'
                  : 'partial',
          strippedBranchCount:
            chance > 0.975 ? 4 : chance > 0.9 ? 3 : chance > 0.84 ? 2 : 1,
          leanDirection:
            hash2D('forest-beaver-lean-direction', tileX + treeIndex, tileY) > 0.5
              ? 1
              : -1,
        });
      });

      forestBeaverDamageCache.set(cacheKey, damages);
    }
  }

  return forestBeaverDamageCache.get(cacheKey)!;
}

export function getForestBeaverPopulation(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
): ForestBeaverPopulationDescriptor | null {
  const habitatSignature = getForestBeaverHabitatSignature(state, tileX, tileY);
  const cacheKey = `${tileX}:${tileY}:${habitatSignature}`;
  if (!forestBeaverPopulationCache.has(cacheKey)) {
    if (!habitatSignature.includes('river')) {
      forestBeaverPopulationCache.set(cacheKey, null);
    } else {
      const chance = hash2D('forest-beaver-population', tileX * 83, tileY * 89);
      if (chance < 0.38) {
        forestBeaverPopulationCache.set(cacheKey, null);
      } else {
        forestBeaverPopulationCache.set(cacheKey, {
          habitatSignature,
          density:
            chance > 0.82 ? 'active-colony' : chance > 0.58 ? 'resident-pair' : 'lodge-sign',
          activity: 0.42 + chance * 0.58,
        });
      }
    }
  }

  return forestBeaverPopulationCache.get(cacheKey) ?? null;
}

export function getForestTrail(
  tileX: number,
  tileY: number
): ForestTrailDescriptor | null {
  return resolveForestTrailDescriptor(tileX, tileY);
}

export function getForestTreeForms(
  tileX: number,
  tileY: number
): ForestTreeForm[] {
  return getForestTreeDescriptors(tileX, tileY).map((descriptor) => descriptor.form);
}

export function getForestTreeBranchProfiles(
  tileX: number,
  tileY: number
): Array<{
  form: ForestTreeForm;
  branches: ForestBranchDescriptor[];
}> {
  return getForestTreeDescriptors(tileX, tileY).map((descriptor) => ({
    form: descriptor.form,
    branches: descriptor.branches,
  }));
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

function getTreeForm(variety: number): ForestTreeForm {
  return variety === 2 ? 'pine' : 'broadleaf';
}

function getTreeStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  variety: number
) {
  const styleSeedX = 41 + variety * 17;
  const styleSeedY = 73 + variety * 19;
  const key = `tree-family:${variety}`;

  if (!treeStyleCache.has(key)) {
    const barkBase = tintHexColor(
      TREE_BARK_COLOR,
      0.82 + hash2D('tree-bark-tint', styleSeedX + variety, styleSeedY) * 0.32
    );
    const foliageBase = tintHexColor(
      TREE_FOLIAGE_COLOR,
      0.82 + hash2D('tree-foliage-tint', styleSeedX, styleSeedY + variety) * 0.34
    );

    const barkTexture = createTreeBarkTexture(
      three,
      barkBase,
      styleSeedX,
      styleSeedY,
      variety
    );
    const foliageTexture = createTreeFoliageTexture(
      three,
      foliageBase,
      styleSeedX,
      styleSeedY,
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
          0.86 + hash2D('tree-stone-tint', styleSeedX, styleSeedY + variety) * 0.24
        ),
        roughness: 0.99,
        metalness: 0.01,
        flatShading: true,
      }),
      mushroomCapMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#c75442',
          0.84 + hash2D('tree-mushroom-cap-tint', styleSeedX + variety, styleSeedY) * 0.28
        ),
        roughness: 0.88,
        metalness: 0.01,
        flatShading: true,
      }),
      mushroomStemMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#ded6bb',
          0.9 + hash2D('tree-mushroom-stem-tint', styleSeedX, styleSeedY + variety) * 0.14
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
          0.92 + hash2D('tree-owl-body-tint', styleSeedX, styleSeedY + variety) * 0.18
        ),
        roughness: 0.98,
        metalness: 0.01,
      }),
      owlEyeMaterial: new three.MeshStandardMaterial({
        color: '#f6e6a0',
        roughness: 0.82,
        metalness: 0.02,
      }),
      spiderMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#2c211d',
          0.9 + hash2D('tree-spider-body-tint', styleSeedX, styleSeedY + variety) * 0.14
        ),
        roughness: 0.98,
        metalness: 0.01,
      }),
      webMaterial: new three.MeshStandardMaterial({
        color: '#d9dfdf',
        roughness: 0.96,
        metalness: 0,
        transparent: true,
        opacity: 0.68,
      }),
      carvingMaterial: new three.MeshStandardMaterial({
        color: '#d3a06d',
        roughness: 0.96,
        metalness: 0.01,
      }),
      meadowGrassMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#79a85a',
          0.92 + hash2D('tree-meadow-grass-tint', styleSeedX, styleSeedY + variety) * 0.16
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
      breadcrumbMaterial: new three.MeshStandardMaterial({
        color: tintHexColor(
          '#e6d6a8',
          0.92 + hash2D('tree-breadcrumb-tint', styleSeedX + variety, styleSeedY) * 0.12
        ),
        roughness: 0.98,
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

function getForestFireflies(
  three: ThreeHostLike,
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
) {
  const descriptors = getForestVisibleFireflyDescriptors(state, tileX, tileY);
  return [createForestFireflyParticleCloud(three, descriptors)];
}

function getForestVisibleFireflyDescriptors(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
) {
  const descriptors = getForestFireflyDescriptors(tileX, tileY);
  const player = state?.player;
  if (!player || descriptors.length <= 1) {
    return descriptors;
  }

  const dx = tileX - player.x;
  const dy = tileY - player.y;
  const distanceSquared = dx * dx + dy * dy;
  const visibleCount =
    distanceSquared <= FOREST_FIREFLY_FULL_DISTANCE_SQUARED
      ? descriptors.length
      : distanceSquared <= FOREST_FIREFLY_MEDIUM_DISTANCE_SQUARED
        ? Math.min(descriptors.length, 2)
        : 1;
  return descriptors.slice(0, visibleCount);
}

function createForestFireflyParticleCloud(
  three: ThreeHostLike,
  descriptors: ForestFireflyDescriptor[]
) {
  const geometry = new three.BufferGeometry() as ThreeBufferGeometryLike;
  const positionValues = new Float32Array(descriptors.length * 3);
  const phaseValues = new Float32Array(descriptors.length);
  const driftValues = new Float32Array(descriptors.length);

  descriptors.forEach((descriptor, index) => {
    const offset = index * 3;
    positionValues[offset] = descriptor.baseX;
    positionValues[offset + 1] = descriptor.baseY;
    positionValues[offset + 2] = descriptor.baseZ;
    phaseValues[index] = descriptor.phase;
    driftValues[index] = descriptor.drift;
  });

  const positionAttribute = new three.Float32BufferAttribute(
    positionValues,
    3
  ) as {
    array: ArrayLike<number> & { [index: number]: number };
    needsUpdate?: boolean;
  };
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute(
    'fireflyPhase',
    new three.Float32BufferAttribute(phaseValues, 1) as ThreeBufferGeometryLike
  );
  geometry.setAttribute(
    'fireflyDrift',
    new three.Float32BufferAttribute(driftValues, 1) as ThreeBufferGeometryLike
  );

  const points = new three.Points(
    geometry,
    getSharedForestFireflyMaterial(three)
  );
  const material = points.material as ForestFireflyMaterialLike | undefined;

  points.userData = {
    ...(points.userData ?? {}),
    [FIREFLY_KEY]: {
      descriptors,
      positionAttribute:
        material?.uniforms ? undefined : positionAttribute,
      particleCount: descriptors.length,
      uniforms: material?.uniforms as ForestFireflyNodeState['uniforms'] | undefined,
    },
  };

  return points;
}

function getSharedForestFireflyMaterial(three: ThreeHostLike) {
  const cachedMaterial = forestFireflyMaterialCache.get(three);
  if (cachedMaterial) {
    return cachedMaterial;
  }

  const shaderMaterial = createForestFireflyShaderMaterial(three);
  if (shaderMaterial) {
    forestFireflyMaterialCache.set(three, shaderMaterial);
    return shaderMaterial;
  }

  const fireflyTexture = getSharedForestFireflyTexture(three);
  const material = new three.PointsMaterial(compactMaterialOptions({
    color: '#d9ff8a',
    map: fireflyTexture,
    size: fireflyTexture ? 0.115 : 0.085,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    alphaTest: fireflyTexture ? 0.08 : undefined,
  }));
  forestFireflyMaterialCache.set(three, material);
  return material;
}

function createForestFireflyShaderMaterial(three: ThreeHostLike) {
  const shaderHost = three as ForestFireflyShaderHost;
  if (!shaderHost.ShaderMaterial) {
    return null;
  }

  return new shaderHost.ShaderMaterial({
    uniforms: {
      uTimeMs: { value: 0 },
      uActivation: { value: 0 },
      uColor: { value: [0.85, 1, 0.54] },
    },
    vertexShader: FOREST_FIREFLY_VERTEX_SHADER,
    fragmentShader: FOREST_FIREFLY_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: shaderHost.AdditiveBlending,
  });
}

function getSharedForestFireflyTexture(three: ThreeHostLike) {
  const cachedTexture = forestFireflyTextureCache.get(three);
  if (cachedTexture) {
    return cachedTexture;
  }

  const texture = createPaintedCanvasTexture(three, {
    width: 16,
    height: 16,
    wrap: false,
    paint(context, canvas) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = canvas.width * 0.44;
      const gradient = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 214, 1)');
      gradient.addColorStop(0.35, 'rgba(238, 255, 160, 0.95)');
      gradient.addColorStop(0.7, 'rgba(205, 255, 136, 0.34)');
      gradient.addColorStop(1, 'rgba(205, 255, 136, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    },
  });
  forestFireflyTextureCache.set(three, texture);
  return texture;
}

function getForestFireflyHabitatAnchors(
  trees: ForestTreeDescriptor[],
  bushes: ForestBushDescriptor[],
  meadows: ForestMeadowDescriptor[]
): ForestFireflyHabitatAnchor[] {
  const anchors: ForestFireflyHabitatAnchor[] = trees.map((tree, index) => ({
    habitatKind: 'tree',
    x: tree.x,
    z: tree.y,
    radius: Math.min(0.16, tree.radius * (tree.form === 'broadleaf' ? 0.95 : 0.68)),
    height:
      tree.trunkHeight * (tree.form === 'broadleaf' ? 0.74 : 0.68) +
      tree.scale * 0.02,
    weight:
      (tree.form === 'broadleaf' ? 1.2 : 0.72) +
      Math.min(0.2, tree.scale * 0.1) +
      index * 0.0001,
  }));

  bushes.forEach((bush, index) => {
    anchors.push({
      habitatKind: 'bush',
      x: bush.x,
      z: bush.y,
      radius: Math.min(0.14, Math.max(bush.width, bush.depth) * 0.46),
      height: 0.18 + bush.height * 0.55,
      weight: 1.34 + index * 0.0001,
    });
  });

  meadows.forEach((meadow, index) => {
    anchors.push({
      habitatKind: 'meadow',
      x: meadow.x,
      z: meadow.y,
      radius: Math.min(0.16, Math.max(meadow.radiusX, meadow.radiusY) * 0.54),
      height: 0.16,
      weight: 1.18 + index * 0.0001,
    });
  });

  if (anchors.length > 0) {
    return anchors;
  }

  return [
    {
      habitatKind: 'tree',
      x: 0,
      z: 0,
      radius: 0.12,
      height: 0.42,
      weight: 1,
    },
  ];
}

function pickForestFireflyHabitatAnchor(
  anchors: ForestFireflyHabitatAnchor[],
  tileX: number,
  tileY: number,
  fireflyIndex: number
) {
  let selectedAnchor = anchors[0]!;
  let selectedScore = -1;

  anchors.forEach((anchor, anchorIndex) => {
    const score =
      hash2D(
        'forest-firefly-anchor',
        tileX * 29 + fireflyIndex * 11 + anchorIndex,
        tileY * 31 - fireflyIndex * 13 - anchorIndex
      ) * anchor.weight;
    if (score > selectedScore) {
      selectedAnchor = anchor;
      selectedScore = score;
    }
  });

  return selectedAnchor;
}

function shouldRenderForestCloseDetails(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
) {
  const player = state?.player;
  if (!player) {
    return true;
  }

  const deltaX = tileX - player.x;
  const deltaY = tileY - player.y;
  return (
    deltaX * deltaX + deltaY * deltaY <=
    FOREST_CLOSE_DETAIL_DISTANCE_SQUARED
  );
}

function addLowDetailForestTreeInstances(
  three: ThreeHostLike,
  group: ThreeObject3DLike,
  geometry: TreeGeometry,
  tileX: number,
  tileY: number,
  descriptors: ForestTreeDescriptor[]
) {
  const trunkBuckets = new Map<string, ForestTreeDescriptor[]>();

  for (const descriptor of descriptors) {
    const styleKey = String(descriptor.variety);
    if (!trunkBuckets.has(styleKey)) {
      trunkBuckets.set(styleKey, []);
    }
    trunkBuckets.get(styleKey)!.push(descriptor);
  }

  for (const [styleKey, bucket] of trunkBuckets.entries()) {
    const style = getTreeStyle(three, tileX, tileY, Number(styleKey));
    const form = bucket[0]?.form ?? 'broadleaf';
    const trunkInstances = new three.InstancedMesh(
      geometry.trunk,
      style.trunkMaterial,
      bucket.length
    );
    trunkInstances.userData = {
      ...(trunkInstances.userData ?? {}),
      [RENDER_STATS_CATEGORY_KEY]: 'tree',
      [TREE_FORM_KEY]: form,
      forestTreeLowDetailInstancedPart: 'trunk',
    };
    bucket.forEach((descriptor, index) => {
      trunkInstances.setMatrixAt(
        index,
        createLowDetailTreeMatrix(
          three,
          tileX + descriptor.x,
          descriptor.trunkHeight * descriptor.scale * 0.5,
          tileY + descriptor.y,
          descriptor.scale,
          descriptor.trunkHeight * descriptor.scale,
          descriptor.scale
        )
      );
    });
    group.add(trunkInstances);

    const canopyInstances = new three.InstancedMesh(
      geometry.foliage,
      style.foliageMaterial,
      bucket.length
    );
      canopyInstances.userData = {
        ...(canopyInstances.userData ?? {}),
        [RENDER_STATS_CATEGORY_KEY]: 'tree',
        [TREE_FORM_KEY]: form,
        forestTreeLowDetailInstancedPart: 'canopy',
      };
    bucket.forEach((descriptor, index) => {
      canopyInstances.setMatrixAt(
        index,
        createLowDetailTreeMatrix(
          three,
          tileX + descriptor.x,
          descriptor.trunkHeight *
            descriptor.scale *
            (descriptor.form === 'pine' ? 0.74 : 0.9),
          tileY + descriptor.y,
          descriptor.scale * (descriptor.form === 'pine' ? 0.54 : 0.84),
          descriptor.scale * (descriptor.form === 'pine' ? 1.18 : 0.72),
          descriptor.scale * (descriptor.form === 'pine' ? 0.54 : 0.84)
        )
      );
    });
    group.add(canopyInstances);
  }
}

function createLowDetailTreeMatrix(
  three: ThreeHostLike,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): ThreeMatrix4Like {
  return new three.Matrix4().makeScale(scaleX, scaleY, scaleZ).setPosition(x, y, z);
}

function addForestMeadowFlowerInstances(
  three: ThreeHostLike,
  group: ThreeObject3DLike,
  geometry: TreeGeometry,
  style: ForestTreeStyle,
  tileX: number,
  tileY: number,
  meadow: ForestMeadowDescriptor
) {
  if (meadow.flowers.length === 0) {
    return;
  }

  const stemInstances = new three.InstancedMesh(
    geometry.branch,
    style.meadowStemMaterial,
    meadow.flowers.length
  );
  stemInstances.userData = {
    ...(stemInstances.userData ?? {}),
    [MEADOW_KEY]: 'flower-stem',
  };
  meadow.flowers.forEach((flower, index) => {
    stemInstances.setMatrixAt(
      index,
      createLowDetailTreeMatrix(
        three,
        tileX + meadow.x + flower.x,
        0.08,
        tileY + meadow.y + flower.y,
        0.22,
        flower.height,
        0.22
      )
    );
  });
  group.add(stemInstances);

  const bloomsByColor = new Map<'white' | 'yellow', ForestFlowerDescriptor[]>();
  meadow.flowers.forEach((flower) => {
    if (!bloomsByColor.has(flower.color)) {
      bloomsByColor.set(flower.color, []);
    }
    bloomsByColor.get(flower.color)!.push(flower);
  });

  for (const [color, flowers] of bloomsByColor.entries()) {
    const bloomInstances = new three.InstancedMesh(
      geometry.foliage,
      color === 'white'
        ? style.meadowFlowerWhiteMaterial
        : style.meadowFlowerYellowMaterial,
      flowers.length
    );
    bloomInstances.userData = {
      ...(bloomInstances.userData ?? {}),
      [MEADOW_KEY]: color,
    };
    flowers.forEach((flower, index) => {
      bloomInstances.setMatrixAt(
        index,
        createLowDetailTreeMatrix(
          three,
          tileX + meadow.x + flower.x,
          0.12 + flower.height,
          tileY + meadow.y + flower.y,
          flower.scale,
          flower.scale,
          flower.scale
        )
      );
    });
    group.add(bloomInstances);
  }
}

function addForestBushInstances(
  three: ThreeHostLike,
  group: ThreeObject3DLike,
  geometry: TreeGeometry,
  style: ForestTreeStyle,
  tileX: number,
  tileY: number,
  bushes: ForestBushDescriptor[]
) {
  if (bushes.length === 0) {
    return;
  }

  const bushInstances = new three.InstancedMesh(
    geometry.foliage,
    style.foliageMaterial,
    bushes.length
  );
  bushInstances.userData = {
    ...(bushInstances.userData ?? {}),
    [BUSH_KEY]: true,
  };
  bushes.forEach((bush, index) => {
    bushInstances.setMatrixAt(
      index,
      createLowDetailTreeMatrix(
        three,
        tileX + bush.x,
        bush.height,
        tileY + bush.y,
        bush.width,
        bush.height,
        bush.depth
      )
    );
  });
  group.add(bushInstances);
}

function addForestBreadcrumbInstances(
  three: ThreeHostLike,
  group: ThreeObject3DLike,
  geometry: TreeGeometry,
  style: ForestTreeStyle,
  tileX: number,
  tileY: number,
  trail: ForestTrailDescriptor
) {
  if (trail.breadcrumbs.length === 0) {
    return;
  }

  const breadcrumbInstances = new three.InstancedMesh(
    geometry.foliage,
    style.breadcrumbMaterial,
    trail.breadcrumbs.length
  );
  breadcrumbInstances.userData = {
    ...(breadcrumbInstances.userData ?? {}),
    [TRAIL_KEY]: 'breadcrumb',
  };
  trail.breadcrumbs.forEach((breadcrumb, index) => {
    breadcrumbInstances.setMatrixAt(
      index,
      createLowDetailTreeMatrix(
        three,
        tileX + breadcrumb.x,
        0.03,
        tileY + breadcrumb.y,
        breadcrumb.scale * 1.4,
        breadcrumb.scale * 0.55,
        breadcrumb.scale
      )
    );
  });
  group.add(breadcrumbInstances);
}

function addForestWebInstances(
  three: ThreeHostLike,
  group: ThreeObject3DLike,
  geometry: TreeGeometry,
  style: ForestTreeStyle,
  tileX: number,
  tileY: number,
  webs: ForestWebDescriptor[]
) {
  if (webs.length === 0) {
    return;
  }

  const totalStrands = webs.reduce((sum, web) => sum + web.strandCount, 0);
  const webInstances = new three.InstancedMesh(
    geometry.foliage,
    style.webMaterial,
    totalStrands
  );
  webInstances.userData = {
    ...(webInstances.userData ?? {}),
    [WEB_KEY]: true,
  };

  let strandIndex = 0;
  webs.forEach((web, webIndex) => {
    for (let index = 0; index < web.strandCount; index += 1) {
      const angle =
        (index / web.strandCount) * Math.PI * 2 +
        hash2D('forest-web-angle', webIndex, index) * 0.3;
      const distance =
        web.radius *
        (0.24 + hash2D('forest-web-radius', webIndex, index) * 0.76);
      const silkScale =
        web.kind === 'deadwood'
          ? 0.008 + hash2D('forest-web-scale', webIndex, index) * 0.006
          : 0.007 + hash2D('forest-web-scale', webIndex, index) * 0.005;
      webInstances.setMatrixAt(
        strandIndex,
        createLowDetailTreeMatrix(
          three,
          tileX + web.x + Math.cos(angle) * distance,
          web.y + Math.sin(angle * 1.7) * web.radius * 0.16,
          tileY + web.z + Math.sin(angle) * distance,
          silkScale,
          silkScale,
          silkScale
        )
      );
      strandIndex += 1;
    }
  });

  group.add(webInstances);
}

function addForestSpiderInstances(
  three: ThreeHostLike,
  group: ThreeObject3DLike,
  geometry: TreeGeometry,
  style: ForestTreeStyle,
  tileX: number,
  tileY: number,
  spiders: ForestSpiderDescriptor[]
) {
  if (spiders.length === 0) {
    return;
  }

  const bodyInstances = new three.InstancedMesh(
    geometry.foliage,
    style.spiderMaterial,
    spiders.length
  );
  bodyInstances.userData = {
    ...(bodyInstances.userData ?? {}),
    [SPIDER_KEY]: 'body',
  };
  spiders.forEach((spider, index) => {
    bodyInstances.setMatrixAt(
      index,
      createLowDetailTreeMatrix(
        three,
        tileX + spider.x,
        spider.y,
        tileY + spider.z,
        spider.bodyScale,
        spider.bodyScale * 0.8,
        spider.bodyScale * 1.1
      )
    );
  });
  group.add(bodyInstances);

  const legInstances = new three.InstancedMesh(
    geometry.branch,
    style.spiderMaterial,
    spiders.length * 2
  );
  legInstances.userData = {
    ...(legInstances.userData ?? {}),
    [SPIDER_KEY]: 'legs',
  };
  spiders.forEach((spider, index) => {
    legInstances.setMatrixAt(
      index * 2,
      createLowDetailTreeMatrix(
        three,
        tileX + spider.x - spider.legSpan * 0.24,
        spider.y,
        tileY + spider.z,
        0.08,
        spider.bodyScale * 0.45,
        spider.legSpan
      )
    );
    legInstances.setMatrixAt(
      index * 2 + 1,
      createLowDetailTreeMatrix(
        three,
        tileX + spider.x + spider.legSpan * 0.24,
        spider.y,
        tileY + spider.z,
        0.08,
        spider.bodyScale * 0.45,
        spider.legSpan
      )
    );
  });
  group.add(legInstances);
}

function addForestBeaverDamageInstances(
  three: ThreeHostLike,
  group: ThreeObject3DLike,
  geometry: TreeGeometry,
  style: ForestTreeStyle,
  tileX: number,
  tileY: number,
  trees: ForestTreeDescriptor[],
  damages: ForestBeaverDamageDescriptor[]
) {
  if (damages.length === 0) {
    return;
  }

  const chewInstances = new three.InstancedMesh(
    geometry.trunk,
    style.carvingMaterial,
    damages.length
  );
  chewInstances.userData = {
    ...(chewInstances.userData ?? {}),
    [BEAVER_DAMAGE_KEY]: 'chew',
  };

  const branchDebrisCount = damages.reduce(
    (sum, damage) => sum + damage.strippedBranchCount,
    0
  );
  const nearFelledDamages = damages.filter(
    (damage) => damage.severity === 'near-felled'
  );
  const felledDamages = damages.filter((damage) => damage.severity === 'felled');
  const debrisInstances = new three.InstancedMesh(
    geometry.branch,
    style.trunkMaterial,
    branchDebrisCount
  );
  debrisInstances.userData = {
    ...(debrisInstances.userData ?? {}),
    [BEAVER_DAMAGE_KEY]: 'debris',
  };

  let debrisIndex = 0;
  damages.forEach((damage, index) => {
    const tree = trees[damage.treeIndex];
    if (!tree) {
      return;
    }

    const chewRadius = tree.radius * damage.chewRadiusScale;
    const chewHeight =
      damage.chewHeight *
      (damage.severity === 'near-felled'
        ? 1.24
        : damage.severity === 'deep'
          ? 1.18
          : 1);
    chewInstances.setMatrixAt(
      index,
      createLowDetailTreeMatrix(
        three,
        tileX + tree.x,
        chewHeight * 0.5,
        tileY + tree.y,
        chewRadius,
        chewHeight,
        chewRadius * damage.coneScale
      )
    );

    for (let branchIndex = 0; branchIndex < damage.strippedBranchCount; branchIndex += 1) {
      const angle =
        hash2D('forest-beaver-debris-angle', damage.treeIndex, branchIndex) *
        Math.PI *
        2;
      const distance =
        tree.radius * (0.65 + hash2D('forest-beaver-debris-distance', index, branchIndex) * 0.28);
      const length =
        0.12 + hash2D('forest-beaver-debris-length', damage.treeIndex, branchIndex) * 0.08;
      debrisInstances.setMatrixAt(
        debrisIndex,
        createLowDetailTreeMatrix(
          three,
          tileX + tree.x + Math.cos(angle) * distance,
          0.05,
          tileY + tree.y + Math.sin(angle) * distance,
          0.12,
          length,
          0.12
        )
      );
      debrisIndex += 1;
    }
  });

  group.add(chewInstances);
  group.add(debrisInstances);

  nearFelledDamages.forEach((damage) => {
    const tree = trees[damage.treeIndex];
    if (!tree) {
      return;
    }

    const leaningTrunk = new three.Mesh(geometry.trunk, style.trunkMaterial);
    leaningTrunk.position.set(
      tileX + tree.x + tree.radius * 0.22 * damage.leanDirection,
      tree.trunkHeight * 0.42,
      tileY + tree.y
    );
    leaningTrunk.rotation.z = damage.leanDirection * 0.72;
    leaningTrunk.scale.set(
      tree.radius * 0.86,
      tree.trunkHeight * 0.92,
      tree.radius * 0.86
    );
    leaningTrunk.userData = {
      ...(leaningTrunk.userData ?? {}),
      [BEAVER_DAMAGE_KEY]: 'near-felled',
    };
    group.add(leaningTrunk);
  });

  felledDamages.forEach((damage) => {
    const tree = trees[damage.treeIndex];
    if (!tree) {
      return;
    }

    const felledTrunk = new three.Mesh(geometry.trunk, style.trunkMaterial);
    felledTrunk.position.set(
      tileX + tree.x + tree.radius * 0.82 * damage.leanDirection,
      tree.radius * 0.46,
      tileY + tree.y
    );
    felledTrunk.rotation.z = Math.PI / 2;
    felledTrunk.rotation.y = damage.leanDirection > 0 ? 0.18 : -0.18;
    felledTrunk.scale.set(
      tree.radius * 0.82,
      tree.trunkHeight * 0.96,
      tree.radius * 0.82
    );
    felledTrunk.userData = {
      ...(felledTrunk.userData ?? {}),
      [BEAVER_DAMAGE_KEY]: 'felled',
    };
    group.add(felledTrunk);
  });
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
  const trail = getForestTrail(tileX, tileY);
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
    if (
      trail &&
      isPointInsideForestTrail(
        trail,
        x,
        y,
        kind === 'fallen-tree' ? 0.1 : 0.06
      )
    ) {
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
  const trail = getForestTrail(tileX, tileY);
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

    if (trail && isPointInsideForestTrail(trail, x, y, bushRadius + 0.02)) {
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
  const glyphs = getForestCarvingGlyphs(carving.text);
  const weathering = 0.18 + carving.age * 0.42;
  const visibleSeed = appendHashSeedLabel(
    carving.markerSeed,
    FOREST_CARVING_MARKER_VISIBLE_SEED
  );
  const prioritySeed = appendHashSeedLabel(
    carving.markerSeed,
    FOREST_CARVING_MARKER_PRIORITY_SEED
  );
  const jitterXSeed = appendHashSeedLabel(
    carving.markerSeed,
    FOREST_CARVING_MARKER_JITTER_X_SEED
  );
  const jitterYSeed = appendHashSeedLabel(
    carving.markerSeed,
    FOREST_CARVING_MARKER_JITTER_Y_SEED
  );
  const obscuredThreshold = Math.min(
    carving.preserved ? 0.34 : 0.94,
    carving.barkCoverage * (carving.preserved ? 0.42 : 0.72) + carving.age * 0.08
  );
  const visibleGlyphs = glyphs.filter(
    (_marker, index) =>
      hash2DWithSeed(visibleSeed, index, 0) >= obscuredThreshold
  );
  const minimumVisibleCount = carving.preserved
    ? Math.max(2, Math.ceil(glyphs.length * 0.55))
    : 0;
  const filteredGlyphs =
    carving.preserved && visibleGlyphs.length < minimumVisibleCount
      ? glyphs.filter(
          (_marker, index) =>
            hash2DWithSeed(prioritySeed, index, 0) >= 0.22
        )
      : visibleGlyphs;

  return filteredGlyphs
    .map((marker, index) => {
      const jitterX =
        (hash2DWithSeed(jitterXSeed, index, 0) - 0.5) *
        carving.scale *
        weathering *
        (carving.preserved ? 0.45 : 0.8) *
        0.8;
      const jitterY =
        (hash2DWithSeed(jitterYSeed, index, 0) - 0.5) *
        carving.scale *
        weathering *
        (carving.preserved ? 0.5 : 1) *
        0.45;

      return {
        x: marker.x * carving.scale * 1.25 + jitterX,
        y: marker.y * carving.scale * (1.7 - weathering * 0.24) + jitterY,
      };
    });
}

function getForestCarvingGlyphs(text: string) {
  const glyphs: ForestMarkerPoint[] = [];
  let cursorX = 0;

  for (const character of text) {
    const markerSet = FOREST_CARVING_GLYPHS[character];
    if (markerSet) {
      glyphs.push(...offsetMarkers(markerSet, cursorX, 0));
    }
    cursorX += getForestCarvingAdvance(character);
  }

  const width = Math.max(0, cursorX - 1.2);
  return glyphs.map((marker) => ({
    x: marker.x - width * 0.5,
    y: marker.y,
  }));
}

function getForestCarvingAdvance(character: string) {
  if (character === '1') {
    return 1.7;
  }
  if (character === '+' || character === '*') {
    return 1.9;
  }
  return 2.2;
}

function getForestCarvingText(
  motif: ForestCarvingDescriptor['motif'],
  tileX: number,
  tileY: number,
  treeIndex: number
) {
  if (motif === 'historical-inscription') {
    return pickForestCarvingLabel(
      FOREST_HISTORICAL_INSCRIPTION_LABELS,
      FOREST_CARVING_HISTORICAL_SEED,
      tileX,
      tileY,
      treeIndex
    );
  }

  if (motif === 'treasure-map-clue') {
    return pickForestCarvingLabel(
      FOREST_TREASURE_CLUE_LABELS,
      FOREST_CARVING_TREASURE_SEED,
      tileX,
      tileY,
      treeIndex
    );
  }

  if (motif === 'quest-hint') {
    return pickForestCarvingLabel(
      FOREST_QUEST_HINT_LABELS,
      FOREST_CARVING_QUEST_SEED,
      tileX,
      tileY,
      treeIndex
    );
  }

  if (motif === 'warning') {
    return '!';
  }

  if (motif === 'guild') {
    return 'G+';
  }

  if (motif === 'religious') {
    return '+';
  }

  if (motif === 'symbol') {
    return 'O';
  }

  if (motif === 'arrow') {
    return hash2D(FOREST_CARVING_ARROW_SEED, tileX + treeIndex, tileY) > 0.5
      ? '>'
      : '<';
  }

  if (motif === 'traveler-mark') {
    return 'X';
  }

  if (motif === 'date') {
    const year =
      1860 +
      Math.floor(hash2D(FOREST_CARVING_DATE_SEED, tileX + treeIndex, tileY) * 50);
    return String(year);
  }

  return motif === 'heart' ? 'LM*FG' : 'LM+FG';
}

function isForestQuestCarvingMotif(motif: ForestCarvingDescriptor['motif']) {
  return motif === 'quest-hint' || motif === 'treasure-map-clue';
}

function resolveForestCarvingAge(
  motif: ForestCarvingDescriptor['motif'],
  tileX: number,
  tileY: number,
  treeIndex: number
) {
  const baseAge = hash2D(FOREST_CARVING_AGE_SEED, tileX * 17 + treeIndex, tileY * 19);
  if (motif === 'historical-inscription') {
    return 0.78 + baseAge * 0.22;
  }
  if (motif === 'date' || motif === 'treasure-map-clue') {
    return 0.56 + baseAge * 0.38;
  }
  if (motif === 'quest-hint' || motif === 'traveler-mark' || motif === 'arrow') {
    return 0.18 + baseAge * 0.52;
  }
  if (motif === 'warning' || motif === 'guild' || motif === 'religious') {
    return 0.34 + baseAge * 0.46;
  }
  return 0.24 + baseAge * 0.64;
}

function resolveForestCarvingBarkCoverage(
  motif: ForestCarvingDescriptor['motif'],
  tileX: number,
  tileY: number,
  treeIndex: number
) {
  const age = resolveForestCarvingAge(motif, tileX, tileY, treeIndex);
  const baseCoverage = hash2D(
    FOREST_CARVING_BARK_COVERAGE_SEED,
    tileX * 23 + treeIndex,
    tileY * 29
  );
  const coverage = Math.min(
    0.92,
    Math.max(0.04, age * 0.58 + baseCoverage * 0.34 - 0.06)
  );
  return isForestQuestCarvingMotif(motif) ? Math.min(0.38, coverage) : coverage;
}

function createForestCarvingInspectAction({
  tile,
  x,
  y,
}: CreateWorldActionContext) {
  if (tile.kind !== 'forest') {
    return null;
  }

  const carving = getPrimaryForestCarving(x, y);
  if (!carving) {
    return null;
  }

  return {
    type: 'inspect',
    label: 'tree carvings',
    note: describeForestCarving(carving),
  };
}

function getPrimaryForestCarving(tileX: number, tileY: number) {
  const carvings = getForestCarvings(tileX, tileY);
  if (carvings.length === 0) {
    return null;
  }

  const preservedCarvings = carvings.filter((carving) => carving.preserved);
  if (preservedCarvings.length > 0) {
    const preservedIndex = Math.floor(
      hash2D(FOREST_CARVING_INSPECT_PRESERVED_SEED, tileX, tileY) *
        preservedCarvings.length
    );
    return (
      preservedCarvings[preservedIndex] ?? preservedCarvings[0] ?? carvings[0] ?? null
    );
  }

  const index = Math.floor(
    hash2D(FOREST_CARVING_INSPECT_SEED, tileX, tileY) * carvings.length
  );
  return carvings[index] ?? carvings[0] ?? null;
}

function describeForestCarving(carving: ForestCarvingDescriptor) {
  if (carving.motif === 'historical-inscription') {
    return `A weathered carving reads "${carving.text}", half-swallowed by old bark.`;
  }
  if (carving.motif === 'treasure-map-clue') {
    return `A cryptic carving marks "${carving.text}", like a clue cut for a hidden route.`;
  }
  if (carving.motif === 'quest-hint') {
    return `A deliberate trail sign reads "${carving.text}", pointing the observant onward.`;
  }
  if (carving.motif === 'warning') {
    return 'A stark warning mark has been carved deep into the trunk.';
  }
  if (carving.motif === 'guild') {
    return 'A compact guild sign has been cut into the bark with practiced strokes.';
  }
  if (carving.motif === 'religious') {
    return 'A simple devotional mark rests in the bark, smoothed by weather.';
  }
  if (carving.motif === 'symbol') {
    return 'A lone symbol circles the trunk, its meaning left to the woods.';
  }
  if (carving.motif === 'arrow') {
    return `A carved arrow points ${carving.text === '>' ? 'east' : 'west'}.`;
  }
  if (carving.motif === 'traveler-mark') {
    return 'A traveler has left an X-shaped waymark on the tree.';
  }
  if (carving.motif === 'date') {
    return `A faded date, "${carving.text}", is still visible beneath the bark growth.`;
  }
  if (carving.motif === 'heart') {
    return 'Two sets of initials are enclosed in a heart that has aged with the tree.';
  }
  return `Old initials, "${carving.text}", have been carved into the trunk.`;
}

function pickForestCarvingLabel(
  labels: readonly string[],
  seed: number,
  tileX: number,
  tileY: number,
  treeIndex: number
) {
  const index = Math.floor(
    hash2D(seed, tileX * 19 + treeIndex, tileY * 23) * labels.length
  );
  return labels[index] ?? labels[0] ?? '';
}

function createForestCarvingMarkerSeed(
  tileX: number,
  tileY: number,
  treeIndex: number
) {
  return appendHashSeedPart(
    appendHashSeedPart(
      appendHashSeedPart(FOREST_CARVING_MARKER_SEED, tileX),
      tileY
    ),
    treeIndex
  );
}

function createForestMeadowSeed(
  tileX: number,
  tileY: number,
  meadowIndex: number,
  attempt: number
) {
  return appendHashSeedPart(
    appendHashSeedPart(
      appendHashSeedPart(
        appendHashSeedPart(FOREST_MEADOW_SEED, tileX),
        tileY
      ),
      meadowIndex
    ),
    attempt
  );
}

function createForestFlowerSeed(meadowSeed: number, flowerIndex: number) {
  return appendHashSeedPart(
    appendHashSeedLabel(meadowSeed, FOREST_FLOWER_SEED),
    flowerIndex
  );
}

function createForestBirdSeed(tileX: number, tileY: number, birdIndex: number) {
  return appendHashSeedPart(
    appendHashSeedPart(
      appendHashSeedPart(FOREST_BIRD_SEED, tileX),
      tileY
    ),
    birdIndex
  );
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
  const trail = getForestTrail(tileX, tileY);
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = createForestMeadowSeed(tileX, tileY, meadowIndex, attempt);
    const x = clampToTile((hash2DWithSeed(seed, 1, 0) - 0.5) * 0.56);
    const y = clampToTile((hash2DWithSeed(seed, 2, 0) - 0.5) * 0.56);
    const radiusX = 0.2 + hash2DWithSeed(seed, 3, 0) * 0.08;
    const radiusY = 0.18 + hash2DWithSeed(seed, 4, 0) * 0.08;
    const clearance = Math.max(radiusX, radiusY) * 0.8;
    const nearTree = trees.some((tree) => {
      const distance = Math.hypot(x - tree.x, y - tree.y);
      return distance < tree.radius + clearance;
    });
    if (nearTree) {
      continue;
    }
    if (trail && isPointInsideForestTrail(trail, x, y, clearance * 0.6)) {
      continue;
    }
    if (landmark) {
      const distanceFromLandmark = Math.hypot(x - landmark.x, y - landmark.y);
      if (distanceFromLandmark < landmark.ringRadius + clearance) {
        continue;
      }
    }

    const flowerCount = 4 + Math.floor(hash2DWithSeed(seed, 5, 0) * 4);
    const flowers: ForestFlowerDescriptor[] = [];
    for (let flowerIndex = 0; flowerIndex < flowerCount; flowerIndex += 1) {
      const flowerSeed = createForestFlowerSeed(seed, flowerIndex);
      flowers.push({
        x: (hash2DWithSeed(flowerSeed, 1, 0) - 0.5) * radiusX * 1.4,
        y: (hash2DWithSeed(flowerSeed, 2, 0) - 0.5) * radiusY * 1.4,
        height: 0.06 + hash2DWithSeed(flowerSeed, 3, 0) * 0.03,
        scale: 0.026 + hash2DWithSeed(flowerSeed, 4, 0) * 0.014,
        color: hash2DWithSeed(flowerSeed, 5, 0) > 0.52 ? 'white' : 'yellow',
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
  cycle: {
    daylight: number;
    twilight: number;
    night: number;
    yearProgress?: number;
  },
  timeMs: number
) {
  const activation =
    getPoiLightActivation(cycle) *
    getForestFireflySeasonalActivation(cycle.yearProgress);
  root.traverse?.((node) => {
    const firefly = node.userData?.[FIREFLY_KEY] as
      | ForestFireflyNodeState
      | undefined;
    if (!firefly) {
      return;
    }
    node.visible = activation > 0.08;
    let materialOpacity = activation;

    if (firefly.uniforms) {
      firefly.uniforms.uTimeMs.value = timeMs;
      firefly.uniforms.uActivation.value = activation;
    } else if (firefly.positionAttribute) {
      let leadPulse = 0;

      firefly.descriptors.forEach((descriptor, index) => {
        const flutter =
          timeMs * (0.0014 + descriptor.drift * 0.0011) +
          descriptor.phase * Math.PI * 2;
        const pulse = (Math.sin(flutter * 1.9) + 1) * 0.5;
        const swayX = Math.cos(flutter) * 0.05;
        const swayY = Math.sin(flutter * 1.6) * 0.04;
        const swayZ = Math.sin(flutter * 1.2) * 0.05;
        const offset = index * 3;
        const x = descriptor.baseX + swayX;
        const y = descriptor.baseY + swayY;
        const z = descriptor.baseZ + swayZ;
        firefly.positionAttribute.array[offset] = x;
        firefly.positionAttribute.array[offset + 1] = y;
        firefly.positionAttribute.array[offset + 2] = z;
        if (index === 0) {
          leadPulse = pulse;
        }
      });
      firefly.positionAttribute.needsUpdate = true;
      materialOpacity = activation * (0.28 + leadPulse * 0.64);
    }

    const taggedNode = node as ThreeObject3DLike & {
      material?: ForestFireflyMaterialLike | ForestFireflyMaterialLike[];
    };
    if (taggedNode.material) {
      const materials = Array.isArray(taggedNode.material)
        ? taggedNode.material
        : [taggedNode.material];
      materials.forEach((material) => {
        material.opacity = materialOpacity;
      });
    }
  });
}

function syncForestWebGlint(
  root: ThreeObject3DLike,
  cycle: {
    daylight: number;
    twilight: number;
    night: number;
  },
  environment: WorldEnvironmentLike
) {
  const weather = environment?.weather?.current;
  const precipitation = weather?.precipitation ?? 0;
  const cloudCover = weather?.cloudCover ?? 0;
  const dewGlint = cycle.twilight * (0.45 + Math.max(0, cloudCover - precipitation) * 0.4);
  const rainGlint = precipitation * (0.7 + cloudCover * 0.3);
  const glint = Math.min(1, dewGlint + rainGlint + cycle.night * precipitation * 0.12);

  root.traverse?.((node) => {
    if (!node.userData?.[WEB_KEY]) {
      return;
    }

    const taggedNode = node as ThreeObject3DLike & {
      material?: ThreeMaterialLike | ThreeMaterialLike[];
    };
    if (!taggedNode.material) {
      return;
    }

    const materials = Array.isArray(taggedNode.material)
      ? taggedNode.material
      : [taggedNode.material];
    materials.forEach((material) => {
      const shadedMaterial = material as ThreeMaterialLike & {
        emissiveIntensity?: number;
        opacity?: number;
      };
      shadedMaterial.emissiveIntensity = 0.02 + glint * 0.42;
      shadedMaterial.opacity = 0.26 + glint * 0.58;
    });
  });
}

function getForestBeaverHabitatSignature(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
) {
  if (!state || typeof state.getCurrentTile !== 'function') {
    return 'dry';
  }

  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ] as const;
  const nearbyWaterways = offsets.filter(([offsetX, offsetY]) => {
    const kind = state.getCurrentTile(tileX + offsetX, tileY + offsetY)?.kind;
    return kind === 'river';
  });

  if (nearbyWaterways.length === 0) {
    return 'dry';
  }

  return nearbyWaterways
    .map(([offsetX, offsetY]) => `${offsetX},${offsetY}:river`)
    .sort()
    .join('|');
}

function getForestFireflySeasonalActivation(yearProgress?: number) {
  if (typeof yearProgress !== 'number') {
    return 1;
  }

  if (
    yearProgress <= FIREFLY_SEASON_START ||
    yearProgress >= FIREFLY_SEASON_END
  ) {
    return 0;
  }

  if (yearProgress <= FIREFLY_SEASON_PEAK) {
    return clampForestUnit(
      (yearProgress - FIREFLY_SEASON_START) /
        Math.max(0.001, FIREFLY_SEASON_PEAK - FIREFLY_SEASON_START)
    );
  }

  return clampForestUnit(
    (FIREFLY_SEASON_END - yearProgress) /
      Math.max(0.001, FIREFLY_SEASON_END - FIREFLY_SEASON_PEAK)
  );
}

function compactMaterialOptions<T extends Record<string, unknown>>(options: T): T {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  ) as T;
}

function clampForestUnit(value: number) {
  return Math.max(0, Math.min(1, value));
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

function tagForestFoliageWind(
  node: ThreeObject3DLike,
  tileX: number,
  tileY: number,
  variety: number,
  offsetSeed: number
) {
  node.userData = {
    ...(node.userData ?? {}),
    [TREE_FOLIAGE_KEY]: true,
  };
  return markPoiWindResponder(node, {
    axis: 'z',
    idleAmplitude: 0.012,
    windAmplitude: 0.065 + hash2D('forest-foliage-wind', tileX + variety, tileY) * 0.035,
    gustAmplitude:
      0.024 + hash2D('forest-foliage-gust', tileX, tileY + variety) * 0.018,
    speed: 0.75 + hash2D('forest-foliage-speed', tileX + offsetSeed, tileY) * 0.7,
    gustSpeed:
      1.6 + hash2D('forest-foliage-gust-speed', tileX, tileY + offsetSeed) * 0.8,
    phase:
      hash2D('forest-foliage-phase', tileX * 7 + variety, tileY + offsetSeed) *
      Math.PI *
      2,
    gustPhase:
      hash2D('forest-foliage-gust-phase', tileX + offsetSeed, tileY * 11 + variety) *
      Math.PI *
      2,
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

function isPointInsideForestTrail(
  trail: ForestTrailDescriptor,
  x: number,
  y: number,
  padding = 0
): boolean {
  return getDistanceToTrailSegment(trail, x, y) < trail.halfWidth + padding;
}

function getDistanceToTrailSegment(
  trail: ForestTrailDescriptor,
  x: number,
  y: number
): number {
  const segmentX = trail.end.x - trail.start.x;
  const segmentY = trail.end.y - trail.start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (segmentLengthSquared <= Number.EPSILON) {
    return Math.hypot(x - trail.start.x, y - trail.start.y);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((x - trail.start.x) * segmentX + (y - trail.start.y) * segmentY) /
        segmentLengthSquared
    )
  );
  const nearestX = trail.start.x + segmentX * projection;
  const nearestY = trail.start.y + segmentY * projection;
  return Math.hypot(x - nearestX, y - nearestY);
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
  spiderMaterial: ThreeMaterialLike;
  webMaterial: ThreeMaterialLike;
  carvingMaterial: ThreeMaterialLike;
  meadowGrassMaterial: ThreeMaterialLike;
  meadowStemMaterial: ThreeMaterialLike;
  meadowFlowerWhiteMaterial: ThreeMaterialLike;
  meadowFlowerYellowMaterial: ThreeMaterialLike;
  breadcrumbMaterial: ThreeMaterialLike;
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

interface ForestFireflyDescriptor {
  phase: number;
  drift: number;
  habitatKind: 'tree' | 'bush' | 'meadow';
  anchorX: number;
  anchorZ: number;
  anchorRadius: number;
  baseX: number;
  baseY: number;
  baseZ: number;
}

interface ForestFireflyHabitatAnchor {
  habitatKind: 'tree' | 'bush' | 'meadow';
  x: number;
  z: number;
  radius: number;
  height: number;
  weight: number;
}

interface ForestWebDescriptor {
  kind: 'branch' | 'hollow' | 'deadwood';
  x: number;
  y: number;
  z: number;
  radius: number;
  strandCount: number;
}

interface ForestSpiderDescriptor {
  webKind: 'branch' | 'hollow' | 'deadwood';
  x: number;
  y: number;
  z: number;
  bodyScale: number;
  legSpan: number;
}

interface ForestBeaverDamageDescriptor {
  treeIndex: number;
  chewHeight: number;
  chewRadiusScale: number;
  coneScale: number;
  severity: 'partial' | 'deep' | 'near-felled' | 'felled';
  strippedBranchCount: number;
  leanDirection: -1 | 1;
}

interface ForestBeaverPopulationDescriptor {
  habitatSignature: string;
  density: 'lodge-sign' | 'resident-pair' | 'active-colony';
  activity: number;
}

interface ForestTreeDescriptor {
  x: number;
  y: number;
  radius: number;
  scale: number;
  trunkHeight: number;
  variety: number;
  form: ForestTreeForm;
  branches: ForestBranchDescriptor[];
  foliage: ForestFoliageDescriptor[];
}

type ForestTreeForm = 'broadleaf' | 'pine';

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

interface ForestTrailBreadcrumb {
  x: number;
  y: number;
  scale: number;
}

interface ForestTrailDescriptor {
  start: {
    x: number;
    y: number;
  };
  end: {
    x: number;
    y: number;
  };
  halfWidth: number;
  breadcrumbs: ForestTrailBreadcrumb[];
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
  preserved: boolean;
  age: number;
  barkCoverage: number;
  markerSeed: number;
  motif:
    | 'initials'
    | 'heart'
    | 'date'
    | 'traveler-mark'
    | 'arrow'
    | 'symbol'
    | 'religious'
    | 'guild'
    | 'warning'
    | 'quest-hint'
    | 'treasure-map-clue'
    | 'historical-inscription';
  text: string;
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

const CARVING_LETTER_D = [
  { x: -0.6, y: 1.8 },
  { x: -0.6, y: 0.9 },
  { x: -0.6, y: 0 },
  { x: 0.1, y: 1.8 },
  { x: 0.6, y: 1.4 },
  { x: 0.7, y: 0.9 },
  { x: 0.6, y: 0.4 },
  { x: 0.1, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_LETTER_E = [
  { x: 0.6, y: 1.8 },
  { x: -0.6, y: 1.8 },
  { x: -0.6, y: 0.9 },
  { x: -0.6, y: 0 },
  { x: 0.6, y: 0 },
  { x: -0.4, y: 0.9 },
  { x: 0.3, y: 0.9 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_LETTER_N = [
  { x: -0.6, y: 0 },
  { x: -0.6, y: 0.9 },
  { x: -0.6, y: 1.8 },
  { x: 0, y: 0.9 },
  { x: 0.6, y: 1.8 },
  { x: 0.6, y: 0.9 },
  { x: 0.6, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_LETTER_S = [
  { x: 0.5, y: 1.8 },
  { x: -0.4, y: 1.8 },
  { x: -0.7, y: 1.3 },
  { x: 0.3, y: 0.9 },
  { x: 0.6, y: 0.4 },
  { x: -0.3, y: 0 },
  { x: -0.7, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_LETTER_W = [
  { x: -0.8, y: 1.8 },
  { x: -0.4, y: 0 },
  { x: 0, y: 1.1 },
  { x: 0.4, y: 0 },
  { x: 0.8, y: 1.8 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_0 = [
  { x: -0.6, y: 1.8 },
  { x: 0.1, y: 1.8 },
  { x: 0.5, y: 1.2 },
  { x: 0.5, y: 0.6 },
  { x: 0.1, y: 0 },
  { x: -0.6, y: 0 },
  { x: -0.9, y: 0.6 },
  { x: -0.9, y: 1.2 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_1 = [
  { x: -0.1, y: 1.4 },
  { x: 0.2, y: 1.8 },
  { x: 0.2, y: 0.9 },
  { x: 0.2, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_2 = [
  { x: -0.7, y: 1.6 },
  { x: 0, y: 1.8 },
  { x: 0.6, y: 1.5 },
  { x: 0.4, y: 1.0 },
  { x: -0.2, y: 0.5 },
  { x: -0.7, y: 0 },
  { x: 0.6, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_3 = [
  { x: -0.6, y: 1.7 },
  { x: 0, y: 1.8 },
  { x: 0.5, y: 1.4 },
  { x: 0, y: 0.9 },
  { x: 0.5, y: 0.4 },
  { x: 0, y: 0 },
  { x: -0.6, y: 0.1 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_4 = [
  { x: 0.4, y: 1.8 },
  { x: -0.5, y: 0.9 },
  { x: 0.6, y: 0.9 },
  { x: 0.6, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_5 = [
  { x: 0.5, y: 1.8 },
  { x: -0.5, y: 1.8 },
  { x: -0.5, y: 1.0 },
  { x: 0.2, y: 1.0 },
  { x: 0.5, y: 0.5 },
  { x: 0.1, y: 0 },
  { x: -0.6, y: 0.1 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_6 = [
  { x: 0.3, y: 1.8 },
  { x: -0.4, y: 1.5 },
  { x: -0.8, y: 0.9 },
  { x: -0.6, y: 0.2 },
  { x: 0, y: 0 },
  { x: 0.5, y: 0.4 },
  { x: 0.2, y: 0.9 },
  { x: -0.4, y: 0.9 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_7 = [
  { x: -0.6, y: 1.8 },
  { x: 0.6, y: 1.8 },
  { x: 0.1, y: 1.0 },
  { x: -0.2, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_8 = [
  { x: -0.5, y: 1.7 },
  { x: 0, y: 1.9 },
  { x: 0.5, y: 1.6 },
  { x: 0, y: 1.0 },
  { x: -0.5, y: 0.5 },
  { x: 0, y: 0 },
  { x: 0.5, y: 0.4 },
  { x: 0, y: 0.9 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_DIGIT_9 = [
  { x: 0.4, y: 0.2 },
  { x: 0.7, y: 0.9 },
  { x: 0.5, y: 1.6 },
  { x: -0.1, y: 1.8 },
  { x: -0.6, y: 1.4 },
  { x: -0.3, y: 0.9 },
  { x: 0.3, y: 0.9 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_TRAVELER_X = [
  { x: -0.7, y: 1.8 },
  { x: -0.2, y: 1.2 },
  { x: 0.2, y: 0.6 },
  { x: 0.7, y: 0 },
  { x: 0.7, y: 1.8 },
  { x: 0.2, y: 1.2 },
  { x: -0.2, y: 0.6 },
  { x: -0.7, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_ARROW_RIGHT = [
  { x: -0.8, y: 0.9 },
  { x: -0.1, y: 0.9 },
  { x: 0.4, y: 1.5 },
  { x: 0.9, y: 0.9 },
  { x: 0.4, y: 0.3 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_ARROW_LEFT = [
  { x: 0.8, y: 0.9 },
  { x: 0.1, y: 0.9 },
  { x: -0.4, y: 1.5 },
  { x: -0.9, y: 0.9 },
  { x: -0.4, y: 0.3 },
] as const satisfies readonly ForestMarkerPoint[];

const CARVING_WARNING = [
  { x: 0, y: 1.8 },
  { x: 0, y: 1.3 },
  { x: 0, y: 0.8 },
  { x: 0, y: 0.3 },
  { x: 0, y: 0 },
] as const satisfies readonly ForestMarkerPoint[];

const FOREST_CARVING_GLYPHS = {
  D: CARVING_LETTER_D,
  E: CARVING_LETTER_E,
  L: CARVING_LETTER_L,
  M: CARVING_LETTER_M,
  F: CARVING_LETTER_F,
  G: CARVING_LETTER_G,
  N: CARVING_LETTER_N,
  O: CARVING_DIGIT_0,
  S: CARVING_LETTER_S,
  W: CARVING_LETTER_W,
  '+': CARVING_PLUS,
  '*': CARVING_HEART,
  '0': CARVING_DIGIT_0,
  '1': CARVING_DIGIT_1,
  '2': CARVING_DIGIT_2,
  '3': CARVING_DIGIT_3,
  '4': CARVING_DIGIT_4,
  '5': CARVING_DIGIT_5,
  '6': CARVING_DIGIT_6,
  '7': CARVING_DIGIT_7,
  '8': CARVING_DIGIT_8,
  '9': CARVING_DIGIT_9,
  X: CARVING_TRAVELER_X,
  '>': CARVING_ARROW_RIGHT,
  '<': CARVING_ARROW_LEFT,
  '!': CARVING_WARNING,
} as const satisfies Record<string, readonly ForestMarkerPoint[]>;
