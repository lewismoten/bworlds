import { describe, expect, it } from 'vitest';
import { getActivePluginRegistry } from '@bworlds/plugin-api';
import {
  createBuiltinContentPackCatalog,
  createDefaultPluginRegistry,
  createPluginRegistryFromPack,
  createPluginRegistryFromPacks,
  createWorldRuntime,
  createWorldGenerator,
  listContentPacks,
  listBuiltinContentPacks,
} from './index.ts';
import type { PluginPackDefinitionLike } from '@bworlds/plugin-api';

function createGenerator() {
  const plugins = createDefaultPluginRegistry();
  return createWorldGenerator({ seed: 'spec', plugins });
}

const customPackDefinition: PluginPackDefinitionLike = {
  manifest: {
    id: 'custom-spec-pack',
    name: 'Custom Spec Pack',
    description: 'Adds a deterministic custom tile for bootstrap testing.',
    tags: ['test', 'custom'],
  },
  createPack() {
    return {
      name: 'custom-spec-pack',
      tilePlugins: [
        {
          name: 'tile-custom-spec',
          tiles: [
            {
              kind: 'customSpec',
              definition: {
                name: 'Custom Spec',
                color: '#123456',
                miniColor: '#789abc',
                walkable: true,
                wallHeight: 0,
              },
            },
          ],
        },
      ],
    };
  },
};

describe('world generator', () => {
  it('lists built-in content packs with manifest metadata', () => {
    expect(listBuiltinContentPacks()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'default-content-pack',
          name: 'Default Content Pack',
        }),
        expect.objectContaining({
          id: 'frontier-content-pack',
          name: 'Frontier Flavor Pack',
        }),
        expect.objectContaining({
          id: 'ruins-content-pack',
          name: 'Ruins Landmark Pack',
        }),
      ])
    );
  });

  it('creates a reusable built-in content pack catalog with default selections', () => {
    const catalog = createBuiltinContentPackCatalog();

    expect(catalog.defaultPackIds).toEqual([
      'default-content-pack',
      'frontier-content-pack',
    ]);
    expect(catalog.listSelected()).toEqual([
      expect.objectContaining({ id: 'default-content-pack' }),
      expect.objectContaining({ id: 'frontier-content-pack' }),
    ]);

    const registry = catalog.createRegistry();
    expect(registry.getTilePlugin('plains')?.kind).toBe('plains');
    expect(registry.plugins.map((plugin) => plugin.name)).toContain(
      'runtime-frontier-flavor'
    );
  });

  it('creates plugin registries from selected built-in pack ids', () => {
    const registry = createPluginRegistryFromPack('default-content-pack');
    expect(registry.plugins.length).toBeGreaterThan(0);
    expect(registry.getTilePlugin('town')?.kind).toBe('town');
    expect(registry.getTilePlugin('floor')?.kind).toBe('floor');
    expect(registry.getTileDefinition('floor')?.name).toBe('Floor');
    expect(registry.getTilePlugin('plains')?.kind).toBe('plains');
    expect(registry.getTileDefinition('plains')?.name).toBe('Plains');
    expect(registry.getTileDefinition('ocean')?.name).toBe('Ocean');
    expect(registry.getTileDefinition('forest')?.name).toBe('Forest');
    expect(registry.getTileDefinition('road')?.name).toBe('Road');
  });

  it('creates plugin registries from optional overlay tile packs', () => {
    const registry = createPluginRegistryFromPacks([
      'default-content-pack',
      'ruins-content-pack',
    ]);

    expect(registry.getTilePlugin('ruins')?.kind).toBe('ruins');
    expect(registry.getTileDefinition('ruins')).toEqual(
      expect.objectContaining({
        name: 'Ruins',
        walkable: true,
      })
    );
  });

  it('lists caller-supplied content pack manifests', () => {
    expect(listContentPacks([customPackDefinition])).toEqual([
      customPackDefinition.manifest,
    ]);
  });

  it('creates composed plugin registries from multiple built-in packs', () => {
    const registry = createPluginRegistryFromPacks([
      'default-content-pack',
      'frontier-content-pack',
      'ruins-content-pack',
    ]);

    expect(registry.plugins.map((plugin) => plugin.name)).toContain(
      'runtime-frontier-flavor'
    );
    expect(registry.plugins.map((plugin) => plugin.name)).toContain(
      'tile-ruins'
    );
    expect(registry.getTilePlugin('town')?.kind).toBe('town');
  });

  it('creates registries from caller-supplied content pack definitions', () => {
    const registry = createPluginRegistryFromPack('custom-spec-pack', [
      customPackDefinition,
    ]);

    expect(registry.getTilePlugin('customSpec')?.kind).toBe('customSpec');
    expect(registry.getTileDefinition('customSpec')).toEqual(
      expect.objectContaining({
        name: 'Custom Spec',
        walkable: true,
      })
    );
  });

  it('creates a reusable world runtime bootstrap with saved state support', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      packIds: ['default-content-pack', 'frontier-content-pack'],
      player: { x: 12.5, y: -4.25, facing: Math.PI / 2 },
      viewMode: '3d',
      stack: [
        {
          id: 'overworld',
          label: 'Overworld',
          type: 'overworld',
          depth: 0,
          origin: { x: 0, y: 0 },
        },
      ],
    });

    expect(runtime.contentPacks.map((pack) => pack.id)).toEqual([
      'default-content-pack',
      'frontier-content-pack',
    ]);
    expect(runtime.state.viewMode).toBe('3d');
    expect(runtime.state.player).toMatchObject({
      x: 12.5,
      y: -4.25,
    });
    expect(runtime.state.getTileDefinition('plains')).toEqual(
      expect.objectContaining({
        name: 'Plains',
        walkable: true,
      })
    );
    expect(getActivePluginRegistry()).toBe(runtime.registry);
  });

  it('bootstraps runtime state from caller-supplied pack definitions', () => {
    const runtime = createWorldRuntime({
      packIds: ['custom-spec-pack'],
      packDefinitions: [customPackDefinition],
      activateRegistry: false,
    });

    expect(runtime.contentPacks).toEqual([customPackDefinition.manifest]);
    expect(runtime.registry.getTileDefinition('customSpec')).toEqual(
      expect.objectContaining({
        name: 'Custom Spec',
      })
    );
  });

  it('is deterministic for overworld tiles', () => {
    const generator = createGenerator();
    expect(generator.sampleOverworld(10, 20)).toEqual(
      generator.sampleOverworld(10, 20)
    );
  });

  it('creates the overworld through the registered map plugin path', () => {
    const generator = createGenerator();
    const overworld = generator.getMap({
      id: 'overworld',
      label: 'Overworld',
      type: 'overworld',
      depth: 0,
      origin: { x: 0, y: 0 },
    });

    expect(overworld.getTile(0, 0)).toEqual(generator.sampleOverworld(0, 0));
    expect(overworld.getAction(5, 4)).toMatchObject({
      type: 'enter',
      context: {
        type: 'town',
      },
    });
  });

  it('creates enterable points of interest somewhere near the origin', () => {
    const generator = createGenerator();
    let found = null;
    for (let y = -300; y <= 300 && !found; y += 1) {
      for (let x = -300; x <= 300; x += 1) {
        const tile = generator.sampleOverworld(x, y);
        if (tile.poi) {
          found = tile;
          break;
        }
      }
    }
    expect(found?.poi?.type).toMatch(/town|dungeon|cave/);
  });

  it('creates town maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const townMap = generator.getMap({
      id: 'town:test:0',
      label: 'Test Town',
      type: 'town',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(townMap.getTile(0, 0).kind).toBe('town');
    expect(townMap.getTile(0, 11).kind).toBe('door');
    expect(townMap.getTile(4, 0).note).toBe('The market is busy today.');
  });

  it('creates building maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const buildingMap = generator.getMap({
      id: 'building:test:0',
      label: 'Test Building',
      type: 'building',
      depth: 2,
      origin: { x: 5, y: 4 },
    });

    expect(buildingMap.getTile(0, 0).kind).toBe('floor');
    expect(buildingMap.getTile(0, 3).kind).toBe('door');
  });

  it('creates depth maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const depthMap = generator.getMap({
      id: 'dungeon:5:4:1',
      label: 'Test Dungeon',
      type: 'dungeon',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(depthMap.getTile(0, 0).kind).toBe('dungeon');
    expect(depthMap.getTile(0, -6).kind).toBe('stairsDown');
    expect(depthMap.getAction(0, -6)).toMatchObject({
      type: 'deepen',
      context: {
        type: 'dungeon',
        depth: 2,
      },
    });
  });

  it('applies depth flavor through the registered runtime plugin path', () => {
    const generator = createGenerator();
    const depthMap = generator.getMap({
      id: 'dungeon:test:0',
      label: 'Test Dungeon',
      type: 'dungeon',
      depth: 1,
      origin: { x: 5, y: 4 },
    });
    expect(depthMap.getTile(0, -7).note).toBe(
      'Depth 1: ancient markings cover the floor.'
    );
  });

  it('applies frontier overlay flavor through a composed pack registry', () => {
    const plugins = createPluginRegistryFromPacks([
      'default-content-pack',
      'frontier-content-pack',
    ]);
    const generator = createWorldGenerator({ seed: 'spec', plugins });

    let flavoredTile = null;
    for (let y = -300; y <= 300 && !flavoredTile; y += 1) {
      for (let x = -300; x <= 300; x += 1) {
        const tile = generator.sampleOverworld(x, y);
        if (tile.kind === 'plains' && typeof tile.regionFlavor === 'string') {
          flavoredTile = tile;
          break;
        }
      }
    }

    expect(flavoredTile).toMatchObject({
      kind: 'plains',
      regionFlavor: expect.stringMatching(/-/),
      note: expect.stringContaining('stretch'),
    });
  });
});
