import { describe, expect, it } from 'vitest';
import {
  createPluginPackCatalog,
  createPluginRegistryFromPackDefinitions,
  createRuntimePlugin,
  createTilePlugin,
  dedupePluginPackIds,
  definePluginPack,
  listPluginPackManifests,
  PluginRegistry,
  resolvePluginPackDefinition,
  selectPluginPackManifests,
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
    expect(pack.manifest.id).toBe('custom-pack');
    expect(pack.createPack().runtimePlugins?.[0].name).toBe('runtime-custom');
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
