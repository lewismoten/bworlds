import { describe, expect, it, vi } from 'vitest';
import type { TilePlugin } from './types';
import {
  createFallbackTileDefinition,
  createPluginPackCatalog,
  createPluginPack,
  createPluginRegistryFromPackDefinitions,
  createRuntimePlugin,
  createSingleTilePlugin,
  createTilePlugin,
  dedupePluginPackIds,
  definePluginPack,
  instantiateOrderedPlugins,
  listTileDefinitionsFromPlugins,
  listPluginPackManifests,
  PluginRegistry,
  resolveTileDefinitionFromPlugins,
  resolvePluginPackDefinition,
  selectPluginPackManifests,
  withDefaultTileKind,
  withOverworldTileClassifier,
  withPluginOrder,
} from './index.ts';

describe('plugin registry', () => {
  it('registers content packs in map, runtime, then tile order', () => {
    const registry = new PluginRegistry();
    registry.registerPack({
      name: 'spec-pack',
      mapPlugins: [{ name: 'map-a' }],
      runtimePlugins: [{ name: 'runtime-a' }],
      tilePlugins: [{ name: 'tile-a', tiles: [{ kind: 'plains' }] }],
    });

    expect(registry.plugins.map((plugin) => plugin.name)).toEqual([
      'map-a',
      'runtime-a',
      'tile-a',
    ]);
    expect(registry.getTilePlugin('plains')?.kind).toBe('plains');
  });

  it('orders plugins within a pack by priority and declared dependencies', () => {
    const registry = new PluginRegistry();
    registry.registerPack({
      name: 'ordered-pack',
      runtimePlugins: [
        { name: 'late-by-priority', order: { priority: 30 } },
        { name: 'first', order: { priority: 10 } },
        {
          name: 'after-first',
          order: { priority: 5, after: ['first'] },
        },
        {
          name: 'before-late',
          order: { priority: 40, before: ['late-by-priority'] },
        },
      ],
    });

    expect(registry.plugins.map((plugin) => plugin.name)).toEqual([
      'first',
      'after-first',
      'before-late',
      'late-by-priority',
    ]);
  });

  it('stores plugin-owned tile definitions alongside tile plugins', () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'tile-interior',
      tiles: [
        {
          kind: 'floor',
          definition: {
            name: 'Floor',
            color: '#94a3b8',
            miniColor: '#cbd5e1',
            walkable: true,
            wallHeight: 0,
          },
        },
      ],
    });

    expect(registry.getTilePlugin('floor')?.kind).toBe('floor');
    expect(registry.getTileDefinition('floor')).toEqual(
      expect.objectContaining({
        name: 'Floor',
        walkable: true,
      })
    );
    expect(registry.listTileDefinitions()).toContainEqual([
      'floor',
      expect.objectContaining({ name: 'Floor' }),
    ]);
  });

  it('tracks the plugin-owned default tile kind and definition', () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'tile-ashlands',
      tiles: [
        {
          kind: 'ashlands',
          isDefaultTile: true,
          definition: {
            name: 'Ashlands',
            color: '#5b5560',
            miniColor: '#7a737f',
            walkable: true,
            wallHeight: 0,
          },
        },
      ],
    });

    expect(registry.getDefaultTileKind()).toBe('ashlands');
    expect(registry.getDefaultTileDefinition()).toEqual(
      expect.objectContaining({
        name: 'Ashlands',
      })
    );
  });

  it('provides shared tile-definition helpers for plugin bootstrap code', () => {
    const basePlugin = withDefaultTileKind(
      createTilePlugin('tile-ashlands', [
        {
          kind: 'ashlands',
          definition: {
            name: 'Ashlands',
            color: '#5b5560',
            miniColor: '#7a737f',
            walkable: true,
            wallHeight: 0,
          },
        },
      ]),
      'ashlands'
    );
    const overlayPlugin = createTilePlugin('tile-ruins', [
      {
        kind: 'ruins',
        definition: {
          name: 'Ruins',
          color: '#8b8173',
          miniColor: '#b3ab9f',
          walkable: true,
          wallHeight: 0.35,
        },
      },
    ]);

    expect(listTileDefinitionsFromPlugins([basePlugin, overlayPlugin])).toContainEqual([
      'ashlands',
      expect.objectContaining({ name: 'Ashlands' }),
    ]);
    expect(
      resolveTileDefinitionFromPlugins([basePlugin, overlayPlugin], 'ruins')
    ).toEqual(expect.objectContaining({ name: 'Ruins' }));
    expect(
      resolveTileDefinitionFromPlugins(
        [basePlugin],
        'missing-kind',
        createFallbackTileDefinition('missing-kind')
      )
    ).toEqual(expect.objectContaining({ name: 'Ashlands' }));
  });

  it('provides a shared overworld classifier wrapper for tile entries', () => {
    const classifyOverworldTile = vi.fn(() => ({
      kind: 'ruins',
      note: 'Ancient stones rise from the field.',
    }));
    const tile = withOverworldTileClassifier<TilePlugin>(
      {
        kind: 'ruins',
        definition: {
          name: 'Ruins',
          color: '#8b8173',
          miniColor: '#b3ab9f',
          walkable: true,
          wallHeight: 0.35,
        },
      },
      classifyOverworldTile
    );
    const payload = {
      seed: 'spec',
      x: 3,
      y: 4,
      tile: { kind: 'plains' },
      nearLand: true,
      signals: {
        continent: 0.6,
        elevation: 0.45,
        moisture: 0.4,
        riverSignal: 0.2,
        roadSignal: 0.3,
      },
      townAnchors: [],
      bridgeAnchors: [],
    };

    expect(tile.classifyOverworldTile?.(payload as any)).toEqual({
      kind: 'ruins',
      note: 'Ancient stones rise from the field.',
    });
    expect(classifyOverworldTile).toHaveBeenCalledWith(payload);
  });

  it('merges runtime-provided world environment settings through the registry', () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'runtime-sky',
      resolveWorldEnvironment() {
        return {
          cycle: { dayLengthMs: 300000 },
          sky: { dayColor: '#abcdef' },
        };
      },
    });
    registry.register({
      name: 'runtime-light',
      resolveWorldEnvironment() {
        return {
          lighting: { sunColor: '#fedcba', shadowStrength: 0.8 },
          stars: { density: 1.4 },
          celestial: { dateLabel: 'Dawn Crown / Full Moon' },
        };
      },
    });

    expect(
      registry.resolveWorldEnvironment({
        state: {} as any,
        timeMs: 1000,
      })
    ).toEqual({
      cycle: { dayLengthMs: 300000 },
      sky: { dayColor: '#abcdef' },
      lighting: { sunColor: '#fedcba', shadowStrength: 0.8 },
      stars: { density: 1.4 },
      celestial: { dateLabel: 'Dawn Crown / Full Moon' },
    });
  });

  it('resolves tile definitions and merged definition catalogs through the registry', () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'tile-plains',
      tiles: [
        {
          kind: 'plains',
          definition: {
            name: 'Plains',
            color: '#7fb069',
            miniColor: '#95c779',
            walkable: true,
            wallHeight: 0,
          },
        },
      ],
    });

    expect(
      registry.resolveTileDefinition('plains', {
        name: 'Fallback Plains',
        color: '#000000',
        miniColor: '#111111',
        walkable: false,
        wallHeight: 0,
      })
    ).toEqual(
      expect.objectContaining({
        name: 'Plains',
        walkable: true,
      })
    );

    expect(
      registry.listResolvedTileDefinitions([
        [
          'plains',
          {
            name: 'Fallback Plains',
            color: '#000000',
            miniColor: '#111111',
            walkable: false,
            wallHeight: 0,
          },
        ],
        [
          'unknown',
          {
            name: 'Unknown',
            color: '#222222',
            miniColor: '#333333',
            walkable: false,
            wallHeight: 0,
          },
        ],
      ])
    ).toContainEqual([
      'plains',
      expect.objectContaining({
        name: 'Plains',
      }),
    ]);
  });

  it('dispatches tile-owned 3D and action hooks by payload.tile.kind', () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'tile-forest',
      tiles: [
        {
          kind: 'forest',
          canOccupy3D({ tileX, tileY, nextX, nextY }) {
            return (
              tileX === 4 &&
              tileY === 5 &&
              nextX === 4.25 &&
              nextY === 5.5
            );
          },
          getSurfaceProfile3D({ tileX, tileY }) {
            return {
              surfaceHeight: tileX === 4 && tileY === 5 ? 0.38 : 0,
            };
          },
          getTraversalProfile3D({ tileX, tileY }) {
            return {
              travelGroup: tileX === 4 && tileY === 5 ? 'forest-path' : null,
            };
          },
          paint2DOverlay({ worldX, worldY, variant, timeMs }) {
            return (
              worldX === 4 &&
              worldY === 5 &&
              variant === 2 &&
              timeMs === 1234
            );
          },
          resolveFloorKind3D({ tileX, tileY }) {
            return tileX === 4 && tileY === 5 ? 'plains' : null;
          },
          createWorldAction({ tile, seed, x, y }) {
            return {
              type: 'inspect',
              context: {
                id: `${seed}:${tile.kind}:${x}:${y}`,
                depth: 0,
              },
            };
          },
        },
      ],
    });

    const tile = { kind: 'forest' };
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', depth: 0, type: 'overworld' };
      },
      getCurrentTile() {
        return tile;
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    expect(
      registry.canOccupy3D({
        state,
        tile,
        tileX: 4,
        tileY: 5,
        nextX: 4.25,
        nextY: 5.5,
        playerRadius: 0.12,
      })
    ).toBe(true);
    expect(
      registry.getSurfaceProfile3D({
        state,
        tile,
        tileX: 4,
        tileY: 5,
      })
    ).toEqual(expect.objectContaining({ surfaceHeight: 0.38 }));
    expect(
      registry.getTraversalProfile3D({
        state,
        tile,
        tileX: 4,
        tileY: 5,
      })
    ).toEqual(expect.objectContaining({ travelGroup: 'forest-path' }));
    expect(
      registry.paint2DOverlay({
        context: {} as CanvasRenderingContext2D,
        tile,
        definition: {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        },
        x: 0,
        y: 0,
        size: 16,
        worldX: 4,
        worldY: 5,
        variant: 2,
        timeMs: 1234,
      })
    ).toBe(true);
    expect(
      registry.resolveFloorKind3D({
        state,
        tile,
        tileX: 4,
        tileY: 5,
      })
    ).toBe('plains');
    expect(
      registry.createWorldAction({
        seed: 'spec',
        x: 4,
        y: 5,
        tile,
      })
    ).toEqual(
      expect.objectContaining({
        type: 'inspect',
        context: expect.objectContaining({
          id: 'spec:forest:4:5',
        }),
      })
    );
  });

  it('provides shared helpers for content-pack authoring', () => {
    const plugin = withPluginOrder(
      { name: 'runtime-custom', order: { after: ['runtime-base'] } },
      { priority: 30, before: ['runtime-late'] }
    );
    const pack = definePluginPack(
      {
        id: 'custom-pack',
        name: 'Custom Pack',
      },
      () => ({
        name: 'custom-pack',
        runtimePlugins: [plugin],
      })
    );

    expect(plugin.order).toEqual({
      after: ['runtime-base'],
      priority: 30,
      before: ['runtime-late'],
    });
    expect(
      createPluginPack('custom-pack', {
        runtimePlugins: [plugin],
      })
    ).toEqual({
      name: 'custom-pack',
      runtimePlugins: [plugin],
    });
    expect(pack.manifest.id).toBe('custom-pack');
    expect(pack.createPack().runtimePlugins?.[0].name).toBe('runtime-custom');
  });

  it('instantiates ordered plugin specs for content-pack groups', () => {
    const plugins = instantiateOrderedPlugins([
      {
        create: () => createRuntimePlugin('runtime-base'),
        order: { priority: 10 },
      },
      {
        create: () => createRuntimePlugin('runtime-overlay'),
        order: { priority: 20, after: ['runtime-base'] },
      },
      {
        create: () => createRuntimePlugin('runtime-freeform'),
      },
    ]);

    expect(plugins.map((plugin) => plugin.name)).toEqual([
      'runtime-base',
      'runtime-overlay',
      'runtime-freeform',
    ]);
    expect(plugins[1]?.order).toEqual({
      priority: 20,
      after: ['runtime-base'],
    });
    expect(plugins[2]?.order).toBeUndefined();
  });

  it('provides a shared helper for tile-plugin authoring', () => {
    const plugin = createTilePlugin('tile-custom', [
      {
        kind: 'customTile',
        definition: {
          name: 'Custom Tile',
          color: '#123456',
          miniColor: '#789abc',
          walkable: true,
          wallHeight: 0,
        },
      },
    ]);

    expect(plugin).toMatchObject({
      name: 'tile-custom',
      tiles: [
        {
          kind: 'customTile',
        },
      ],
    });
  });

  it('provides a shared helper for single-tile plugin authoring', () => {
    const plugin = createSingleTilePlugin('tile-plains', {
      kind: 'plains',
      definition: {
        name: 'Plains',
        color: '#7fb069',
        miniColor: '#95c779',
        walkable: true,
        wallHeight: 0,
      },
    });

    expect(plugin).toMatchObject({
      name: 'tile-plains',
      tiles: [
        {
          kind: 'plains',
        },
      ],
    });
  });

  it('provides a shared helper for runtime-plugin authoring', () => {
    const plugin = createRuntimePlugin('runtime-custom', {
      decorateOverworldTile({ tile }) {
        tile.note = 'Decorated by runtime helper.';
      },
    });

    expect(plugin).toMatchObject({
      name: 'runtime-custom',
    });
    expect(typeof plugin.decorateOverworldTile).toBe('function');
  });

  it('provides shared helpers for pack catalogs and registry composition', () => {
    const pack = definePluginPack(
      {
        id: 'catalog-pack',
        name: 'Catalog Pack',
      },
      () => ({
        name: 'catalog-pack',
        tilePlugins: [
          {
            name: 'tile-catalog',
            tiles: [
              {
                kind: 'catalogTile',
                definition: {
                  name: 'Catalog Tile',
                  color: '#123456',
                  miniColor: '#789abc',
                  walkable: true,
                  wallHeight: 0,
                },
              },
            ],
          },
        ],
      })
    );

    expect(listPluginPackManifests([pack])).toEqual([pack.manifest]);
    expect(resolvePluginPackDefinition('catalog-pack', [pack])).toBe(pack);

    const registry = createPluginRegistryFromPackDefinitions(
      ['catalog-pack', 'catalog-pack'],
      [pack]
    );
    expect(registry.getTilePlugin('catalogTile')?.kind).toBe('catalogTile');
    expect(registry.getTileDefinition('catalogTile')).toEqual(
      expect.objectContaining({
        name: 'Catalog Tile',
      })
    );
  });

  it('orders plugins across multiple selected packs by shared order metadata', () => {
    const basePack = definePluginPack(
      {
        id: 'base-pack',
        name: 'Base Pack',
      },
      () => ({
        name: 'base-pack',
        tilePlugins: [
          withPluginOrder(
            createTilePlugin('tile-base-a', [{ kind: 'baseA' }]),
            { priority: 10 }
          ),
          withPluginOrder(
            createTilePlugin('tile-base-b', [{ kind: 'baseB' }]),
            { priority: 50 }
          ),
        ],
      })
    );
    const overlayPack = definePluginPack(
      {
        id: 'overlay-pack',
        name: 'Overlay Pack',
      },
      () => ({
        name: 'overlay-pack',
        tilePlugins: [
          withPluginOrder(
            createTilePlugin('tile-overlay', [{ kind: 'overlayTile' }]),
            { priority: 30, after: ['tile-base-a'], before: ['tile-base-b'] }
          ),
        ],
      })
    );

    const registry = createPluginRegistryFromPackDefinitions(
      ['base-pack', 'overlay-pack'],
      [basePack, overlayPack]
    );

    expect(registry.plugins.map((plugin) => plugin.name)).toEqual([
      'tile-base-a',
      'tile-overlay',
      'tile-base-b',
    ]);
  });

  it('provides shared helpers for pack id normalization and manifest selection', () => {
    const pack = definePluginPack(
      {
        id: 'catalog-pack',
        name: 'Catalog Pack',
      },
      () => ({
        name: 'catalog-pack',
      })
    );

    expect(
      dedupePluginPackIds(['catalog-pack', 'catalog-pack', 'other-pack'])
    ).toEqual(['catalog-pack', 'other-pack']);
    expect(selectPluginPackManifests(['catalog-pack', 'catalog-pack'], [pack]))
      .toEqual([pack.manifest]);
  });

  it('creates reusable pack catalogs with default selections', () => {
    const basePack = definePluginPack(
      {
        id: 'base-pack',
        name: 'Base Pack',
      },
      () => ({
        name: 'base-pack',
        tilePlugins: [
          createTilePlugin('tile-base', [
            {
              kind: 'baseTile',
              definition: {
                name: 'Base Tile',
                color: '#123456',
                miniColor: '#789abc',
                walkable: true,
                wallHeight: 0,
              },
            },
          ]),
        ],
      })
    );
    const overlayPack = definePluginPack(
      {
        id: 'overlay-pack',
        name: 'Overlay Pack',
      },
      () => ({
        name: 'overlay-pack',
        runtimePlugins: [createRuntimePlugin('runtime-overlay')],
      })
    );

    const catalog = createPluginPackCatalog(
      [basePack, overlayPack],
      ['base-pack', 'overlay-pack', 'base-pack']
    );

    expect(catalog.defaultPackIds).toEqual(['base-pack', 'overlay-pack']);
    expect(catalog.list()).toEqual([basePack.manifest, overlayPack.manifest]);
    expect(catalog.listSelected()).toEqual([
      basePack.manifest,
      overlayPack.manifest,
    ]);
    expect(catalog.resolve('base-pack')).toBe(basePack);

    const registry = catalog.createRegistry();
    expect(registry.getTilePlugin('baseTile')?.kind).toBe('baseTile');
    expect(registry.plugins.map((plugin) => plugin.name)).toContain(
      'runtime-overlay'
    );
  });
});
