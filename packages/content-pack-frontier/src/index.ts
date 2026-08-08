import type {
  PluginPackDefinitionLike,
  RuntimePlugin,
  PluginPackLike,
  PluginPackManifestLike,
} from '@bworlds/plugin-api';
import {
  createPluginPack,
  definePluginPack,
  instantiateOrderedPlugins,
} from '@bworlds/plugin-api';
import { createFrontierFlavorRuntimePlugin } from '@bworlds/runtime-frontier-flavor';

export function createFrontierRuntimePlugins(): RuntimePlugin[] {
  return instantiateOrderedPlugins([
    {
      create: createFrontierFlavorRuntimePlugin,
      order: {
        priority: 30,
        after: ['runtime-depth-flavor'],
      },
    },
  ]);
}

export function createFrontierContentPack(): PluginPackLike {
  return createPluginPack('frontier-content-pack', {
    runtimePlugins: createFrontierRuntimePlugins(),
  });
}

export const frontierContentPackManifest: PluginPackManifestLike = {
  id: 'frontier-content-pack',
  name: 'Frontier Flavor Pack',
  description:
    'A lightweight overlay pack that adds extra regional overworld flavor through runtime hooks.',
  tags: ['builtin', 'overlay', 'runtime', 'flavor'],
};

export function createFrontierContentPackDefinition(): PluginPackDefinitionLike {
  return definePluginPack(
    frontierContentPackManifest,
    createFrontierContentPack
  );
}
