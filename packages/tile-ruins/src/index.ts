import {
  appendHashSeedLabel,
  hash2D,
  hash2DWithSeed,
  registerHashLabel,
  registerHashSeed,
  resolveHashSeed,
} from '@bworlds/core/hash';
import { createBoundedCache, getOrCreateWeakMapValue } from '@bworlds/cache-support';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  DEFAULT_LAND_POI_BLOCKED_KINDS,
  createChanceBasedLandPoiClassifier,
  markPoiLightEmitter,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import {
  createHostVariantValueResolver,
  createRegionalValueResolver,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import {
  createTilePlugin,
  withOverworldTileClassifier,
} from '@bworlds/plugin-api';
import {
  createPaintedStandardMaterial,
  getSharedSphereGeometry,
} from '@bworlds/three-support';
import type {
  Create3DModelContext,
  Create3DModelProgress,
  RenderBudgetQualityLevel,
  RuntimePlugin,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeMatrix4Like,
} from '@bworlds/plugin-api';

const RUINS_REGION_SIZE = 16;
const RUINS_STONE_TONE_SEED = registerHashLabel('ruins-stone-tone');
const RUINS_ACCENT_TONE_SEED = registerHashLabel('ruins-accent-tone');
const RUINS_COLUMNS_SEED = registerHashLabel('ruins-columns');
const RUINS_COLUMN_RADIUS_SEED = registerHashLabel('ruins-column-radius');
const RUINS_COLUMN_HEIGHT_SEED = registerHashLabel('ruins-column-height');
const RUINS_ARCH_SEED = registerHashLabel('ruins-arch');
const RUINS_ARCH_X_SEED = registerHashLabel('ruins-arch-x');
const RUINS_ARCH_HEIGHT_SEED = registerHashLabel('ruins-arch-h');
const RUINS_ARCH_Z_SEED = registerHashLabel('ruins-arch-z');
const RUINS_ARCH_ROTATION_SEED = registerHashLabel('ruins-arch-rot');
const RUINS_RUBBLE_COUNT_SEED = registerHashLabel('ruins-rubble');
const RUINS_RUBBLE_WIDTH_SEED = registerHashLabel('ruins-rubble-w');
const RUINS_RUBBLE_HEIGHT_SEED = registerHashLabel('ruins-rubble-h');
const RUINS_RUBBLE_DEPTH_SEED = registerHashLabel('ruins-rubble-d');
const RUINS_RUBBLE_X_SEED = registerHashLabel('ruins-rubble-x');
const RUINS_RUBBLE_Z_SEED = registerHashLabel('ruins-rubble-z');
const RUINS_CHIP_X_SEED = registerHashLabel('ruins-chip-x');
const RUINS_CHIP_Y_SEED = registerHashLabel('ruins-chip-y');
const RUINS_CHIP_SIZE_SEED = registerHashLabel('ruins-chip-size');
const RUINS_CHIP_ALPHA_SEED = registerHashLabel('ruins-chip-a');
const RUINS_CRACK_X_SEED = registerHashLabel('ruins-crack-x');
const RUINS_CRACK_Y_SEED = registerHashLabel('ruins-crack-y');
const RUINS_CRACK_LENGTH_SEED = registerHashLabel('ruins-crack-l');
const RUINS_REGION_BIAS_SEED = registerHashLabel('ruins-region');
const RUINS_LOCAL_BIAS_SEED = registerHashLabel('ruins-local');
export const RUINS_STYLE_CACHE_MAX_ENTRIES = 96;
const RUINS_BLOCKED_KINDS = new Set([
  ...DEFAULT_LAND_POI_BLOCKED_KINDS,
  'road',
  'bridge',
  'town',
  'cave',
  'dungeon',
  'sign',
]);
const ruinsStyleCache = createBoundedCache<string, RuinsStyleBlueprint>(
  RUINS_STYLE_CACHE_MAX_ENTRIES
);
const ruinsGlowMaterialCache = new WeakMap<object, ThreeMaterialLike>();
const resolveRuinsStyle = createRegionalValueResolver(
  ruinsStyleCache,
  RUINS_REGION_SIZE,
  ({ regionX, regionY }) => {
    const stoneColor = pickThresholdColor(
      hash2D(RUINS_STONE_TONE_SEED, regionX, regionY),
      0.74,
      '#9c9287',
      '#a8a093'
    );
    const accentColor = pickThresholdColor(
      hash2D(RUINS_ACCENT_TONE_SEED, regionX, regionY),
      0.62,
      '#746b61',
      '#8c6d5b'
    );

    return createHostVariantValueResolver(
      (three: ThreeHostLike, quality: RenderBudgetQualityLevel) => {
        const style = {
          stoneMaterial: createPaintedStandardMaterial(three, {
            color: stoneColor,
            roughness: 0.96,
            metalness: 0.03,
            quality,
            width: 64,
            height: 64,
            repeatX: 1.5,
            repeatY: 1.5,
            paint(context, canvas) {
              paintRuinsTexture(
                context,
                canvas,
                regionX,
                regionY,
                stoneColor,
                accentColor
              );
            },
          }),
          accentMaterial: createPaintedStandardMaterial(three, {
            color: accentColor,
            roughness: 0.92,
            metalness: 0.02,
            quality,
            width: 64,
            height: 64,
            repeatX: 1.5,
            repeatY: 1.5,
            paint(context, canvas) {
              paintRuinsTexture(
                context,
                canvas,
                regionX,
                regionY,
                stoneColor,
                accentColor
              );
            },
          }),
          glowMaterial: getSharedRuinsGlowMaterial(three),
        };
        return style;
      }
    );
  }
);
const classifyRuinsTile = createChanceBasedLandPoiClassifier({
  kind: 'ruins',
  poiType: 'ruins',
  note: 'Weathered ruins rest in the open land.',
  threshold: 0.9925,
  blockedKinds: RUINS_BLOCKED_KINDS,
  getChance(context) {
    const seedHash =
      typeof context.seed === 'number'
        ? resolveHashSeed(context.seed)
        : registerHashSeed(context.seed);
    const regionalBias =
      hash2DWithSeed(
        appendHashSeedLabel(seedHash, RUINS_REGION_BIAS_SEED),
        Math.floor(context.x / 24),
        Math.floor(context.y / 24)
      ) * 0.45;
    const localBias =
      hash2DWithSeed(
        appendHashSeedLabel(seedHash, RUINS_LOCAL_BIAS_SEED),
        context.x,
        context.y
      ) * 0.4;
    const terrainBias =
      context.signals.elevation * 0.22 +
      (1 - context.signals.moisture) * 0.16 +
      context.signals.roadSignal * 0.12;
    return regionalBias + localBias + terrainBias;
  },
});

export function createRuinsTilePlugin(): RuntimePlugin {
  return createTilePlugin('tile-ruins', [
    withOverworldTileClassifier(
      {
        kind: 'ruins',
        definition: {
          name: 'Ruins',
          color: '#8b8173',
          miniColor: '#b3ab9f',
          walkable: true,
          wallHeight: 0.35,
        },
        paint2D: createPlainsBackedTilePainter(
          ({ context, x, y, motif, fillRect, speckle }) => {
            speckle(context, x, y, '#c8c0b5', 12, 0.2, motif);
            const plinthY = 9 + motif.int(-1, 1);
            fillRect(context, x + 2, y + plinthY, 12, 3, '#7b7166');
            fillRect(context, x + 3, y + plinthY - 4, 2, 4, '#a89f93');
            fillRect(context, x + 11, y + plinthY - 5, 2, 5, '#a89f93');
            fillRect(context, x + 5, y + plinthY - 6, 5, 2, '#bcb3a7');
            fillRect(context, x + 6, y + plinthY - 3, 3, 1, '#5a5148');
            return true;
          }
        ),
        create3DModel(context: Create3DModelContext) {
          return runRuinsModelBuildToCompletion(
            createRuinsModelProgressive(context)
          );
        },
        create3DModelProgressive(context: Create3DModelContext) {
          return createRuinsModelProgressive(context);
        },
        sync3DModel({ model, cycle }) {
          if (!model || typeof model !== 'object') {
            return;
          }
          syncPoiLightEmitters(
            model as Parameters<typeof syncPoiLightEmitters>[0],
            cycle
          );
        },
      },
      classifyRuinsTile
    ),
  ]);
}

function* createRuinsModelProgressive({
  three,
  tileX,
  tileY,
  renderBudget,
}: Create3DModelContext): Generator<Create3DModelProgress, unknown, void> {
  const style = getRuinsStyle(three, tileX, tileY, renderBudget?.quality);
  const group = new three.Group();
  group.position.set(tileX, 0, tileY);
  const totalSteps = 3;

  const base = new three.Mesh(
    new three.BoxGeometry(0.82, 0.1, 0.82),
    style.stoneMaterial
  );
  base.position.y = 0.05;
  group.add(base);

  const columnCount =
    3 + Math.floor(hash2D(RUINS_COLUMNS_SEED, tileX, tileY) * 3);
  const columnInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    style.stoneMaterial,
    columnCount
  );
  columnInstances.userData = {
    ...columnInstances.userData,
    ruinsInstancedPart: 'column',
  };
  const capPositions: Array<{ x: number; y: number; z: number }> = [];
  const columnMatrixScratch = new three.Matrix4();
  for (let index = 0; index < columnCount; index += 1) {
    const angle = (index / columnCount) * Math.PI * 2;
    const radius =
      0.18 + hash2D(RUINS_COLUMN_RADIUS_SEED, tileX + index, tileY) * 0.16;
    const height =
      0.28 + hash2D(RUINS_COLUMN_HEIGHT_SEED, tileX, tileY + index) * 0.36;
    const columnX = Math.cos(angle) * radius;
    const columnY = 0.1 + height * 0.5;
    const columnZ = Math.sin(angle) * radius;
    columnInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        columnMatrixScratch,
        tileX + columnX,
        columnY,
        tileY + columnZ,
        0.1,
        height,
        0.1
      )
    );

    if (height > 0.44) {
      capPositions.push({
        x: columnX,
        y: columnY + height * 0.5 - 0.02,
        z: columnZ,
      });
    }
  }
  group.add(columnInstances);

  if (capPositions.length > 0) {
    const capInstances = new three.InstancedMesh(
      new three.BoxGeometry(1, 1, 1),
      style.accentMaterial,
      capPositions.length
    );
    capInstances.userData = {
      ...capInstances.userData,
      ruinsInstancedPart: 'column-cap',
    };
    const capMatrixScratch = new three.Matrix4();
    for (let index = 0; index < capPositions.length; index += 1) {
      const capPosition = capPositions[index]!;
      capInstances.setMatrixAt(
        index,
        writeInstancedScalePositionMatrix(
          capMatrixScratch,
          tileX + capPosition.x,
          capPosition.y,
          tileY + capPosition.z,
          0.16,
          0.06,
          0.16
        )
      );
    }
    group.add(capInstances);
  }
  yield {
    completedSteps: 1,
    totalSteps,
    label: 'plinth-columns',
  };

  if (hash2D(RUINS_ARCH_SEED, tileX, tileY) > 0.28) {
    const arch = new three.Mesh(
      new three.BoxGeometry(0.46, 0.12, 0.14),
      style.accentMaterial
    );
    arch.position.set(
      (hash2D(RUINS_ARCH_X_SEED, tileX, tileY) - 0.5) * 0.16,
      0.5 + hash2D(RUINS_ARCH_HEIGHT_SEED, tileX, tileY) * 0.12,
      (hash2D(RUINS_ARCH_Z_SEED, tileX, tileY) - 0.5) * 0.16
    );
    arch.rotation.y = hash2D(RUINS_ARCH_ROTATION_SEED, tileX, tileY) * Math.PI;
    group.add(arch);
  }

  const rubbleCount =
    4 + Math.floor(hash2D(RUINS_RUBBLE_COUNT_SEED, tileX, tileY) * 4);
  const rubbleInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    style.stoneMaterial,
    rubbleCount
  );
  rubbleInstances.userData = {
    ...rubbleInstances.userData,
    ruinsInstancedPart: 'rubble-stone',
  };
  const rubbleMatrixScratch = new three.Matrix4();
  for (let index = 0; index < rubbleCount; index += 1) {
    rubbleInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        rubbleMatrixScratch,
        tileX + (hash2D(RUINS_RUBBLE_X_SEED, tileX + index, tileY) - 0.5) * 0.6,
        0.11,
        tileY + (hash2D(RUINS_RUBBLE_Z_SEED, tileX, tileY + index) - 0.5) * 0.6,
        0.08 + hash2D(RUINS_RUBBLE_WIDTH_SEED, tileX + index, tileY) * 0.08,
        0.05 + hash2D(RUINS_RUBBLE_HEIGHT_SEED, tileX, tileY + index) * 0.05,
        0.08 + hash2D(RUINS_RUBBLE_DEPTH_SEED, tileX - index, tileY) * 0.08
      )
    );
  }
  group.add(rubbleInstances);
  yield {
    completedSteps: 2,
    totalSteps,
    label: 'arch-rubble',
  };

  const glowCore = markPoiLightEmitter(
    new three.Mesh(
      getSharedSphereGeometry(three, 0.05, 8, 8),
      style.glowMaterial
    ),
    {
      kind: 'emissive-mesh',
      dayIntensity: 0.01,
      nightIntensity: 0.62,
    }
  );
  glowCore.position.set(0, 0.24, 0);
  group.add(glowCore);

  const glowLight = markPoiLightEmitter(
    new three.PointLight('#60a5fa', 0, 2.6, 1.9),
    {
      kind: 'point-light',
      nightIntensity: 0.38,
      visibleThreshold: 0.03,
    }
  );
  glowLight.position.set(0, 0.22, 0);
  glowLight.visible = false;
  group.add(glowLight);
  yield {
    completedSteps: 3,
    totalSteps,
    label: 'glow',
  };

  return group;
}

function runRuinsModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
): unknown {
  while (true) {
    const next = build.next();
    if (next.done) {
      return next.value;
    }
  }
}

function getRuinsStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  quality: RenderBudgetQualityLevel = 'full'
): RuinsStyle {
  return resolveRuinsStyle(tileX, tileY).getValue(three, quality);
}

function getSharedRuinsGlowMaterial(three: ThreeHostLike): ThreeMaterialLike {
  return getOrCreateWeakMapValue(ruinsGlowMaterialCache, three as object, () =>
    new three.MeshStandardMaterial({
      color: '#93c5fd',
      emissive: '#93c5fd',
      emissiveIntensity: 0.01,
      roughness: 0.28,
      metalness: 0.04,
    })
  );
}

function paintRuinsTexture(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  regionX: number,
  regionY: number,
  stoneColor: string,
  accentColor: string
) {
  context.fillStyle = stoneColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < canvas.height; row += 8) {
    context.fillStyle =
      row % 16 === 0 ? accentColor : withAlpha(accentColor, 0.35);
    context.fillRect(0, row, canvas.width, 2);
  }

  for (let index = 0; index < 90; index += 1) {
    const x = Math.floor(
      hash2D(RUINS_CHIP_X_SEED, regionX * 31 + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D(RUINS_CHIP_Y_SEED, regionY * 37 + index, regionX) * canvas.height
    );
    const size =
      1 +
      Math.floor(hash2D(RUINS_CHIP_SIZE_SEED, regionX + index, regionY) * 3);
    context.fillStyle = withAlpha(
      '#f2ede5',
      0.18 + hash2D(RUINS_CHIP_ALPHA_SEED, regionX, regionY + index) * 0.16
    );
    context.fillRect(x, y, size, 1);
  }

  for (let index = 0; index < 28; index += 1) {
    const x = Math.floor(
      hash2D(RUINS_CRACK_X_SEED, regionX + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D(RUINS_CRACK_Y_SEED, regionY + index, regionX) * canvas.height
    );
    const length =
      3 +
      Math.floor(hash2D(RUINS_CRACK_LENGTH_SEED, regionX, regionY + index) * 8);
    context.fillStyle = 'rgba(41, 34, 30, 0.22)';
    context.fillRect(x, y, 1, length);
  }
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function writeInstancedScalePositionMatrix(
  matrix: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): ThreeMatrix4Like {
  return matrix.makeScale(scaleX, scaleY, scaleZ).setPosition(x, y, z);
}

type RuinsStyle = {
  stoneMaterial: ThreeMaterialLike;
  accentMaterial: ThreeMaterialLike;
  glowMaterial: ThreeMaterialLike;
};

type RuinsStyleBlueprint = {
  getValue(three: ThreeHostLike, quality: RenderBudgetQualityLevel): RuinsStyle;
};
