import type {
  PluginPackDefinitionLike,
  PluginPackLike,
  PluginPackManifestLike,
} from '@bworlds/plugin-api';
import { definePluginPack, withPluginOrder } from '@bworlds/plugin-api';
import { createRuinsTilePlugin } from '@bworlds/tile-ruins';

export function createRuinsTilePlugins() {
  return [
    withPluginOrder(createRuinsTilePlugin(), {
      priority: 45,
      after: ['tile-forest', 'tile-mountain'],
      before: ['tile-route'],
    }),
  ];
}

export function createRuinsContentPack(): PluginPackLike {
  return {
    name: 'ruins-content-pack',
    tilePlugins: createRuinsTilePlugins(),
  };
}

export const ruinsContentPackManifest: PluginPackManifestLike = {
  id: 'ruins-content-pack',
  name: 'Ruins Landmark Pack',
  description:
    'An optional overlay pack that adds seeded ruined landmarks through a standalone tile package.',
  tags: ['builtin', 'overlay', 'tile', 'landmark', 'ruins'],
};

export function createRuinsContentPackDefinition(): PluginPackDefinitionLike {
  return definePluginPack(ruinsContentPackManifest, createRuinsContentPack);
}
