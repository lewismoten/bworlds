import { getOrCreateWeakMapValue } from '@bworlds/cache-support';
import { hash2D, registerHashLabel } from '@bworlds/core/hash';
import { createSingleTilePlugin } from '@bworlds/plugin-api';
import {
  createThresholdTerrainClassifier,
  withTerrainTileClassifier,
} from '@bworlds/tile-support';
import { createMountainTerrainMaterials } from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Create3DModelContext,
  Paint2DContext,
  RuntimePlugin,
  ThreeHostLike,
  ThreeMaterialLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const styleCache = new WeakMap<ThreeHostLike, MountainStyle>();
const MOUNTAIN_WIDTH_SEED = registerHashLabel('mountain-width');
const MOUNTAIN_DEPTH_SEED = registerHashLabel('mountain-depth');
const MOUNTAIN_UPPER_SEED = registerHashLabel('mountain-upper');
const MOUNTAIN_ROTATION_A_SEED = registerHashLabel('mountain-rot-a');
const MOUNTAIN_ROTATION_B_SEED = registerHashLabel('mountain-rot-b');
const MOUNTAIN_ROTATION_C_SEED = registerHashLabel('mountain-rot-c');
const MOUNTAIN_OFFSET_X_SEED = registerHashLabel('mountain-offset-x');
const MOUNTAIN_OFFSET_Y_SEED = registerHashLabel('mountain-offset-y');
const classifyMountainTile = createThresholdTerrainClassifier({
  kind: 'mountain',
  threshold: 0.72,
  getSignal(context) {
    return context.signals.elevation;
  },
  comparator: 'gt',
  allowedBaseKinds: [
    'plains',
    'forest',
    'road',
    'sign',
    'town',
    'cave',
    'dungeon',
  ],
});

export function createMountainTilePlugin(): RuntimePlugin {
  return createSingleTilePlugin(
    'tile-mountain',
    withTerrainTileClassifier(
      {
        kind: 'mountain',
        definition: {
          name: 'Mountain',
          color: '#6b7280',
          miniColor: '#94a3b8',
          walkable: false,
          wallHeight: 0.95,
        },
        paint2D({ context, x, y, motif, fillRect }: Paint2DContext) {
          const leftPeak = 5 + motif.int(-1, 1);
          const rightPeak = 14 + motif.int(-1, 0);
          context.fillStyle = '#4b5563';
          context.beginPath();
          context.moveTo(x + 1, y + 14);
          context.lineTo(x + leftPeak, y + 4 + motif.int(-1, 1));
          context.lineTo(x + 10, y + 11);
          context.lineTo(x + rightPeak, y + 3 + motif.int(0, 1));
          context.lineTo(x + 15, y + 14);
          context.closePath();
          context.fill();
          fillRect(context, x + leftPeak - 1, y + 5, 2, 2, '#f8fafc');
          fillRect(context, x + rightPeak - 1, y + 4, 2, 2, '#f8fafc');
          return true;
        },
        create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
          const group = new three.Group();
          const style = getMountainStyle(three);
          const peakScale = getMountainPeakScale(state, tileX, tileY);
          const height = 1.4 * peakScale;
          const width = 0.9 + hash2D(MOUNTAIN_WIDTH_SEED, tileX, tileY) * 0.22;
          const depth = 0.9 + hash2D(MOUNTAIN_DEPTH_SEED, tileX, tileY) * 0.22;
          const upperHeight =
            height * (0.5 + hash2D(MOUNTAIN_UPPER_SEED, tileX, tileY) * 0.16);
          const lowerHeight = height - upperHeight * 0.45;

          const base = new three.Mesh(
            new three.ConeGeometry(
              Math.max(width, depth) * 0.72,
              lowerHeight,
              4
            ),
            style.mountainMaterial
          );
          base.position.set(tileX, lowerHeight * 0.5, tileY);
          base.rotation.y =
            hash2D(MOUNTAIN_ROTATION_A_SEED, tileX, tileY) * Math.PI;
          base.scale.z = depth / width;
          group.add(base);

          const upper = new three.Mesh(
            new three.ConeGeometry(
              Math.max(width, depth) * 0.44,
              upperHeight,
              4
            ),
            style.mountainMaterial
          );
          upper.position.set(
            tileX + (hash2D(MOUNTAIN_OFFSET_X_SEED, tileX, tileY) - 0.5) * 0.12,
            lowerHeight * 0.62 + upperHeight * 0.5,
            tileY + (hash2D(MOUNTAIN_OFFSET_Y_SEED, tileX, tileY) - 0.5) * 0.12
          );
          upper.rotation.y =
            hash2D(MOUNTAIN_ROTATION_B_SEED, tileX, tileY) * Math.PI;
          upper.scale.z = depth / width;
          group.add(upper);

          if (peakScale > 1.3) {
            const crown = new three.Mesh(
              new three.ConeGeometry(
                Math.max(width, depth) * 0.26,
                upperHeight * 0.68,
                4
              ),
              style.mountainMaterial
            );
            crown.position.set(
              upper.position.x,
              upper.position.y + upperHeight * 0.42,
              upper.position.z
            );
            crown.rotation.y =
              hash2D(MOUNTAIN_ROTATION_C_SEED, tileX, tileY) * Math.PI;
            crown.scale.z = depth / width;
            group.add(crown);
          }

          if (peakScale > 1.55) {
            const snow = new three.Mesh(
              new three.ConeGeometry(
                Math.max(width, depth) * 0.16,
                upperHeight * 0.3,
                4
              ),
              style.snowMaterial
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
        },
      },
      classifyMountainTile
    )
  );
}

function getMountainPeakScale(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
  let scale = 1;
  let surroundingCount = 0;
  if (state.getCurrentTile(tileX, tileY - 1).kind === 'mountain') {
    surroundingCount += 1;
  }
  if (state.getCurrentTile(tileX + 1, tileY).kind === 'mountain') {
    surroundingCount += 1;
  }
  if (state.getCurrentTile(tileX, tileY + 1).kind === 'mountain') {
    surroundingCount += 1;
  }
  if (state.getCurrentTile(tileX - 1, tileY).kind === 'mountain') {
    surroundingCount += 1;
  }

  if (surroundingCount === 4) {
    scale += 0.55;
    let secondRing = 0;
    if (state.getCurrentTile(tileX, tileY - 2).kind === 'mountain') {
      secondRing += 1;
    }
    if (state.getCurrentTile(tileX + 2, tileY).kind === 'mountain') {
      secondRing += 1;
    }
    if (state.getCurrentTile(tileX, tileY + 2).kind === 'mountain') {
      secondRing += 1;
    }
    if (state.getCurrentTile(tileX - 2, tileY).kind === 'mountain') {
      secondRing += 1;
    }
    scale += secondRing * 0.1;
  } else {
    scale += surroundingCount * 0.12;
  }

  return Math.min(2, scale);
}

function getMountainStyle(three: ThreeHostLike): MountainStyle {
  return getOrCreateWeakMapValue(styleCache, three, () => {
    const terrainMaterials = createMountainTerrainMaterials(three);
    return {
      mountainMaterial: terrainMaterials.mountainMaterial,
      snowMaterial: terrainMaterials.snowMaterial,
    };
  });
}

interface MountainStyle {
  mountainMaterial: ThreeMaterialLike;
  snowMaterial: ThreeMaterialLike;
}
