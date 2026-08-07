import { hash2D } from '@bworlds/core';
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
  ThreeHostLike,
  ThreeMaterialLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const styleCache = new Map<string, MountainStyle>();
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

export function createMountainTilePlugin() {
  return createSingleTilePlugin(
    'tile-mountain',
    withTerrainTileClassifier({
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
        const width = 0.9 + hash2D('mountain-width', tileX, tileY) * 0.22;
        const depth = 0.9 + hash2D('mountain-depth', tileX, tileY) * 0.22;
        const upperHeight =
          height * (0.5 + hash2D('mountain-upper', tileX, tileY) * 0.16);
        const lowerHeight = height - upperHeight * 0.45;

        const base = new three.Mesh(
          new three.ConeGeometry(Math.max(width, depth) * 0.72, lowerHeight, 4),
          style.mountainMaterial
        );
        base.position.set(tileX, lowerHeight * 0.5, tileY);
        base.rotation.y = hash2D('mountain-rot-a', tileX, tileY) * Math.PI;
        base.scale.z = depth / width;
        group.add(base);

        const upper = new three.Mesh(
          new three.ConeGeometry(Math.max(width, depth) * 0.44, upperHeight, 4),
          style.mountainMaterial
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
          crown.rotation.y = hash2D('mountain-rot-c', tileX, tileY) * Math.PI;
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
    }, classifyMountainTile)
  );
}

function getMountainPeakScale(
  state: WorldStateLike,
  tileX: number,
  tileY: number
) {
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

function getMountainStyle(three: ThreeHostLike) {
  if (!styleCache.has('default')) {
    const terrainMaterials = createMountainTerrainMaterials(three);
    styleCache.set('default', {
      mountainMaterial: terrainMaterials.mountainMaterial,
      snowMaterial: terrainMaterials.snowMaterial,
    });
  }

  return styleCache.get('default')!;
}

interface MountainStyle {
  mountainMaterial: ThreeMaterialLike;
  snowMaterial: ThreeMaterialLike;
}
