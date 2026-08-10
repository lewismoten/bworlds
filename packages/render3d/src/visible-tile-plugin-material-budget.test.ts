import { describe, expect, it } from 'vitest';
import {
  FULL_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT,
  LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT,
  getVisibleTilePluginUniqueMaterialLimit,
  validateVisibleTilePluginMaterialBudget,
} from './visible-tile-plugin-material-budget.ts';

describe('visible tile plugin material budget', () => {
  it('shares material references across tiles for the same plugin when counting the cap', () => {
    const shared = {} as never;
    const uniqueA = {} as never;
    const uniqueB = {} as never;

    expect(
      validateVisibleTilePluginMaterialBudget(
        [
          {
            key: '0:0',
            tilePluginOwnerLabel: 'tile-town',
            uniqueMaterials: [shared, uniqueA],
          },
          {
            key: '1:0',
            tilePluginOwnerLabel: 'tile-town',
            uniqueMaterials: [shared, uniqueB],
          },
        ],
        'tile-town',
        [shared],
        'full'
      )
    ).toEqual({
      accepted: true,
      materialCount: 3,
      limit: FULL_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT,
    });
  });

  it('ignores unrelated plugins and replaced tile keys when validating the cap', () => {
    const replacementA = {} as never;
    const replacementB = {} as never;
    const next = {} as never;

    expect(
      validateVisibleTilePluginMaterialBudget(
        [
          {
            key: '2:2',
            tilePluginOwnerLabel: 'tile-town',
            uniqueMaterials: [replacementA, replacementB],
          },
          {
            key: '4:4',
            tilePluginOwnerLabel: 'tile-dungeon',
            uniqueMaterials: Array.from({
              length: LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT,
            }).map(() => ({}) as never),
          },
        ],
        'tile-town',
        [next],
        'low',
        '2:2'
      )
    ).toEqual({
      accepted: true,
      materialCount: 1,
      limit: LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT,
    });
  });

  it('rejects plugin materials that exceed the active-scene per-plugin cap', () => {
    const entries = Array.from({
      length: LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT,
    }).map((_, index) => ({
      key: `${index}:0`,
      tilePluginOwnerLabel: 'tile-town',
      uniqueMaterials: [{} as never],
    }));

    expect(
      validateVisibleTilePluginMaterialBudget(
        entries,
        'tile-town',
        [{} as never],
        'low'
      )
    ).toEqual({
      accepted: false,
      materialCount: LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT + 1,
      limit: LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT,
    });
  });

  it('uses stricter plugin material caps for low detail than full detail', () => {
    expect(getVisibleTilePluginUniqueMaterialLimit('full')).toBe(
      FULL_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT
    );
    expect(getVisibleTilePluginUniqueMaterialLimit('low')).toBe(
      LOW_DETAIL_VISIBLE_TILE_PLUGIN_UNIQUE_MATERIAL_LIMIT
    );
  });
});
