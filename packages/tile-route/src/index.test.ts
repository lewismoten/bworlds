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

  it('resolves the 3D road floor kind from dominant neighboring terrain', () => {
    const plugin = createRouteTilePlugin();
    const resolver = plugin.tiles?.find(
      (tile) => tile.kind === 'road'
    )?.resolveFloorKind3D;

    expect(
      resolver?.({
        tile: { kind: 'road' },
        tileX: 0,
        tileY: 0,
        state: {
          getCurrentContext() {
            return { id: 'overworld', depth: 0, type: 'overworld' };
          },
          getCurrentTile(x: number, y: number) {
            const key = `${x}:${y}`;
            const kinds: Record<string, string> = {
              '-1:-1': 'plains',
              '0:-1': 'plains',
              '1:-1': 'forest',
              '-1:0': 'plains',
              '1:0': 'road',
              '-1:1': 'forest',
              '0:1': 'plains',
              '1:1': 'river',
            };
            return { kind: kinds[key] ?? 'road' };
          },
        } as any,
      })
    ).toBe('plains');
  });
});
