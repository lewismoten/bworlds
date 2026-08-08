import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS, normalizeAngle } from '@bworlds/core';
import { createOverworldTerrainSignalSampler } from '@bworlds/overworld-support';
import { getActivePluginRegistry } from '@bworlds/plugin-api';
import { buildPlayerPoi } from '@bworlds/runtime-player-poi';
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
import type {
  PluginPackDefinitionLike,
  ResolveWorldEnvironmentContext,
  WorldActionLike,
} from '@bworlds/plugin-api';

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
    expect(registry.getTilePlugin('quarry')?.kind).toBe('quarry');
    expect(registry.getTilePlugin('lighthouse')?.kind).toBe('lighthouse');
  });

  it('keeps the default celestial day length when the frontier overlay is enabled', () => {
    const registry = createPluginRegistryFromPacks([
      'default-content-pack',
      'frontier-content-pack',
    ]);
    const payload: ResolveWorldEnvironmentContext = {
      timeMs: 0,
      state: {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile() {
          return { kind: 'plains' };
        },
        getTileDefinition() {
          return {
            name: 'Plains',
            color: '#000000',
            miniColor: '#111111',
            walkable: true,
            wallHeight: 0,
          };
        },
      },
    };

    const environment = registry.resolveWorldEnvironment(payload);

    expect(environment.cycle?.dayLengthMs).toBe(DEFAULT_DAY_LENGTH_MS);
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

  it('keeps sampleOverworld callable even when the method is detached', () => {
    const generator = createGenerator();
    const { sampleOverworld } = generator;

    expect(sampleOverworld(10, 20)).toEqual(generator.sampleOverworld(10, 20));
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
    expect(found?.poi?.type).toMatch(/town|dungeon|cave|quarry|ship|observatory/);
  });

  it('enters poi instances and exits back to the overworld facing away from the entrance', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const state = runtime.state;
    let poiLocation: { x: number; y: number } | null = null;
    let action: WorldActionLike | null = null;

    for (let y = -300; y <= 300 && !poiLocation; y += 1) {
      for (let x = -300; x <= 300; x += 1) {
        const candidateAction = state.getCurrentMap().getAction?.(
          x,
          y,
          state
        ) as WorldActionLike | null | undefined;
        if (candidateAction?.type === 'enter' && candidateAction.context?.type) {
          poiLocation = { x, y };
          action = candidateAction;
          break;
        }
      }
    }

    if (!poiLocation || !action?.context?.type) {
      throw new Error('Expected to find an enterable point of interest near the origin band.');
    }

    state.player.x = poiLocation.x;
    state.player.y = poiLocation.y;
    state.player.facing = 0.35;

    expect(state.interact()).toBe(true);
    expect(state.stack).toHaveLength(2);
    expect(state.getCurrentContext()).toEqual(
      expect.objectContaining({
        id: action.context.id,
        type: action.context.type,
      })
    );

    if (action.context.type === 'town') {
      state.player.x = 0;
      state.player.y = 11;
    } else {
      state.player.x = 0;
      state.player.y = 6;
    }

    expect(state.tryExit()).toBe(true);
    expect(state.stack).toHaveLength(1);
    expect(state.getCurrentContext().type).toBe('overworld');
    expect(state.player.x).toBe(poiLocation.x);
    expect(state.player.y).toBe(poiLocation.y);
    expect(state.player.facing).toBeCloseTo(normalizeAngle(0.35 + Math.PI), 6);
  });

  it('keeps forests, rivers, and bridges present near the overworld origin band', () => {
    const generator = createGenerator();
    expect(generator.sampleOverworld(-3, -3).kind).toBe('forest');
    expect(generator.sampleOverworld(3, -1).kind).toBe('river');
    expect(generator.sampleOverworld(3, 2).kind).toBe('bridge');
  });

  it('produces connected river runs outside the curated start region', () => {
    const generator = createGenerator();
    let foundRiverRun = false;

    for (let y = -140; y <= 140 && !foundRiverRun; y += 1) {
      for (let x = -140; x <= 140; x += 1) {
        if (Math.abs(x) <= 12 && Math.abs(y) <= 12) {
          continue;
        }
        if (generator.sampleOverworld(x, y).kind !== 'river') {
          continue;
        }

        const riverNeighbors = [
          generator.sampleOverworld(x, y - 1).kind,
          generator.sampleOverworld(x + 1, y).kind,
          generator.sampleOverworld(x, y + 1).kind,
          generator.sampleOverworld(x - 1, y).kind,
          generator.sampleOverworld(x + 1, y - 1).kind,
          generator.sampleOverworld(x + 1, y + 1).kind,
          generator.sampleOverworld(x - 1, y + 1).kind,
          generator.sampleOverworld(x - 1, y - 1).kind,
        ].filter((kind) => kind === 'river').length;

        if (riverNeighbors >= 2) {
          foundRiverRun = true;
          break;
        }
      }
    }

    expect(foundRiverRun).toBe(true);
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

  it('creates quarry maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const quarryMap = generator.getMap({
      id: 'quarry:5:4:1',
      label: 'Test Quarry',
      type: 'quarry',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(quarryMap.getTile(0, 0).kind).toBe('quarry');
    expect(quarryMap.getTile(0, 8).kind).toBe('door');
    expect(quarryMap.getTile(0, 4).kind).toBe('road');
  });

  it('creates lighthouse maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const lighthouseMap = generator.getMap({
      id: 'lighthouse:5:4:1',
      label: 'Test Lighthouse',
      type: 'lighthouse',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(lighthouseMap.getTile(0, 0).kind).toBe('lighthouse');
    expect(lighthouseMap.getTile(0, 4).kind).toBe('door');
    expect(lighthouseMap.getTile(3, 0).kind).toBe('floor');
  });

  it('creates ship maps through the registered map plugin path', () => {
    const generator = createGenerator();
    const shipMap = generator.getMap({
      id: 'ship:5:4:1',
      label: 'Test Ship',
      type: 'ship',
      depth: 1,
      origin: { x: 5, y: 4 },
    });

    expect(shipMap.getTile(0, 0).kind).toBe('ship');
    expect(shipMap.getTile(0, 5).kind).toBe('door');
    expect(shipMap.getTile(0, -3).kind).toBe('interior');
  });

  it('creates quarry points of interest somewhere near the origin', () => {
    const registry = createDefaultPluginRegistry();
    let quarryAnchor: { x: number; y: number } | null = null;
    let quarrySeed = '';

    for (let seedIndex = 0; seedIndex < 12 && !quarryAnchor; seedIndex += 1) {
      quarrySeed = `quarry-worldgen-spec:${seedIndex}`;
      const sampleTerrainSignals = createOverworldTerrainSignalSampler(quarrySeed);
      for (let y = -320; y <= 320 && !quarryAnchor; y += 32) {
        for (let x = -320; x <= 320; x += 32) {
          const anchors = registry.resolveOverworldAnchors({
            seed: quarrySeed,
            x,
            y,
            sampleTerrainSignals,
          });
          const found = anchors.poiAnchors.find((anchor) => anchor.type === 'quarry');
          if (found) {
            quarryAnchor = { x: found.x, y: found.y };
            break;
          }
        }
      }
    }

    expect(quarryAnchor).not.toBeNull();
    const generator = createWorldGenerator({
      seed: quarrySeed,
      plugins: registry,
    });

    const quarryTile = generator.sampleOverworld(quarryAnchor!.x, quarryAnchor!.y);

    expect(quarryTile.poi?.type).toBe('quarry');
    expect(quarryTile.poi?.name).toMatch(
      /\b(Quarry|Cut|Excavation|Pit|Works|Stone)\b/
    );
  });

  it('creates lighthouse points of interest somewhere near the origin', () => {
    const generator = createGenerator();
    const lighthouseTile = generator.sampleOverworld(6, 0);

    expect(lighthouseTile.poi?.type).toBe('lighthouse');
    expect(lighthouseTile.poi?.name).toMatch(
      /\b(Beacon|Light|Watch|Lantern|Signal|Point)\b/
    );
  });

  it('creates a starter ship point of interest at the lighthouse dock', () => {
    const generator = createGenerator();
    const shipTile = generator.sampleOverworld(9, 0);

    expect(shipTile.poi?.type).toBe('ship');
    expect(shipTile.poi?.name).toMatch(
      /\b(Mariner|Brig|Galleon|Hulk|Harbor|Mast)\b/
    );
  });

  it('lets the player build and enter a new poi anywhere on an open overworld tile', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const state = runtime.state;

    state.player.x = 0;
    state.player.y = 0;
    state.player.facing = 0;

    const built = buildPlayerPoi(state, 'spec', 'town');

    expect(built).toEqual(
      expect.objectContaining({
        kind: 'town',
        poi: expect.objectContaining({
          type: 'town',
        }),
      })
    );
    expect(state.getCurrentTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'town',
        poi: expect.objectContaining({
          type: 'town',
        }),
      })
    );
    expect(state.interact()).toBe(true);
    expect(state.getCurrentContext().type).toBe('town');
  });

  it('lets the player build and enter a new observatory on an open overworld tile', () => {
    const runtime = createWorldRuntime({
      seed: 'spec',
      activateRegistry: false,
    });
    const state = runtime.state;

    state.player.x = 0;
    state.player.y = 0;
    state.player.facing = 0;

    const built = buildPlayerPoi(state, 'spec', 'observatory');

    expect(built).toEqual(
      expect.objectContaining({
        kind: 'observatory',
        poi: expect.objectContaining({
          type: 'observatory',
        }),
      })
    );
    expect(state.getCurrentTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'observatory',
        poi: expect.objectContaining({
          type: 'observatory',
        }),
      })
    );
    expect(state.interact()).toBe(true);
    expect(state.getCurrentContext().type).toBe('observatory');

    state.player.x = 0;
    state.player.y = 5;
    state.player.facing = 0;
    expect(state.tryExit()).toBe(true);
    expect(state.getCurrentContext().type).toBe('overworld');
  });

  it('creates a starter observatory on a nearby summit', () => {
    const generator = createGenerator();
    const observatoryTile = generator.sampleOverworld(-6, -2);

    expect(observatoryTile.poi?.type).toBe('observatory');
    expect(observatoryTile.poi?.name).toMatch(
      /\b(Observatory|Dome|Lens|Crown|Apex|Spire)\b/
    );
  });

  it('creates starter docks beside the lighthouse instead of bridge-like coastal crossings', () => {
    const generator = createGenerator();

    expect(generator.sampleOverworld(7, 0).kind).toBe('dock');
    expect(generator.sampleOverworld(8, 0).kind).toBe('dock');
    expect(generator.sampleOverworld(3, 2).kind).toBe('bridge');
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
