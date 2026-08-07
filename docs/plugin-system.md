# Plugin System

The plugin system is intentionally lightweight in the bootstrap so package boundaries stay simple.

## Registry

`@bworlds/plugin-api` exports `PluginRegistry`, which stores plugin objects and invokes named hooks in registration order.

## Supported hooks

- `decorateOverworldTile`
- `decorateTownTile`
- `decorateBuildingTile`
- `decorateDepthTile`

Each hook receives a mutable payload with the current tile draft, context, coordinates, and seed data.

## Why this shape

- It keeps the generation pipeline open for extension.
- It avoids hard-coding every world feature in one generator file.
- It lets future packages contribute biome rules, POIs, encounters, and content packs independently.

## Growth path

As the project expands, this can evolve into:

1. Package-discovered plugins with manifests
2. Feature flags and dependency ordering
3. Runtime-safe plugin sandboxes
4. Saved-world mutation hooks for quests and settlements
