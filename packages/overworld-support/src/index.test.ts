import { describe, expect, it } from 'vitest';
import {
  collectNearbyOverworldPoiAnchors,
  composeOverworldTileFromPlugins,
  createCachedOverworldTileResolver,
  createOverworldAnchorResolver,
  createOverworldGenerationContext,
  createGeneratedNamedOverworldCellAnchorSpec,
  createGeneratedPoiOverworldCellAnchorSpec,
  getOverworldPlacementChance,
  createOverworldTerrainSignalSampler,
  isNearOverworldLand,
} from './index.ts';

describe('overworld support', () => {
  it('creates deterministic terrain signal samplers from a seed', () => {
    const sampleA = createOverworldTerrainSignalSampler('spec-seed');
    const sampleB = createOverworldTerrainSignalSampler('spec-seed');

    expect(sampleA(12, -9)).toEqual(sampleB(12, -9));
    expect(sampleA(12, -9)).not.toEqual(sampleA(13, -9));
  });

  it('creates cached overworld tile resolvers for curated runtime overlays', () => {
    let calls = 0;
    const resolveTile = createCachedOverworldTileResolver(({ seed, x, y }) => {
      calls += 1;
      return {
        kind: 'plains',
        note: `${seed}:${x}:${y}`,
      };
    });

    const first = resolveTile({ seed: 'spec', x: 2, y: 3 });
    const second = resolveTile({ seed: 'spec', x: 2, y: 3 });
    const third = resolveTile({ seed: 'spec', x: 2, y: 4 });

    expect(first).toEqual(second);
    expect(third).toEqual(
      expect.objectContaining({
        note: 'spec:2:4',
      })
    );
    expect(calls).toBe(2);
  });

  it('exposes the shared near-land heuristic', () => {
    expect(
      isNearOverworldLand({
        continent: 0.6,
        elevation: 0.3,
        moisture: 0.4,
        riverSignal: 0.2,
        roadSignal: 0.5,
      })
    ).toBe(true);
    expect(
      isNearOverworldLand({
        continent: 0.2,
        elevation: 0.3,
        moisture: 0.4,
        riverSignal: 0.2,
        roadSignal: 0.5,
      })
    ).toBe(false);
  });

  it('builds reusable overworld generation contexts from shared samplers and plugins', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const context = createOverworldGenerationContext({
      seed: 'spec-seed',
      x: 8,
      y: -3,
      tile: { kind: 'plains' },
      sampleTerrainSignals,
      plugins: {
        resolveOverworldAnchors() {
          return {
            townAnchors: [{ x: 10, y: -2, name: 'Spec Town' }],
            bridgeAnchors: [{ x: 6, y: -4 }],
          };
        },
      } as any,
    });

    expect(context.tile.kind).toBe('plains');
    expect(context.signals).toEqual(sampleTerrainSignals(8, -3));
    expect(context.townAnchors[0]).toEqual(
      expect.objectContaining({ name: 'Spec Town' })
    );
    expect(typeof context.townChance).toBe('number');
    expect(typeof context.signChance).toBe('number');
    expect(context.placementChances?.town).toBe(
      getOverworldPlacementChance('spec-seed', 'town', 8, -3)
    );
    expect(context.getPlacementChance?.('ruins')).toBe(
      getOverworldPlacementChance('spec-seed', 'ruins', 8, -3)
    );
  });

  it('creates generated named overworld anchor specs with deterministic names', () => {
    const spec = createGeneratedNamedOverworldCellAnchorSpec({
      id: 'town',
      nameType: 'town',
      cellSize: 20,
      chanceKey: 'town-anchor',
      offsetXKey: 'town-anchor-x',
      offsetYKey: 'town-anchor-y',
      threshold: 0.5,
      isSuitableTerrain() {
        return true;
      },
    });

    const anchor = spec.createAnchor({
      seed: 'spec-seed',
      x: 12,
      y: -4,
      chance: 0.9,
      cellX: 0,
      cellY: 0,
    });

    expect(anchor).toEqual(
      expect.objectContaining({
        x: 12,
        y: -4,
        name: expect.any(String),
      })
    );
  });

  it('collects nearby poi anchors from shared grouped specs and caches', () => {
    const sampleTerrainSignals = () => ({
      continent: 0.6,
      elevation: 0.4,
      moisture: 0.4,
      riverSignal: 0.2,
      roadSignal: 0.3,
    });
    const specs = {
      cave: createGeneratedPoiOverworldCellAnchorSpec({
        id: 'cave',
        poiType: 'cave',
        cellSize: 18,
        chanceKey: 'cave-anchor',
        offsetXKey: 'cave-anchor-x',
        offsetYKey: 'cave-anchor-y',
        threshold: 0.1,
        isSuitableTerrain() {
          return true;
        },
      }),
      dungeon: createGeneratedPoiOverworldCellAnchorSpec({
        id: 'dungeon',
        poiType: 'dungeon',
        cellSize: 22,
        chanceKey: 'dungeon-anchor',
        offsetXKey: 'dungeon-anchor-x',
        offsetYKey: 'dungeon-anchor-y',
        threshold: 0.1,
        isSuitableTerrain() {
          return true;
        },
      }),
    } as const;

    const anchors = collectNearbyOverworldPoiAnchors({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      specs,
      caches: {
        cave: new Map(),
        dungeon: new Map(),
      },
      sampleTerrainSignals,
      minSpacing: 0,
      blockingAnchors: [],
      baseAnchors: [],
    });

    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.some((anchor) => anchor.type === 'cave')).toBe(true);
    expect(anchors.some((anchor) => anchor.type === 'dungeon')).toBe(true);
  });

  it('creates reusable grouped overworld anchor resolvers with internal caches', () => {
    const sampleTerrainSignals = () => ({
      continent: 0.6,
      elevation: 0.4,
      moisture: 0.4,
      riverSignal: 0.2,
      roadSignal: 0.3,
    });
    const resolver = createOverworldAnchorResolver({
      town: {
        spec: createGeneratedNamedOverworldCellAnchorSpec({
          id: 'town',
          nameType: 'town',
          cellSize: 20,
          chanceKey: 'town-anchor',
          offsetXKey: 'town-anchor-x',
          offsetYKey: 'town-anchor-y',
          threshold: 0.1,
          isSuitableTerrain() {
            return true;
          },
        }),
      },
      poi: {
        specs: {
          cave: createGeneratedPoiOverworldCellAnchorSpec({
            id: 'cave',
            poiType: 'cave',
            cellSize: 18,
            chanceKey: 'cave-anchor',
            offsetXKey: 'cave-anchor-x',
            offsetYKey: 'cave-anchor-y',
            threshold: 0.1,
            isSuitableTerrain() {
              return true;
            },
          }),
        },
        minSpacing: 0,
        baseAnchors({ townAnchors }) {
          return townAnchors.map((anchor) => ({
            ...anchor,
            type: 'town',
          }));
        },
      },
    });

    const first = resolver({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals,
    } as any);
    const second = resolver({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals,
    } as any);

    expect(first).toEqual(second);
    expect(first.townAnchors.length).toBeGreaterThan(0);
    expect(first.poiAnchors.some((anchor) => anchor.type === 'town')).toBe(true);
    expect(first.poiAnchors.some((anchor) => anchor.type === 'cave')).toBe(true);
  });

  it('composes overworld tiles through the shared plugin pipeline', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const calls: string[] = [];
    const tile = composeOverworldTileFromPlugins({
      seed: 'spec-seed',
      x: 4,
      y: 7,
      sampleTerrainSignals,
      plugins: {
        resolveOverworldTile() {
          calls.push('resolve');
          return null;
        },
        resolveOverworldAnchors() {
          calls.push('anchors');
          return {
            townAnchors: [],
            bridgeAnchors: [],
            poiAnchors: [],
          };
        },
        classifyTerrainTile(context) {
          calls.push(`terrain:${context.tile.kind}`);
          return { kind: 'river' };
        },
        classifyOverworldTile(context) {
          calls.push(`overworld:${context.tile.kind}`);
          return { kind: 'bridge' };
        },
        decorateOverworldTile(context) {
          calls.push(`decorate:${context.tile.kind}`);
          context.tile.note = 'decorated';
          return context.tile;
        },
      } as any,
    });

    expect(tile).toEqual({
      kind: 'bridge',
      note: 'decorated',
    });
    expect(calls).toEqual([
      'resolve',
      'anchors',
      'terrain:plains',
      'overworld:river',
      'decorate:bridge',
    ]);
  });

  it('uses the plugin-owned default tile kind as the initial overworld tile', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const tile = composeOverworldTileFromPlugins({
      seed: 'spec-seed',
      x: 4,
      y: 7,
      sampleTerrainSignals,
      plugins: {
        getDefaultTileKind() {
          return 'ashlands';
        },
        resolveOverworldTile() {
          return null;
        },
        resolveOverworldAnchors() {
          return {
            townAnchors: [],
            bridgeAnchors: [],
            poiAnchors: [],
          };
        },
        classifyTerrainTile(context) {
          return { kind: context.tile.kind };
        },
        classifyOverworldTile() {
          return null;
        },
        decorateOverworldTile(context) {
          return context.tile;
        },
      } as any,
    });

    expect(tile).toEqual({ kind: 'ashlands' });
  });

  it('short-circuits the plugin pipeline when a curated tile is resolved', () => {
    const sampleTerrainSignals = createOverworldTerrainSignalSampler('spec-seed');
    const tile = composeOverworldTileFromPlugins({
      seed: 'spec-seed',
      x: 0,
      y: 0,
      sampleTerrainSignals,
      plugins: {
        resolveOverworldTile() {
          return { kind: 'town', note: 'curated' };
        },
        resolveOverworldAnchors() {
          throw new Error('should not resolve anchors');
        },
        classifyTerrainTile() {
          throw new Error('should not classify terrain');
        },
        classifyOverworldTile() {
          throw new Error('should not classify overworld');
        },
        decorateOverworldTile() {
          throw new Error('should not decorate');
        },
      } as any,
    });

    expect(tile).toEqual({
      kind: 'town',
      note: 'curated',
    });
  });
});
