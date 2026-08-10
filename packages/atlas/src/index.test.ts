import { beforeEach, describe, expect, it, vi } from 'vitest';

const registry = {
  resolveTileDefinition: vi.fn((_kind: string, fallback: unknown) => fallback),
  getTilePlugin: vi.fn(() => null),
  listTileDefinitions: vi.fn(() => [
    [
      'plains',
      {
        name: 'Plains',
        color: '#88aa55',
        miniColor: '#aacc77',
        walkable: true,
        wallHeight: 0,
      },
    ],
    [
      'forest',
      {
        name: 'Forest',
        color: '#336633',
        miniColor: '#447744',
        walkable: true,
        wallHeight: 0,
      },
    ],
  ]),
  paint2DOverlay: vi.fn(),
};

vi.mock('@bworlds/plugin-api', () => ({
  getActivePluginRegistry() {
    return registry;
  },
}));

const fakeCanvasContext = {
  drawImage: vi.fn(),
  fillStyle: '',
  clearRect() {},
  fillRect() {},
  fillText() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  closePath() {},
  textBaseline: 'middle' as CanvasTextBaseline,
  font: '10px sans-serif',
  imageSmoothingEnabled: false,
};

const fakeCanvas = {
  width: 0,
  height: 0,
  getContext() {
    return fakeCanvasContext;
  },
};

(
  globalThis as { document?: { createElement(tag: string): unknown } }
).document = {
  createElement(tag: string) {
    if (tag !== 'canvas') {
      throw new Error(`Unexpected element request: ${tag}`);
    }
    return fakeCanvas;
  },
};

import {
  drawTileSprite,
  getTilePixelSize,
  getTileSpriteRect,
  getTileVariantIndex,
} from './index.ts';

describe('atlas', () => {
  beforeEach(() => {
    fakeCanvasContext.drawImage.mockClear();
    registry.resolveTileDefinition.mockClear();
    registry.getTilePlugin.mockClear();
    registry.paint2DOverlay.mockClear();
    registry.listTileDefinitions.mockClear();
  });

  it('returns deterministic tile variants for the same coordinates', () => {
    expect(getTileVariantIndex('plains', 12, -3)).toBe(
      getTileVariantIndex('plains', 12, -3)
    );
    expect(getTileVariantIndex('plains', 12, -3)).not.toBe(
      getTileVariantIndex('plains', 13, -3)
    );
  });

  it('returns stable sprite rectangles for variant slots', () => {
    expect(getTilePixelSize()).toBe(16);
    expect(getTileSpriteRect('plains', 0)).toEqual({ x: 0, y: 0 });
    expect(getTileSpriteRect('plains', 4)).toEqual({ x: 16, y: 16 });
    expect(getTileSpriteRect('forest', 8)).toEqual({ x: 80, y: 32 });
  });

  it('draws tile sprites and forwards overlay painting with the resolved variant', () => {
    const context = fakeCanvasContext;

    drawTileSprite(context as never, 'plains', 10, 20, 32, {
      worldX: 7,
      worldY: -9,
      timeMs: 1234,
    });

    expect(context.drawImage).toHaveBeenCalledTimes(1);
    expect(registry.paint2DOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        tile: { kind: 'plains' },
        worldX: 7,
        worldY: -9,
        timeMs: 1234,
        variant: getTileVariantIndex('plains', 7, -9),
      })
    );
  });
});
