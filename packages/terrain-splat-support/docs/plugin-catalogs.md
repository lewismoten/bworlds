# Terrain Splat Plugin Catalogs

`@bworlds/terrain-splat-support/plugin-catalog` merges terrain splat
contributions from multiple plugins into one validated shared catalog set.

## Goals

- let multiple terrain plugins contribute to the same splat layer system
- validate collisions at catalog-build time instead of discovering them during
  chunk generation
- preserve ownership metadata so diagnostics can point back to the plugin that
  registered a layer, family, or terrain kind

## Main API

- `createTerrainSplatPluginCatalog(...)`

## Model

- each plugin contributes a `pluginId` plus optional layer, family, and kind
  definitions
- layer, family, and terrain-kind ids must remain unique across all plugins
- family and kind validation still runs through the shared layer/family
  catalogs, so cross-plugin references stay explicit and checked
