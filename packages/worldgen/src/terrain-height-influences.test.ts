import { describe, expect, it } from 'vitest';
import {
  createWorldTerrainHeightInfluencePlugin,
  sampleWorldTerrainHeightInfluences,
  sortWorldTerrainHeightInfluencePlugins,
} from './terrain-height-influences.ts';

describe('terrain height influence plugins', () => {
  it('creates normalized height influence plugins with sampling declarations', () => {
    const plugin = createWorldTerrainHeightInfluencePlugin({
      id: ' river-carving ',
      order: {
        priority: 30,
        after: ['mountain-detail', 'mountain-detail'],
      },
      sampling: {
        resolutions: ['fine', 'fine'],
        bounds: {
          minX: -8,
          maxX: 8,
          minY: -4,
          maxY: 4,
        },
        sampleStep: 0.25,
      },
      sample() {
        return {
          amount: -0.2,
          reason: 'carves a shallow river channel',
        };
      },
    });

    expect(plugin.id).toBe('river-carving');
    expect(plugin.order).toEqual({
      priority: 30,
      after: ['mountain-detail'],
      before: undefined,
    });
    expect(plugin.sampling).toEqual({
      resolutions: ['fine'],
      bounds: {
        minX: -8,
        maxX: 8,
        minY: -4,
        maxY: 4,
      },
      sampleStep: 0.25,
    });
  });

  it('sorts height influences by priority and declared dependencies', () => {
    const ordered = sortWorldTerrainHeightInfluencePlugins([
      createWorldTerrainHeightInfluencePlugin({
        id: 'route-grading',
        order: {
          priority: 40,
          after: ['river-carving'],
        },
        sample() {
          return 0.05;
        },
      }),
      createWorldTerrainHeightInfluencePlugin({
        id: 'continent-uplift',
        order: {
          priority: 10,
        },
        sample() {
          return 0.8;
        },
      }),
      createWorldTerrainHeightInfluencePlugin({
        id: 'mountain-detail',
        order: {
          priority: 20,
          after: ['continent-uplift'],
        },
        sample() {
          return 0.3;
        },
      }),
      createWorldTerrainHeightInfluencePlugin({
        id: 'river-carving',
        order: {
          priority: 30,
          after: ['mountain-detail'],
        },
        sample() {
          return -0.15;
        },
      }),
    ]);

    expect(ordered.map((plugin) => plugin.id)).toEqual([
      'continent-uplift',
      'mountain-detail',
      'river-carving',
      'route-grading',
    ]);
  });

  it('adds and subtracts ordered influences while honoring bounds and resolution', () => {
    const sample = sampleWorldTerrainHeightInfluences({
      plugins: [
        createWorldTerrainHeightInfluencePlugin({
          id: 'continent-uplift',
          order: {
            priority: 10,
          },
          sample() {
            return {
              amount: 0.8,
              reason: 'broad uplift',
            };
          },
        }),
        createWorldTerrainHeightInfluencePlugin({
          id: 'mountain-detail',
          order: {
            priority: 20,
          },
          sampling: {
            bounds: {
              minX: 4,
              maxX: 12,
              minY: 4,
              maxY: 12,
            },
          },
          sample() {
            return 0.35;
          },
        }),
        createWorldTerrainHeightInfluencePlugin({
          id: 'river-carving',
          order: {
            priority: 30,
          },
          sampling: {
            resolutions: ['fine'],
          },
          sample() {
            return {
              amount: -0.25,
              reason: 'river trench',
            };
          },
        }),
      ],
      seed: 'spec-seed',
      worldX: 8,
      worldY: 8,
      resolution: 'fine',
      baseHeight: 1,
    });

    expect(sample.baseHeight).toBe(1);
    expect(sample.height).toBeCloseTo(1.9);
    expect(sample.contributions).toEqual([
      {
        pluginId: 'continent-uplift',
        amount: 0.8,
        reason: 'broad uplift',
      },
      {
        pluginId: 'mountain-detail',
        amount: 0.35,
        reason: undefined,
      },
      {
        pluginId: 'river-carving',
        amount: -0.25,
        reason: 'river trench',
      },
    ]);

    const coarseSample = sampleWorldTerrainHeightInfluences({
      plugins: [
        createWorldTerrainHeightInfluencePlugin({
          id: 'continent-uplift',
          sample() {
            return 0.8;
          },
        }),
        createWorldTerrainHeightInfluencePlugin({
          id: 'river-carving',
          sampling: {
            resolutions: ['fine'],
          },
          sample() {
            return -0.25;
          },
        }),
      ],
      seed: 'spec-seed',
      worldX: 8,
      worldY: 8,
      resolution: 'coarse',
      baseHeight: 1,
    });

    expect(coarseSample.height).toBeCloseTo(1.8);
    expect(coarseSample.contributions).toEqual([
      {
        pluginId: 'continent-uplift',
        amount: 0.8,
        reason: undefined,
      },
    ]);
  });

  it('rejects invalid influence declarations and sampled values', () => {
    expect(() =>
      createWorldTerrainHeightInfluencePlugin({
        id: ' ',
        sample() {
          return 0.2;
        },
      })
    ).toThrow('Terrain height influence plugin id must be a non-empty string.');

    expect(() =>
      createWorldTerrainHeightInfluencePlugin({
        id: 'mountain-detail',
        sampling: {
          bounds: {
            minX: 2,
            maxX: 1,
            minY: 0,
            maxY: 1,
          },
        },
        sample() {
          return 0.2;
        },
      })
    ).toThrow('Terrain height influence bounds minX 2 must be <= maxX 1.');

    expect(() =>
      sampleWorldTerrainHeightInfluences({
        plugins: [
          createWorldTerrainHeightInfluencePlugin({
            id: 'bad-plugin',
            sample() {
              return Number.NaN;
            },
          }),
        ],
        seed: 'spec-seed',
        worldX: 0,
        worldY: 0,
        resolution: 'coarse',
      })
    ).toThrow(
      'Terrain height influence bad-plugin amount must be a finite number.'
    );
  });
});
