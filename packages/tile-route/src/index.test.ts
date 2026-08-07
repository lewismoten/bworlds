import { describe, expect, it } from 'vitest';
import { createRouteTilePlugin } from './index.ts';

describe('tile route', () => {
  it('does not overwrite point-of-interest or sign tiles with roads', () => {
    const plugin = createRouteTilePlugin();
    const classifier = plugin.tiles?.find(
      (tile) => tile.kind === 'road'
    )?.classifyOverworldTile;

    expect(
      classifier?.({
        seed: 'spec',
        x: 5,
        y: 0,
        tile: { kind: 'sign' },
        nearLand: true,
        signals: {
          continent: 0.6,
          elevation: 0.4,
          moisture: 0.4,
          riverSignal: 0.2,
          roadSignal: 0.95,
        },
        sampleTerrainSignals() {
          return {
            continent: 0.6,
            elevation: 0.4,
            moisture: 0.4,
            riverSignal: 0.2,
            roadSignal: 0.95,
          };
        },
        townAnchors: [{ x: 0, y: 0, name: 'Oakcross' }],
        bridgeAnchors: [],
        poiAnchors: [],
      } as any)
    ).toBeNull();

    expect(
      classifier?.({
        seed: 'spec',
        x: 0,
        y: 0,
        tile: { kind: 'cave' },
        nearLand: true,
        signals: {
          continent: 0.6,
          elevation: 0.4,
          moisture: 0.4,
          riverSignal: 0.2,
          roadSignal: 0.95,
        },
        sampleTerrainSignals() {
          return {
            continent: 0.6,
            elevation: 0.4,
            moisture: 0.4,
            riverSignal: 0.2,
            roadSignal: 0.95,
          };
        },
        townAnchors: [{ x: 0, y: 0, name: 'Oakcross' }],
        bridgeAnchors: [],
        poiAnchors: [],
      } as any)
    ).toBeNull();
  });
});
