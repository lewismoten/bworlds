import { describe, expect, it } from 'vitest';
import {
  createOverworldReliefRuntimePlugin,
  decorateOverworldRelief,
  resolveOverworldReliefHeight,
} from './index.ts';

const plugin = createOverworldReliefRuntimePlugin();

describe('runtime overworld relief', () => {
  it('decorates land tiles with gentle hill surface heights', () => {
    const tile: { kind: string; surfaceHeight?: number } = { kind: 'plains' };

    decorateOverworldRelief({
      tile,
      signals: {
        continent: 0.6,
        elevation: 0.62,
        moisture: 0.48,
        riverSignal: 0.18,
        roadSignal: 0.24,
      },
    });

    expect(tile.surfaceHeight).toBeGreaterThan(0.15);
    expect(tile.surfaceHeight).toBeLessThanOrEqual(0.36);
  });

  it('keeps rivers and mountains on explicit profiles instead of decorating relief', () => {
    expect(resolveOverworldReliefHeight(0.7, { kind: 'river' })).toBe(0);
    expect(resolveOverworldReliefHeight(0.7, { kind: 'mountain' })).toBe(0);
    expect(resolveOverworldReliefHeight(0.7, { kind: 'rail' })).toBe(0);
  });

  it('stays deterministic through the runtime plugin hook', () => {
    const tile: { kind: string; surfaceHeight?: number } = { kind: 'forest' };
    const payload = {
      tile,
      signals: {
        continent: 0.58,
        elevation: 0.51,
        moisture: 0.68,
        riverSignal: 0.16,
        roadSignal: 0.14,
      },
      seed: 'spec',
      x: 4,
      y: -7,
    };

    plugin.decorateOverworldTile?.(payload);
    const firstHeight = tile.surfaceHeight;
    plugin.decorateOverworldTile?.(payload);

    expect(tile.surfaceHeight).toBe(firstHeight);
  });
});
