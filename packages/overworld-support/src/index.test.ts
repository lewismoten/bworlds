import { describe, expect, it } from 'vitest';
import {
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
});
