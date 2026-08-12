import { describe, expect, it } from 'vitest';
import {
  createOverworldReliefRuntimePlugin,
  decorateOverworldRelief,
  resolveOverworldContinentUpliftHeight,
  resolveOverworldMountainDetailHeight,
  resolveOverworldReliefHeightFromSignals,
  resolveOverworldReliefHeight,
  resolveOverworldRiverCarvingHeight,
  resolveOverworldRouteGradingHeight,
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

  it('splits relief into uplift, mountain detail, and river carving components', () => {
    const tile = { kind: 'plains' as const };
    const elevation = 0.68;
    const riverSignal = 0.83;
    const roadSignal = 0.2;

    const uplift = resolveOverworldContinentUpliftHeight(elevation, tile);
    const mountainDetail = resolveOverworldMountainDetailHeight(
      elevation,
      tile
    );
    const riverCarving = resolveOverworldRiverCarvingHeight(riverSignal, tile);
    const routeGrading = resolveOverworldRouteGradingHeight(roadSignal, tile);

    expect(uplift).toBeGreaterThan(0);
    expect(mountainDetail).toBeGreaterThan(0);
    expect(riverCarving).toBeLessThanOrEqual(0);
    expect(routeGrading).toBe(0);
    expect(
      resolveOverworldReliefHeightFromSignals(
        {
          elevation,
          riverSignal,
          roadSignal,
        },
        tile
      )
    ).toBeCloseTo(uplift + mountainDetail + riverCarving + routeGrading);
  });

  it('only applies route grading to road tiles with strong road signals', () => {
    expect(
      resolveOverworldRouteGradingHeight(0.92, {
        kind: 'road',
      })
    ).toBeLessThan(0);
    expect(
      resolveOverworldRouteGradingHeight(0.92, {
        kind: 'plains',
      })
    ).toBe(0);
  });

  it('keeps legacy elevation-only relief compatibility without river carving', () => {
    const tile = { kind: 'forest' as const };
    const elevation = 0.64;

    expect(resolveOverworldReliefHeight(elevation, tile)).toBeCloseTo(
      resolveOverworldContinentUpliftHeight(elevation, tile) +
        resolveOverworldMountainDetailHeight(elevation, tile)
    );
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
