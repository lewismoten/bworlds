import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/atlas', () => ({
  drawTileSprite() {},
  getTileVariantIndex() {
    return 0;
  },
}));

import { getRiverOverlayConnections, render2D } from './index';

function createState(tileMap: Record<string, string>) {
  return {
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

    expect(getRiverOverlayConnections(state, 0, 0).map(({ id }) => id)).toEqual([
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

    expect(getRiverOverlayConnections(state, 0, 0).map(({ id }) => id)).toEqual([
      'northeast',
      'east',
      'southeast',
      'southwest',
    ]);
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
    } as any;

    const state = {
      player: { x: 0, y: 0 },
      getCurrentTile() {
        return { kind: 'plains' };
      },
    };

    render2D(context, state as any, {
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
    });

    expect(calls.indexOf('overlay')).toBeGreaterThanOrEqual(0);
    expect(calls).not.toContain('star');
  });
});
