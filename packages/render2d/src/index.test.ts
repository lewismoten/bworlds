import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/atlas', () => ({
  drawTileSprite() {},
  getTileVariantIndex() {
    return 0;
  },
}));

import {
  createViewportTileSampler,
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
          dayLengthMs: 240000,
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
});
