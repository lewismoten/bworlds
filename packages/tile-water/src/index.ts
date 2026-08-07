import { octaveNoise2D } from '@bworlds/core';
import { paintPlainsBackdrop } from '@bworlds/paint-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import { createThresholdTerrainClassifier } from '@bworlds/tile-support';
import type {
  ClassifyOverworldTileContext,
  DecorateOverworldTileContext,
  Paint2DContext,
  SurfaceProfile3D,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const classifyOceanTile = createThresholdTerrainClassifier({
  kind: 'ocean',
  threshold: 0.38,
  comparator: 'lt',
  getSignal(context) {
    return context.signals.continent;
  },
});
const classifyRiverTile = createThresholdTerrainClassifier({
  kind: 'river',
  threshold: 0.82,
  getSignal(context) {
    return context.signals.riverSignal;
  },
  createTile(context) {
    if (context.signals.elevation >= 0.68) {
      return null;
    }
    return { kind: 'river' };
  },
});

export function createWaterTilePlugin() {
  return createTilePlugin(
    'tile-water',
    [
      {
        kind: 'ocean',
        definition: {
          name: 'Ocean',
          color: '#2563eb',
          miniColor: '#4ea3ff',
          walkable: false,
          wallHeight: 0.1,
        },
        classifyTerrainTile(context: ClassifyOverworldTileContext) {
          return classifyOceanTile(context);
        },
        getSurfaceProfile3D(): SurfaceProfile3D {
          return {
            surfaceHeight: -0.12,
            boundaryRole: 'sea',
            chamferEligible: false,
          };
        },
        paint2D({
          context,
          x,
          y,
          definition,
          motif,
          fillRect,
        }: Paint2DContext) {
          const waveOffset = motif.int(0, 2);
          for (let row = waveOffset; row < TILE_PIXEL_SIZE; row += 3) {
            fillRect(
              context,
              x,
              y + row,
              TILE_PIXEL_SIZE,
              1,
              definition.miniColor
            );
          }
          fillRect(context, x + motif.int(1, 3), y + 3, 4, 1, '#d9f4ff');
          fillRect(context, x + motif.int(8, 10), y + 9, 5, 1, '#d9f4ff');
          return true;
        },
      },
      {
        kind: 'shore',
        definition: {
          name: 'Shore',
          color: '#f4d58d',
          miniColor: '#f8e9b5',
          walkable: true,
          wallHeight: 0,
        },
        getSurfaceProfile3D(): SurfaceProfile3D {
          return {
            surfaceHeight: 0,
            chamferEligible: true,
          };
        },
        paint2D({
          context,
          x,
          y,
          definition,
          motif,
          fillRect,
          speckle,
        }: Paint2DContext) {
          speckle(context, x, y, '#fff1c8', 28, 0.35, motif);
          const tideHeight = 10 + motif.int(0, 2);
          fillRect(
            context,
            x,
            y + tideHeight,
            TILE_PIXEL_SIZE,
            2,
            definition.miniColor
          );
          fillRect(
            context,
            x,
            y + tideHeight + 2,
            TILE_PIXEL_SIZE,
            1,
            '#d9f4ff'
          );
          return true;
        },
      },
      {
        kind: 'river',
        definition: {
          name: 'River',
          color: '#38bdf8',
          miniColor: '#7dd3fc',
          walkable: false,
          wallHeight: 0.05,
        },
        classifyTerrainTile(context: ClassifyOverworldTileContext) {
          return classifyRiverTile(context);
        },
        getSurfaceProfile3D(): SurfaceProfile3D {
          return {
            surfaceHeight: -0.12,
            boundaryRole: 'channel',
            chamferEligible: false,
          };
        },
        paint2D({
          context,
          x,
          y,
          definition,
          motif,
          fillRect,
        }: Paint2DContext) {
          paintPlainsBackdrop({ context, x, y, motif, fillRect });
          const channel = 4 + motif.int(-1, 1);
          context.fillStyle = definition.color;
          context.beginPath();
          context.moveTo(x + channel, y);
          context.lineTo(x + channel + 5, y);
          context.lineTo(x + channel + 8, y + TILE_PIXEL_SIZE);
          context.lineTo(x + channel + 3, y + TILE_PIXEL_SIZE);
          context.closePath();
          context.fill();
          fillRect(context, x + channel + 3, y + 2, 1, 12, '#d9f4ff');
          return true;
        },
      },
    ],
    {
      decorateOverworldTile({ seed, x, y, tile }: DecorateOverworldTileContext) {
        const neighboringSeaSignal = Math.min(
          octaveNoise2D(`${seed}:continent`, (x + 1) / 160, y / 160, {
            octaves: 5,
            persistence: 0.55,
          }),
          octaveNoise2D(`${seed}:continent`, (x - 1) / 160, y / 160, {
            octaves: 5,
            persistence: 0.55,
          }),
          octaveNoise2D(`${seed}:continent`, x / 160, (y + 1) / 160, {
            octaves: 5,
            persistence: 0.55,
          }),
          octaveNoise2D(`${seed}:continent`, x / 160, (y - 1) / 160, {
            octaves: 5,
            persistence: 0.55,
          })
        );

        if (
          tile.kind !== 'ocean' &&
          tile.kind !== 'river' &&
          tile.kind !== 'bridge' &&
          tile.kind !== 'mountain' &&
          neighboringSeaSignal < 0.4
        ) {
          tile.kind = 'shore';
          tile.note = tile.note ?? 'The terrain softens into a coastal edge.';
        }
      },
    }
  );
}
