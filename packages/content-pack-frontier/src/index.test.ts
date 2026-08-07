import { describe, expect, it } from 'vitest';
import {
  createFrontierContentPack,
  createFrontierContentPackDefinition,
  createFrontierRuntimePlugins,
  frontierContentPackManifest,
} from './index.ts';

describe('frontier content pack', () => {
  it('exposes the frontier manifest through its pack definition', () => {
    const definition = createFrontierContentPackDefinition();

    expect(definition.manifest).toEqual(frontierContentPackManifest);
    expect(definition.createPack().name).toBe('frontier-content-pack');
  });

  it('registers the frontier flavor runtime plugin as an overlay', () => {
    const runtimePlugins = createFrontierRuntimePlugins();
    const pack = createFrontierContentPack();

    expect(runtimePlugins[0]).toMatchObject({
      name: 'runtime-frontier-flavor',
      order: expect.objectContaining({
        after: ['runtime-depth-flavor'],
      }),
    });
    expect(pack.runtimePlugins?.map((plugin) => plugin.name)).toEqual([
      'runtime-frontier-flavor',
    ]);
  });
});
