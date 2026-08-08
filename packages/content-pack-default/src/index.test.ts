import { describe, expect, it } from 'vitest';
import {
  createDefaultRuntimePlugins,
  getDefaultTileDefinition,
  listDefaultTileDefinitions,
} from './index.ts';

describe('default content pack tile definitions', () => {
  it('derives built-in tile definitions from the default tile plugin set', () => {
    const entries = listDefaultTileDefinitions();
    const definitions = new Map(entries);

    expect(definitions.get('plains')).toEqual(
      expect.objectContaining({
        name: 'Plains',
        walkable: true,
      })
    );
    expect(definitions.get('ocean')).toEqual(
      expect.objectContaining({
        name: 'Ocean',
        walkable: false,
      })
    );
    expect(definitions.get('floor')).toEqual(
      expect.objectContaining({
        name: 'Floor',
      })
    );
  });

  it('provides a built-in fallback lookup without depending on core tile tables', () => {
    expect(getDefaultTileDefinition('town')).toEqual(
      expect.objectContaining({
        name: 'Town',
      })
    );
    expect(getDefaultTileDefinition('quarry')).toEqual(
      expect.objectContaining({
        name: 'Quarry',
      })
    );
    expect(getDefaultTileDefinition('lighthouse')).toEqual(
      expect.objectContaining({
        name: 'Lighthouse',
      })
    );
    expect(getDefaultTileDefinition('ship')).toEqual(
      expect.objectContaining({
        name: 'Ship',
      })
    );
    expect(getDefaultTileDefinition('missing-kind')).toEqual(
      expect.objectContaining({
        name: 'Plains',
      })
    );
  });

  it('registers celestial runtime plugins in layered order', () => {
    const plugins = createDefaultRuntimePlugins();

    expect(plugins.map((plugin) => plugin.name)).toEqual(
      expect.arrayContaining([
        'runtime-celestial',
        'runtime-celestial-phenomena',
        'runtime-celestial-system',
      ])
    );
  });
});
