import { hash2D } from '@bworlds/core';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  DEFAULT_LAND_POI_BLOCKED_KINDS,
  createChanceBasedLandPoiClassifier,
} from '@bworlds/poi-support';
import {
  createRegionalValueResolver,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import { createTilePlugin, withOverworldTileClassifier } from '@bworlds/plugin-api';
import { createPaintedStandardMaterial } from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Create3DModelContext,
  Paint2DContext,
  RuntimePlugin,
  ThreeHostLike,
  ThreeMaterialLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const RUINS_REGION_SIZE = 16;
const RUINS_BLOCKED_KINDS = new Set([
  ...DEFAULT_LAND_POI_BLOCKED_KINDS,
  'road',
  'bridge',
  'town',
  'cave',
  'dungeon',
  'sign',
]);
const ruinsStyleCache = new Map<string, RuinsStyleBlueprint>();
const resolveRuinsStyle = createRegionalValueResolver(
  ruinsStyleCache,
  RUINS_REGION_SIZE,
  ({ regionX, regionY }) => {
    const stoneColor = pickThresholdColor(
      hash2D('ruins-stone-tone', regionX, regionY),
      0.74,
      '#9c9287',
      '#a8a093'
    );
    const accentColor = pickThresholdColor(
      hash2D('ruins-accent-tone', regionX, regionY),
      0.62,
      '#746b61',
      '#8c6d5b'
    );

    return {
      createMaterials(three: ThreeHostLike) {
        return {
          stoneMaterial: createPaintedStandardMaterial(three, {
            color: stoneColor,
            roughness: 0.96,
            metalness: 0.03,
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
        };
      },
    };
  }
);
const classifyRuinsTile = createChanceBasedLandPoiClassifier({
  kind: 'ruins',
  poiType: 'ruins',
  note: 'Weathered ruins rest in the open land.',
  threshold: 0.9925,
  blockedKinds: RUINS_BLOCKED_KINDS,
  getChance(context) {
    const regionalBias =
      hash2D(
        `${context.seed}:ruins-region`,
        Math.floor(context.x / 24),
        Math.floor(context.y / 24)
      ) * 0.45;
    const localBias =
      hash2D(`${context.seed}:ruins-local`, context.x, context.y) * 0.4;
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
        paint2D: createPlainsBackedTilePainter(({ context, x, y, motif, fillRect, speckle }) => {
          speckle(context, x, y, '#c8c0b5', 12, 0.2, motif);
          const plinthY = 9 + motif.int(-1, 1);
          fillRect(context, x + 2, y + plinthY, 12, 3, '#7b7166');
          fillRect(context, x + 3, y + plinthY - 4, 2, 4, '#a89f93');
          fillRect(context, x + 11, y + plinthY - 5, 2, 5, '#a89f93');
          fillRect(context, x + 5, y + plinthY - 6, 5, 2, '#bcb3a7');
          fillRect(context, x + 6, y + plinthY - 3, 3, 1, '#5a5148');
          return true;
        }),
        create3DModel({ three, tileX, tileY }: Create3DModelContext) {
          const style = getRuinsStyle(three, tileX, tileY);
          const group = new three.Group();
          group.position.set(tileX, 0, tileY);

          const base = new three.Mesh(
            new three.BoxGeometry(0.82, 0.1, 0.82),
            style.stoneMaterial
          );
          base.position.y = 0.05;
          group.add(base);

          const columnCount =
            3 + Math.floor(hash2D('ruins-columns', tileX, tileY) * 3);
          for (let index = 0; index < columnCount; index += 1) {
            const angle = (index / columnCount) * Math.PI * 2;
            const radius =
              0.18 + hash2D('ruins-column-radius', tileX + index, tileY) * 0.16;
            const height =
              0.28 + hash2D('ruins-column-height', tileX, tileY + index) * 0.36;
            const column = new three.Mesh(
              new three.BoxGeometry(0.1, height, 0.1),
              style.stoneMaterial
            );
            column.position.set(
              Math.cos(angle) * radius,
              0.1 + height * 0.5,
              Math.sin(angle) * radius
            );
            column.rotation.y =
              hash2D('ruins-column-rot', tileX + index, tileY - index) * Math.PI;
            group.add(column);

            if (height > 0.44) {
              const cap = new three.Mesh(
                new three.BoxGeometry(0.16, 0.06, 0.16),
                style.accentMaterial
              );
              cap.position.set(
                column.position.x,
                column.position.y + height * 0.5 - 0.02,
                column.position.z
              );
              group.add(cap);
            }
          }

          if (hash2D('ruins-arch', tileX, tileY) > 0.28) {
            const arch = new three.Mesh(
              new three.BoxGeometry(0.46, 0.12, 0.14),
              style.accentMaterial
            );
            arch.position.set(
              (hash2D('ruins-arch-x', tileX, tileY) - 0.5) * 0.16,
              0.5 + hash2D('ruins-arch-h', tileX, tileY) * 0.12,
              (hash2D('ruins-arch-z', tileX, tileY) - 0.5) * 0.16
            );
            arch.rotation.y = hash2D('ruins-arch-rot', tileX, tileY) * Math.PI;
            group.add(arch);
          }

          const rubbleCount =
            4 + Math.floor(hash2D('ruins-rubble', tileX, tileY) * 4);
          for (let index = 0; index < rubbleCount; index += 1) {
            const rubble = new three.Mesh(
              new three.BoxGeometry(
                0.08 + hash2D('ruins-rubble-w', tileX + index, tileY) * 0.08,
                0.05 + hash2D('ruins-rubble-h', tileX, tileY + index) * 0.05,
                0.08 + hash2D('ruins-rubble-d', tileX - index, tileY) * 0.08
              ),
              style.stoneMaterial
            );
            rubble.position.set(
              (hash2D('ruins-rubble-x', tileX + index, tileY) - 0.5) * 0.6,
              0.11,
              (hash2D('ruins-rubble-z', tileX, tileY + index) - 0.5) * 0.6
            );
            rubble.rotation.y =
              hash2D('ruins-rubble-rot', tileX + index, tileY - index) * Math.PI;
            group.add(rubble);
          }

          return group;
        },
      },
      classifyRuinsTile
    ),
  ]);
}

function getRuinsStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number
): RuinsStyle {
  const style = resolveRuinsStyle(tileX, tileY);
  return style.createMaterials(three);
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
      hash2D('ruins-chip-x', regionX * 31 + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D('ruins-chip-y', regionY * 37 + index, regionX) * canvas.height
    );
    const size =
      1 + Math.floor(hash2D('ruins-chip-size', regionX + index, regionY) * 3);
    context.fillStyle = withAlpha(
      '#f2ede5',
      0.18 + hash2D('ruins-chip-a', regionX, regionY + index) * 0.16
    );
    context.fillRect(x, y, size, 1);
  }

  for (let index = 0; index < 28; index += 1) {
    const x = Math.floor(
      hash2D('ruins-crack-x', regionX + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D('ruins-crack-y', regionY + index, regionX) * canvas.height
    );
    const length =
      3 + Math.floor(hash2D('ruins-crack-l', regionX, regionY + index) * 8);
    context.fillStyle = 'rgba(41, 34, 30, 0.22)';
    context.fillRect(x, y, 1, length);
  }
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

type RuinsStyle = {
  stoneMaterial: ThreeMaterialLike;
  accentMaterial: ThreeMaterialLike;
};

type RuinsStyleBlueprint = {
  createMaterials(three: ThreeHostLike): RuinsStyle;
};
