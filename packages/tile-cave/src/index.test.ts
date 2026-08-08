import { describe, expect, it } from 'vitest';
import { createCaveTilePlugin } from './index.ts';

const plugin = createCaveTilePlugin();
const caveTile = plugin.tiles?.find((tile) => tile.kind === 'cave');
const classifier = caveTile?.classifyOverworldTile;
const createWorldAction = caveTile?.createWorldAction;

type CaveClassifierPayload = Parameters<NonNullable<typeof classifier>>[0];

function createCaveClassifierPayload(
  overrides: Partial<CaveClassifierPayload> = {}
): CaveClassifierPayload {
  return {
    seed: 'spec',
    x: 5,
    y: 5,
    nearLand: true,
    tile: { kind: 'plains' },
    signals: {
      continent: 0.62,
      elevation: 0.54,
      moisture: 0.44,
      riverSignal: 0.18,
      roadSignal: 0.24,
    },
    sampleTerrainSignals(sampleX: number, sampleY: number) {
      if (
        (sampleY === 5 && sampleX >= 5 && sampleX <= 11) ||
        (sampleY === 4 && sampleX >= 5 && sampleX <= 11)
      ) {
        return {
          continent: 0.64,
          elevation: sampleY === 4 ? 0.82 : 0.58,
          moisture: 0.42,
          riverSignal: 0.12,
          roadSignal: 0.22,
        };
      }
      return {
        continent: 0.62,
        elevation: 0.52,
        moisture: 0.4,
        riverSignal: 0.12,
        roadSignal: 0.2,
      };
    },
    townAnchors: [],
    bridgeAnchors: [],
    poiAnchors: [
      { x: 5, y: 5, type: 'cave', name: 'West Mouth' },
      { x: 11, y: 5, type: 'cave', name: 'East Mouth' },
    ],
    ...overrides,
  };
}

describe('tile cave', () => {
  it('groups nearby cave mouths along the same mountain pass into one cave system', () => {
    const west = classifier?.(
      createCaveClassifierPayload({
        x: 5,
        y: 5,
      })
    );
    const east = classifier?.(
      createCaveClassifierPayload({
        x: 11,
        y: 5,
      })
    );

    expect(west?.poi?.systemId).toBe(east?.poi?.systemId);
    expect(west?.poi?.entrances).toEqual([
      { x: 5, y: 5, name: 'West Mouth' },
      { x: 11, y: 5, name: 'East Mouth' },
    ]);
    expect(east?.poi?.entrances).toEqual(west?.poi?.entrances);
  });

  it('creates shared cave enter actions while preserving each entrance origin', () => {
    const westTile = classifier?.(
      createCaveClassifierPayload({
        x: 5,
        y: 5,
      })
    );
    const eastTile = classifier?.(
      createCaveClassifierPayload({
        x: 11,
        y: 5,
      })
    );

    const westAction = createWorldAction?.({
      seed: 'spec',
      x: 5,
      y: 5,
      tile: westTile!,
    });
    const eastAction = createWorldAction?.({
      seed: 'spec',
      x: 11,
      y: 5,
      tile: eastTile!,
    });
    expect(westAction).toBeDefined();
    expect(eastAction).toBeDefined();
    if (!westAction || !eastAction) {
      throw new Error('expected cave world actions');
    }

    expect(westAction.context?.id).toBe(eastAction.context?.id);
    expect(westAction.context).toEqual(
      expect.objectContaining({
        type: 'cave',
        origin: { x: 5, y: 5 },
        entrances: [
          { x: 5, y: 5, name: 'West Mouth' },
          { x: 11, y: 5, name: 'East Mouth' },
        ],
      })
    );
    expect(eastAction.context).toEqual(
      expect.objectContaining({
        type: 'cave',
        origin: { x: 11, y: 5 },
      })
    );
  });
});
