import { describe, expect, it } from 'vitest';
import {
  createWorldGenerationChunkBounds,
  createWorldGenerationDependencyKey,
  createWorldGenerationLayerPlugin,
  createWorldGenerationRegionRunner,
  sortWorldGenerationLayerPlugins,
} from './index.ts';

describe('world generation layer plugins', () => {
  it('creates normalized layer plugins with declared dependencies and outputs', () => {
    const plugin = createWorldGenerationLayerPlugin({
      id: ' climate-biomes ',
      order: {
        priority: 30,
        after: ['hydrology', 'hydrology'],
      },
      inputDependencies: [
        {
          pluginId: ' hydrology ',
          recordType: ' river-segment ',
        },
        {
          pluginId: 'hydrology',
          recordType: 'river-segment',
        },
      ],
      outputRecords: [
        {
          recordType: ' biome-region ',
          description: ' regional biome summaries ',
        },
        {
          recordType: 'biome-region',
        },
      ],
      run(context) {
        return [
          {
            id: 'biome-region:0:0',
            type: 'biome-region',
            pluginId: 'climate-biomes',
            bounds: context.bounds,
            summary: {
              biome: 'temperate-forest',
            },
          },
        ];
      },
    });

    expect(plugin.id).toBe('climate-biomes');
    expect(plugin.order).toEqual({
      priority: 30,
      after: ['hydrology'],
      before: undefined,
    });
    expect(plugin.inputDependencies).toEqual([
      {
        pluginId: 'hydrology',
        recordType: 'river-segment',
        optional: false,
      },
    ]);
    expect(plugin.outputRecords).toEqual([
      {
        recordType: 'biome-region',
        description: 'regional biome summaries',
      },
    ]);
    expect(
      plugin.run({
        seed: 'spec',
        bounds: {
          minX: 0,
          maxX: 16,
          minY: 0,
          maxY: 16,
        },
        queryRecords() {
          return [];
        },
      })
    ).toEqual([
      {
        id: 'biome-region:0:0',
        type: 'biome-region',
        pluginId: 'climate-biomes',
        bounds: {
          minX: 0,
          maxX: 16,
          minY: 0,
          maxY: 16,
        },
        summary: {
          biome: 'temperate-forest',
        },
      },
    ]);
  });

  it('rejects malformed world generation layer declarations', () => {
    expect(() =>
      createWorldGenerationLayerPlugin({
        id: ' ',
        outputRecords: [
          {
            recordType: 'terrain-height',
          },
        ],
        run() {
          return [];
        },
      })
    ).toThrow('World generation layer plugin id must be a non-empty string.');

    expect(() =>
      createWorldGenerationLayerPlugin({
        id: 'height-pipeline',
        inputDependencies: [
          {
            pluginId: 'terrain',
            recordType: ' ',
          },
        ],
        outputRecords: [
          {
            recordType: 'terrain-height',
          },
        ],
        run() {
          return [];
        },
      })
    ).toThrow(
      'World generation dependency recordType must be a non-empty string.'
    );

    expect(() =>
      createWorldGenerationLayerPlugin({
        id: 'height-pipeline',
        outputRecords: [],
        run() {
          return [];
        },
      })
    ).toThrow(
      'World generation layer plugin outputRecords must include at least one record type.'
    );
  });

  it('sorts generation layers by priority and declared after or before order', () => {
    const ordered = sortWorldGenerationLayerPlugins([
      createWorldGenerationLayerPlugin({
        id: 'naming',
        order: {
          priority: 50,
          after: ['borders'],
        },
        outputRecords: [{ recordType: 'feature-name' }],
        run() {
          return [];
        },
      }),
      createWorldGenerationLayerPlugin({
        id: 'terrain',
        order: {
          priority: 10,
        },
        outputRecords: [{ recordType: 'terrain-height' }],
        run() {
          return [];
        },
      }),
      createWorldGenerationLayerPlugin({
        id: 'borders',
        order: {
          priority: 40,
          after: ['settlements'],
        },
        outputRecords: [{ recordType: 'region-border' }],
        run() {
          return [];
        },
      }),
      createWorldGenerationLayerPlugin({
        id: 'settlements',
        order: {
          priority: 20,
          before: ['borders'],
        },
        outputRecords: [{ recordType: 'settlement-site' }],
        run() {
          return [];
        },
      }),
    ]);

    expect(ordered.map((plugin) => plugin.id)).toEqual([
      'terrain',
      'settlements',
      'borders',
      'naming',
    ]);
  });

  it('builds stable dependency keys for regional query caches', () => {
    expect(
      createWorldGenerationDependencyKey({
        pluginId: 'hydrology',
        recordType: 'river-segment',
      })
    ).toBe('hydrology:river-segment');
  });

  it('derives inclusive world bounds from signed chunk coordinates', () => {
    expect(
      createWorldGenerationChunkBounds({
        chunkX: -1,
        chunkY: 2,
        chunkWidth: 16,
      })
    ).toEqual({
      minX: -16,
      maxX: -1,
      minY: 32,
      maxY: 47,
    });

    expect(() =>
      createWorldGenerationChunkBounds({
        chunkX: 0.5,
        chunkY: 0,
        chunkWidth: 16,
      })
    ).toThrow('World generation chunk query chunkX must be a finite integer.');
    expect(() =>
      createWorldGenerationChunkBounds({
        chunkX: 0,
        chunkY: 0,
        chunkWidth: 0,
      })
    ).toThrow(
      'World generation chunk query chunkWidth must be a positive finite integer.'
    );
  });

  it('runs generation layers in deterministic order and exposes filtered regional queries', () => {
    const runner = createWorldGenerationRegionRunner({
      plugins: [
        createWorldGenerationLayerPlugin({
          id: 'climate',
          order: {
            priority: 20,
            after: ['terrain'],
          },
          inputDependencies: [
            {
              pluginId: 'terrain',
              recordType: 'height-sample',
            },
          ],
          outputRecords: [{ recordType: 'biome-region' }],
          run(context) {
            expect(
              context.queryRecords({
                pluginId: 'terrain',
                recordType: 'height-sample',
              })
            ).toEqual([
              {
                id: 'terrain:near',
                type: 'height-sample',
                pluginId: 'terrain',
                bounds: {
                  minX: 0,
                  maxX: 16,
                  minY: 0,
                  maxY: 16,
                },
                summary: {
                  averageHeight: 1200,
                },
              },
            ]);
            return [
              {
                id: 'climate:temperate',
                type: 'biome-region',
                pluginId: 'ignored-by-normalizer',
                bounds: {
                  minX: 0,
                  maxX: 16,
                  minY: 0,
                  maxY: 16,
                },
                zoomRelevance: {
                  min: 3,
                  max: 8,
                },
                summary: {
                  biome: 'temperate-forest',
                },
              },
            ];
          },
        }),
        createWorldGenerationLayerPlugin({
          id: 'terrain',
          order: {
            priority: 10,
          },
          outputRecords: [{ recordType: 'height-sample' }],
          run() {
            return [
              {
                id: 'terrain:near',
                type: 'height-sample',
                pluginId: 'ignored-by-normalizer',
                bounds: {
                  minX: 0,
                  maxX: 16,
                  minY: 0,
                  maxY: 16,
                },
                summary: {
                  averageHeight: 1200,
                },
              },
              {
                id: 'terrain:far',
                type: 'height-sample',
                pluginId: 'ignored-by-normalizer',
                bounds: {
                  minX: 64,
                  maxX: 80,
                  minY: 64,
                  maxY: 80,
                },
                summary: {
                  averageHeight: 50,
                },
              },
            ];
          },
        }),
      ],
    });

    const result = runner.runRegion({
      seed: 'spec',
      worldRevision: 'rev-a',
      bounds: {
        minX: 0,
        maxX: 16,
        minY: 0,
        maxY: 16,
      },
    });

    expect(result.orderedPlugins.map((plugin) => plugin.id)).toEqual([
      'terrain',
      'climate',
    ]);
    expect(result.pluginTimings).toHaveLength(2);
    expect(result.pluginTimings.map((timing) => timing.pluginId)).toEqual([
      'terrain',
      'climate',
    ]);
    expect(result.pluginTimings.map((timing) => timing.recordCount)).toEqual([
      2,
      1,
    ]);
    expect(
      result.pluginTimings.every((timing) => timing.durationMs >= 0)
    ).toBe(true);
    expect(result.records).toEqual([
      {
        id: 'terrain:near',
        type: 'height-sample',
        pluginId: 'terrain',
        bounds: {
          minX: 0,
          maxX: 16,
          minY: 0,
          maxY: 16,
        },
        summary: {
          averageHeight: 1200,
        },
      },
      {
        id: 'terrain:far',
        type: 'height-sample',
        pluginId: 'terrain',
        bounds: {
          minX: 64,
          maxX: 80,
          minY: 64,
          maxY: 80,
        },
        summary: {
          averageHeight: 50,
        },
      },
      {
        id: 'climate:temperate',
        type: 'biome-region',
        pluginId: 'climate',
        bounds: {
          minX: 0,
          maxX: 16,
          minY: 0,
          maxY: 16,
        },
        zoomRelevance: {
          min: 3,
          max: 8,
        },
        summary: {
          biome: 'temperate-forest',
        },
      },
    ]);
    expect(
      result.queryRecords({
        bounds: {
          minX: 8,
          maxX: 24,
          minY: 8,
          maxY: 24,
        },
      })
    ).toEqual([
      {
        id: 'terrain:near',
        type: 'height-sample',
        pluginId: 'terrain',
        bounds: {
          minX: 0,
          maxX: 16,
          minY: 0,
          maxY: 16,
        },
        summary: {
          averageHeight: 1200,
        },
      },
      {
        id: 'climate:temperate',
        type: 'biome-region',
        pluginId: 'climate',
        bounds: {
          minX: 0,
          maxX: 16,
          minY: 0,
          maxY: 16,
        },
        zoomRelevance: {
          min: 3,
          max: 8,
        },
        summary: {
          biome: 'temperate-forest',
        },
      },
    ]);
    expect(
      result.queryRecords({
        pluginId: 'climate',
        recordType: 'biome-region',
        zoomLevel: 4,
      })
    ).toEqual([
      {
        id: 'climate:temperate',
        type: 'biome-region',
        pluginId: 'climate',
        bounds: {
          minX: 0,
          maxX: 16,
          minY: 0,
          maxY: 16,
        },
        zoomRelevance: {
          min: 3,
          max: 8,
        },
        summary: {
          biome: 'temperate-forest',
        },
      },
    ]);
    expect(
      result.queryRecords({
        pluginId: 'climate',
        zoomLevel: 2,
      })
    ).toEqual([]);
    expect(
      result.queryChunkRecords({
        chunkX: 0,
        chunkY: 0,
        chunkWidth: 16,
        pluginId: 'terrain',
      })
    ).toEqual([
      {
        id: 'terrain:near',
        type: 'height-sample',
        pluginId: 'terrain',
        bounds: {
          minX: 0,
          maxX: 16,
          minY: 0,
          maxY: 16,
        },
        summary: {
          averageHeight: 1200,
        },
      },
    ]);
    expect(
      result.summarizeChunkRecords({
        chunkX: 0,
        chunkY: 0,
        chunkWidth: 16,
        zoomLevel: 4,
      })
    ).toEqual([
      {
        pluginId: 'climate',
        recordType: 'biome-region',
        count: 1,
      },
      {
        pluginId: 'terrain',
        recordType: 'height-sample',
        count: 1,
      },
    ]);
    expect(result.summarizeRecords()).toEqual([
      {
        pluginId: 'climate',
        recordType: 'biome-region',
        count: 1,
      },
      {
        pluginId: 'terrain',
        recordType: 'height-sample',
        count: 2,
      },
    ]);
  });

  it('reuses cached region runs for the same revision and bounds', () => {
    let runCount = 0;
    const runner = createWorldGenerationRegionRunner({
      plugins: [
        createWorldGenerationLayerPlugin({
          id: 'terrain',
          outputRecords: [{ recordType: 'height-sample' }],
          run() {
            runCount += 1;
            return [
              {
                id: 'terrain:0',
                type: 'height-sample',
                pluginId: 'terrain',
                bounds: {
                  minX: 0,
                  maxX: 16,
                  minY: 0,
                  maxY: 16,
                },
              },
            ];
          },
        }),
      ],
    });

    const first = runner.runRegion({
      seed: 'spec',
      worldRevision: 'rev-a',
      bounds: {
        minX: 0,
        maxX: 16,
        minY: 0,
        maxY: 16,
      },
    });
    const second = runner.runRegion({
      seed: 'spec',
      worldRevision: 'rev-a',
      bounds: {
        minX: 0,
        maxX: 16,
        minY: 0,
        maxY: 16,
      },
    });
    const third = runner.runRegion({
      seed: 'spec',
      worldRevision: 'rev-b',
      bounds: {
        minX: 0,
        maxX: 16,
        minY: 0,
        maxY: 16,
      },
    });

    expect(first).toBe(second);
    expect(third).not.toBe(first);
    expect(first.pluginTimings).toBe(second.pluginTimings);
    expect(runCount).toBe(2);
  });
});
