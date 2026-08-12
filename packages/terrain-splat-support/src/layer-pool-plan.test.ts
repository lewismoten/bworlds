import { describe, expect, it } from 'vitest';
import { planTerrainSplatNeighborhoodLayerPool } from './layer-pool-plan.ts';

describe('terrain splat neighborhood layer pool plan', () => {
  it('selects one shared active layer set from nearby chunk usage summaries', () => {
    const plan = planTerrainSplatNeighborhoodLayerPool({
      maxActiveLayers: 4,
      members: [
        {
          id: 'chunk-a',
          usage: {
            activeLayerIds: ['grass-a', 'soil', 'leaf'],
            activeLayerCounts: {
              'grass-a': 8,
              soil: 3,
              leaf: 2,
            },
            uniqueLayerCombinationCount: 2,
            dominantLayerId: 'grass-a',
            perSampleActiveLayerCount: [1, 2, 3],
            unusedLayerIds: ['rock'],
            warnings: [],
          },
        },
        {
          id: 'chunk-b',
          usage: {
            activeLayerIds: ['grass-a', 'soil', 'sand'],
            activeLayerCounts: {
              'grass-a': 5,
              soil: 4,
              sand: 3,
            },
            uniqueLayerCombinationCount: 2,
            dominantLayerId: 'grass-a',
            perSampleActiveLayerCount: [1, 2, 2],
            unusedLayerIds: ['leaf'],
            warnings: [],
          },
        },
      ],
    });

    expect(plan.activeLayerIds).toEqual(['grass-a', 'soil', 'sand', 'leaf']);
    expect(plan.excludedLayerIds).toEqual([]);
    expect(plan.layerPresenceCounts).toEqual({
      'grass-a': 2,
      leaf: 1,
      sand: 1,
      soil: 2,
    });
    expect(plan.chunkCoverage['chunk-a']).toEqual({
      coveredLayerIds: ['grass-a', 'soil', 'leaf'],
      missingLayerIds: [],
    });
    expect(plan.warnings).toEqual([]);
  });

  it('warns when nearby chunks cannot share one bounded layer pool', () => {
    const plan = planTerrainSplatNeighborhoodLayerPool({
      maxActiveLayers: 3,
      members: [
        {
          id: 'chunk-a',
          usage: {
            activeLayerIds: ['grass-a', 'soil', 'leaf'],
            activeLayerCounts: {
              'grass-a': 8,
              soil: 3,
              leaf: 2,
            },
            uniqueLayerCombinationCount: 2,
            dominantLayerId: 'grass-a',
            perSampleActiveLayerCount: [1, 2, 3],
            unusedLayerIds: ['rock'],
            warnings: [],
          },
        },
        {
          id: 'chunk-b',
          usage: {
            activeLayerIds: ['grass-a', 'sand', 'rock'],
            activeLayerCounts: {
              'grass-a': 5,
              sand: 4,
              rock: 3,
            },
            uniqueLayerCombinationCount: 2,
            dominantLayerId: 'grass-a',
            perSampleActiveLayerCount: [1, 2, 2],
            unusedLayerIds: ['leaf'],
            warnings: [],
          },
        },
      ],
    });

    expect(plan.activeLayerIds).toEqual(['grass-a', 'sand', 'rock']);
    expect(plan.excludedLayerIds).toEqual(['leaf', 'soil']);
    expect(plan.chunkCoverage['chunk-a']).toEqual({
      coveredLayerIds: ['grass-a'],
      missingLayerIds: ['soil', 'leaf'],
    });
    expect(plan.chunkCoverage['chunk-b']).toEqual({
      coveredLayerIds: ['grass-a', 'sand', 'rock'],
      missingLayerIds: [],
    });
    expect(plan.warnings.map((warning) => warning.code)).toEqual([
      'shared-layer-budget-exceeded',
      'chunk-requires-unshared-layers',
    ]);
  });

  it('rejects invalid shared layer budgets', () => {
    expect(() =>
      planTerrainSplatNeighborhoodLayerPool({
        maxActiveLayers: 0,
        members: [],
      })
    ).toThrowError(
      'Terrain splat neighborhood layer pools must use a positive finite maxActiveLayers.'
    );
  });
});
