import { describe, expect, it } from 'vitest';
import {
  createWorldGenerationDependencyKey,
  createWorldGenerationLayerPlugin,
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
});
