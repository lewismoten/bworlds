import { describe, expect, it } from 'vitest';
import {
  FULL_DETAIL_TILE_TEXTURE_MEMORY_LIMIT,
  FULL_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT,
  FULL_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT,
  FULL_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT,
  LOW_DETAIL_TILE_TEXTURE_MEMORY_LIMIT,
  LOW_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT,
  LOW_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT,
  LOW_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT,
  getTileTextureMemoryLimit,
  getUniqueTextureMemoryEstimateBytes,
  getVisibleChunkTextureMemoryLimit,
  getVisiblePluginTextureMemoryLimit,
  getVisibleSceneTextureMemoryLimit,
  validateVisibleTileChunkTextureBudget,
  validateVisibleTilePluginTextureBudget,
  validateVisibleTileSceneTextureBudget,
} from './visible-tile-texture-budget.ts';

describe('visible tile texture budget', () => {
  it('deduplicates repeated texture references when estimating bytes', () => {
    const shared = {
      image: {
        width: 32,
        height: 16,
      },
      generateMipmaps: false,
    };

    expect(getUniqueTextureMemoryEstimateBytes([shared, shared])).toBe(2048);
  });

  it('rejects plugin texture budgets once unique bytes exceed the detail cap', () => {
    const entries = [
      {
        key: '0:0',
        tileX: 0,
        tileY: 0,
        tilePluginOwnerLabel: 'tile-town',
        pluginUniqueTextures: [
          {
            image: {
              width: 1024,
              height: 1024,
            },
          },
        ],
      },
    ];

    expect(
      validateVisibleTilePluginTextureBudget(
        entries,
        'tile-town',
        [
          {
            image: {
              width: 2048,
              height: 2048,
            },
          },
        ],
        'low'
      )
    ).toEqual({
      accepted: false,
      textureMemoryEstimateBytes: 22_369_621,
      limit: LOW_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT,
    });
  });

  it('rejects chunk texture budgets based on unique textures within one chunk', () => {
    const shared = {
      image: {
        width: 1024,
        height: 1024,
      },
    };

    expect(
      validateVisibleTileChunkTextureBudget(
        [
          {
            key: '0:0',
            tileX: 0,
            tileY: 0,
            uniqueTextures: [shared],
          },
        ],
        {
          key: '1:0',
          tileX: 1,
          tileY: 0,
          uniqueTextures: [
            {
              image: {
                width: 1024,
                height: 1024,
              },
            },
          ],
        },
        'low'
      )
    ).toEqual({
      accepted: false,
      textureMemoryEstimateBytes: 11_184_810,
      limit: LOW_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT,
    });
  });

  it('deduplicates shared chunk textures and ignores other chunks', () => {
    const shared = {
      image: {
        width: 512,
        height: 512,
      },
      generateMipmaps: false,
    };

    expect(
      validateVisibleTileChunkTextureBudget(
        [
          {
            key: '0:0',
            tileX: 0,
            tileY: 0,
            uniqueTextures: [shared],
          },
          {
            key: '4:0',
            tileX: 4,
            tileY: 0,
            uniqueTextures: [
              {
                image: {
                  width: 2048,
                  height: 2048,
                },
              },
            ],
          },
        ],
        {
          key: '1:0',
          tileX: 1,
          tileY: 0,
          uniqueTextures: [shared],
        },
        'low'
      )
    ).toEqual({
      accepted: true,
      textureMemoryEstimateBytes: 1_048_576,
      limit: LOW_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT,
    });
  });

  it('rejects scene texture budgets across all visible entries', () => {
    expect(
      validateVisibleTileSceneTextureBudget(
        [
          {
            key: '0:0',
            tileX: 0,
            tileY: 0,
            uniqueTextures: [
              {
                image: {
                  width: 2048,
                  height: 2048,
                },
              },
            ],
          },
        ],
        {
          key: '1:0',
          tileX: 1,
          tileY: 0,
          uniqueTextures: [
            {
              image: {
                width: 2048,
                height: 2048,
              },
            },
          ],
        },
        'low'
      )
    ).toEqual({
      accepted: false,
      textureMemoryEstimateBytes: 44_739_242,
      limit: LOW_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT,
    });
  });

  it('exposes distinct texture-byte limits by detail level', () => {
    expect(getTileTextureMemoryLimit('full')).toBe(FULL_DETAIL_TILE_TEXTURE_MEMORY_LIMIT);
    expect(getTileTextureMemoryLimit('low')).toBe(LOW_DETAIL_TILE_TEXTURE_MEMORY_LIMIT);
    expect(getVisibleChunkTextureMemoryLimit('full')).toBe(
      FULL_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT
    );
    expect(getVisibleChunkTextureMemoryLimit('low')).toBe(
      LOW_DETAIL_VISIBLE_CHUNK_TEXTURE_MEMORY_LIMIT
    );
    expect(getVisiblePluginTextureMemoryLimit('full')).toBe(
      FULL_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT
    );
    expect(getVisiblePluginTextureMemoryLimit('low')).toBe(
      LOW_DETAIL_VISIBLE_PLUGIN_TEXTURE_MEMORY_LIMIT
    );
    expect(getVisibleSceneTextureMemoryLimit('full')).toBe(
      FULL_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT
    );
    expect(getVisibleSceneTextureMemoryLimit('low')).toBe(
      LOW_DETAIL_VISIBLE_SCENE_TEXTURE_MEMORY_LIMIT
    );
  });
});
