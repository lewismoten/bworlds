import { describe, expect, it } from 'vitest';
import {
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
    expect(getDefaultTileDefinition('missing-kind')).toEqual(
      expect.objectContaining({
        name: 'Plains',
      })
    );
  });
});
