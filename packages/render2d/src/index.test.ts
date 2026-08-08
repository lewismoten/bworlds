import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS } from '@bworlds/core';

vi.mock('@bworlds/atlas', () => ({
  drawTileSprite() {},
  getTileVariantIndex() {
    return 0;
  },
}));

import {
  buildTextViewportGrid,
  createViewportTileSampler,
  getTextViewportGlyph,
  getTileReliefStrength,
  getViewportTileSize,
  getRiverOverlayConnections,
  render2D,
} from './index';
import type { Render2DViewport } from './index';
import type { TileLike } from '@bworlds/plugin-api';

type Render2DState = Parameters<typeof createViewportTileSampler>[0];
type Render2DContext = Parameters<typeof render2D>[0];

function createState(tileMap: Record<string, TileLike['kind']>): Render2DState {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentTile(x: number, y: number) {
      return {
        kind: tileMap[`${x}:${y}`] ?? 'plains',
      };
    },
  };
}

describe('getRiverOverlayConnections', () => {
  it('includes river, bridge, and ocean neighbors as connected flow', () => {
    const state = createState({
      '0:-1': 'river',
      '1:0': 'bridge',
      '0:1': 'ocean',
      '-1:0': 'plains',
    });
    const tileAt = createViewportTileSampler(state);

    expect(getRiverOverlayConnections(tileAt, 0, 0).map(({ id }) => id)).toEqual([
      'north',
      'east',
      'south',
    ]);
  });

  it('sorts diagonal and cardinal neighbors by angle for stable curve pairing', () => {
    const state = createState({
      '1:-1': 'river',
      '1:0': 'river',
      '1:1': 'river',
      '-1:1': 'river',
    });
    const tileAt = createViewportTileSampler(state);

    expect(getRiverOverlayConnections(tileAt, 0, 0).map(({ id }) => id)).toEqual([
      'northeast',
      'east',
      'southeast',
      'southwest',
    ]);
  });

  it('reuses cached tile samples across repeated river connection checks', () => {
    const getCurrentTile = vi.fn((x: number, y: number) => ({
      kind:
        x === 0 && y === -1
          ? 'river'
          : x === 1 && y === 0
            ? 'bridge'
            : x === 0 && y === 1
              ? 'ocean'
              : 'plains',
    }));
    const tileAt = createViewportTileSampler({
      player: { x: 0, y: 0, facing: 0 },
      getCurrentTile,
    });

    expect(getRiverOverlayConnections(tileAt, 0, 0)).toHaveLength(3);
    expect(getRiverOverlayConnections(tileAt, 0, 0)).toHaveLength(3);
    expect(getCurrentTile).toHaveBeenCalledTimes(8);
  });
});

describe('render2D night sky overlay', () => {
  it('scales tile size with viewport zoom', () => {
    expect(getViewportTileSize({ width: 220, height: 220, zoom: 1 })).toBe(14);
    expect(getViewportTileSize({ width: 440, height: 440, zoom: 1 })).toBe(20);
    expect(getViewportTileSize({ width: 440, height: 440, zoom: 1.5 })).toBe(30);
  });

  it('applies night shading without painting sky stars over the 2d map', () => {
    const calls: string[] = [];
    const context = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      imageSmoothingEnabled: false,
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      clearRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
      arc() {},
      bezierCurveTo() {},
      createLinearGradient() {
        return { addColorStop() {} };
      },
      fillRect(_x: number, _y: number, width: number, height: number) {
        if (width === 100 && height === 100) {
          calls.push('overlay');
          return;
        }
        calls.push('tile');
      },
    } as unknown as Render2DContext;

    const state = createState({});
    const viewport: Render2DViewport = {
      width: 100,
      height: 100,
      rotation: 0,
      timeMs: 0,
      environment: {
        cycle: {
          dayLengthMs: DEFAULT_DAY_LENGTH_MS,
          offsetMs: 0,
        },
        stars: {
          density: 1,
        },
      },
    };

    render2D(context, state, viewport);

    expect(calls.indexOf('overlay')).toBeGreaterThanOrEqual(0);
    expect(calls).not.toContain('star');
  });

  it('builds an ascii text viewport grid with a centered player marker', () => {
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentTile(x: number, y: number) {
        if (x === 1 && y === 0) {
          return { kind: 'river' };
        }
        return { kind: 'plains' };
      },
      getTileDefinition(kind: string) {
        if (kind === 'river') {
          return {
            name: 'River',
            color: '#38bdf8',
            miniColor: '#38bdf8',
            walkable: true,
            wallHeight: 0,
          };
        }
        return {
          name: 'Plains',
          color: '#84cc16',
          miniColor: '#84cc16',
          walkable: true,
          wallHeight: 0,
        };
      },
    };

    const grid = buildTextViewportGrid(state, {
      columns: 5,
      rows: 3,
    });

    expect(grid.rows).toHaveLength(3);
    expect(grid.rows[1][2]).toEqual(
      expect.objectContaining({
        glyph: '@',
        color: '#ffbf69',
        worldX: 0,
        worldY: 0,
      })
    );
    expect(grid.rows[1][3]).toEqual(
      expect.objectContaining({
        glyph: '~',
        color: '#38bdf8',
        worldX: 1,
        worldY: 0,
      })
    );
  });

  it('uses tuned ascii glyphs with a name fallback for unmapped kinds', () => {
    expect(getTextViewportGlyph('mountain', 'Mountain')).toBe('^');
    expect(getTextViewportGlyph('custom-obelisk', 'obelisk')).toBe('O');
    expect(getTextViewportGlyph('', '')).toBe('?');
  });

  it('derives visible relief strength from decorated hill surface heights', () => {
    expect(getTileReliefStrength({ kind: 'plains', surfaceHeight: 0.18 })).toBeCloseTo(
      0.5,
      1
    );
    expect(getTileReliefStrength({ kind: 'mountain', surfaceHeight: 0.3 })).toBe(0);
    expect(getTileReliefStrength({ kind: 'plains' })).toBe(0);
  });
});
