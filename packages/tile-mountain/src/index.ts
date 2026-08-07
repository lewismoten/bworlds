import { hash2D } from '@bworlds/core';
import { createTilePlugin } from '@bworlds/plugin-api';
import { createThresholdTerrainClassifier } from '@bworlds/tile-support';
import { createCanvasTexture } from '@bworlds/three-support';
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
  allowedBaseKinds: ['plains', 'forest', 'road', 'sign', 'town', 'cave', 'dungeon'],
});

export function createMountainTilePlugin() {
  return createTilePlugin('tile-mountain', [
      {
        kind: 'mountain',
        definition: {
          name: 'Mountain',
          color: '#6b7280',
          miniColor: '#94a3b8',
          walkable: false,
          wallHeight: 0.95,
        },
        classifyTerrainTile(context: ClassifyOverworldTileContext) {
          return classifyMountainTile(context);
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
            new three.ConeGeometry(
              Math.max(width, depth) * 0.72,
              lowerHeight,
              4
            ),
            style.mountainMaterial
          );
          base.position.set(tileX, lowerHeight * 0.5, tileY);
          base.rotation.y = hash2D('mountain-rot-a', tileX, tileY) * Math.PI;
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
      },
    ]);
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
    const texture = createMountainTexture(three);
    styleCache.set('default', {
      mountainMaterial: new three.MeshStandardMaterial({
        color: '#dbe4ea',
        map: texture,
        roughness: 0.96,
        metalness: 0.02,
        flatShading: true,
      }),
      snowMaterial: new three.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.88,
        metalness: 0.02,
        flatShading: true,
      }),
    });
  }

  return styleCache.get('default')!;
}

function createMountainTexture(three: ThreeHostLike) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;

  context.fillStyle = '#6b7280';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < canvas.height; row += 4) {
    const shade = 90 + ((row * 7) % 55);
    context.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 12})`;
    context.fillRect(0, row, canvas.width, 2);
  }

  for (let index = 0; index < 180; index += 1) {
    const x = Math.floor(hash2D('mountain-texture-x', index, 0) * canvas.width);
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
    const y = Math.floor(hash2D('mountain-crack-y', index, 0) * canvas.height);
    const depth = 1 + Math.floor(hash2D('mountain-crack-l', index, 0) * 4);
    context.fillStyle = 'rgba(39, 48, 58, 0.32)';
    context.fillRect(x, y, 1, depth);
  }

  return createCanvasTexture(three, canvas, { repeatX: 1.4, repeatY: 1.4 });
}

interface MountainStyle {
  mountainMaterial: ThreeMaterialLike;
  snowMaterial: ThreeMaterialLike;
}
