import { describe, expect, it } from 'vitest';
import {
  createRuinsContentPack,
  createRuinsContentPackDefinition,
  createRuinsTilePlugins,
  ruinsContentPackManifest,
} from './index.ts';

describe('ruins content pack', () => {
  it('exposes the ruins manifest through its pack definition', () => {
    const definition = createRuinsContentPackDefinition();

    expect(definition.manifest).toEqual(ruinsContentPackManifest);
    expect(definition.createPack().name).toBe('ruins-content-pack');
  });

  it('registers the ruins tile plugin as an ordered overlay tile package', () => {
    const tilePlugins = createRuinsTilePlugins();
    const pack = createRuinsContentPack();

    expect(tilePlugins[0]).toMatchObject({
      name: 'tile-ruins',
      order: expect.objectContaining({
        after: ['tile-forest', 'tile-mountain'],
        before: ['tile-route'],
      }),
    });
    expect(pack.tilePlugins?.map((plugin) => plugin.name)).toEqual([
      'tile-ruins',
    ]);
  });
});
