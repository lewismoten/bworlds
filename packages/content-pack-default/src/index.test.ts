import { describe, expect, it } from 'vitest';
import {
  createDefaultRuntimePlugins,
  createDefaultTilePlugins,
} from './index.ts';

describe('content pack default', () => {
  it('includes the rail runtime and tile plugins in the default pack', () => {
    const runtimePlugins = createDefaultRuntimePlugins();
    const tilePlugins = createDefaultTilePlugins();

    expect(runtimePlugins.map((plugin) => plugin.name)).toContain(
      'runtime-rail-network'
    );
    expect(tilePlugins.map((plugin) => plugin.name)).toContain('tile-rail');
    const railDefinition = tilePlugins
      .flatMap((plugin) => plugin.tiles ?? [])
      .find((tile) => tile.kind === 'rail')?.definition;
    expect(railDefinition).toEqual(
      expect.objectContaining({
        name: 'Rail Track',
        walkable: true,
      })
    );
  });
});
