# World Generation Plugin Architecture

## Plugin Contract

- [x] Define one world generation layer plugin interface.
- [x] Give every plugin a stable ID and execution order.
- [x] Give every plugin declared input dependencies.
- [x] Give every plugin declared output records.
- [x] Keep plugins deterministic from explicit inputs.
- [x] Keep renderer and UI code out of generation plugins.
- [x] Keep gameplay callbacks out of frozen world records.

## Layer Order

- [ ] Run continent uplift first.
- [ ] Run continental structure second.
- [ ] Run young mountains, old mountains, and hills next.
- [ ] Run volcanoes and volcanic island refinement next.
- [ ] Run canyon, trench, and crater generation next.
- [ ] Run lakes, large rivers, and tributaries next.
- [ ] Run climate and biome generation next.
- [ ] Run vegetation region generation next.
- [ ] Run settlement placement next.
- [ ] Run crossings, bridges, tunnels, roads, and rail next.
- [ ] Run borders after settlements and routes stabilize.
- [ ] Run naming after canonical feature IDs exist.

## Regional Queries

- [x] Query generated features by world bounds.
- [x] Query generated features by chunk bounds.
- [x] Query features by type and plugin owner.
- [x] Query features by zoom relevance.
- [x] Return coarse summaries without fine detail.
- [x] Cache regional summaries by world revision.

## Debugging

- [x] Show which plugin created a selected feature.
- [ ] Show which plugin changed a selected height sample.
- [x] Show plugin execution timings by region.
- [x] Toggle selected generation layers in debug views.

Current support:

- `@bworlds/plugin-api` now exposes one dedicated
  `WorldGenerationLayerPlugin` contract that is separate from runtime tile and
  map plugins, so frozen world-data passes can declare a stable `id`,
  execution `order`, `inputDependencies`, and `outputRecords` without bringing
  renderer or gameplay hooks into the generation layer itself.
- `createWorldGenerationLayerPlugin(...)` now normalizes and validates those
  declarations, rejecting empty ids, malformed dependency keys, and empty
  output-record declarations before later worldgen packages attempt to wire the
  layer into a larger pipeline.
- `sortWorldGenerationLayerPlugins(...)` now provides deterministic
  priority-plus-`after`/`before` ordering for generation layers, which gives
  later worldgen packages one reusable execution-order rule for continent,
  hydrology, climate, vegetation, settlement, border, and naming passes.
- `createWorldGenerationDependencyKey(...)` now gives future regional summary
  caches and debug tooling one stable `pluginId:recordType` key shape for
  querying upstream records by type and plugin owner.
- `createWorldGenerationRegionRunner(...)` now gives those layer plugins one
  concrete deterministic execution path with revision-keyed regional caching,
  upstream dependency queries, and post-run record filtering by bounds, plugin
  owner, record type, and zoom relevance.
- `createWorldGenerationChunkBounds(...)`, `queryChunkRecords(...)`, and
  `summarizeChunkRecords(...)` now make chunk-scoped inspection explicit
  instead of forcing every caller to rebuild inclusive chunk bounds by hand.
- Region-run results now also expose `getRecordById(...)`, which resolves one
  normalized feature record directly from its stable id so debug panels can
  show the owning `pluginId` for the currently selected feature without
  rescanning the full region.
- Region-run results now also expose one `declaredLayers` catalog derived from
  plugin declarations, including each layer's `pluginId`, `recordType`,
  optional description, and current `recordCount`, so debug views can render
  stable layer toggles even when a declared layer emits zero records.
- Region-run results now also expose one `pluginTimings` list with
  `pluginId`, `durationMs`, and `recordCount` per layer, so debug panels can
  attribute regional generation cost before a renderer-specific inspector
  exists.
- That same runner now also summarizes matching regional records by
  `pluginId` and `recordType`, which gives future chunk-bounds and world-bounds
  debug panels one shared count-oriented query path without pulling renderer
  logic into the generation layer contracts.
- See `packages/plugin-api/docs/world-generation-layer-plugins.md` for the
  intended contract and why it is kept separate from the runtime content
  plugin registry.
