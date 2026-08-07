import { describe, expect, it } from 'vitest';
import {
  composeOverworldTileFromPlugins,
  createOverworldGenerationContext,
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
