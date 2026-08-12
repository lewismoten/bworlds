# World Generation Plugin Architecture

## Plugin Contract

- [ ] Define one world generation layer plugin interface.
- [ ] Give every plugin a stable ID and execution order.
- [ ] Give every plugin declared input dependencies.
- [ ] Give every plugin declared output records.
- [ ] Keep plugins deterministic from explicit inputs.
- [ ] Keep renderer and UI code out of generation plugins.
- [ ] Keep gameplay callbacks out of frozen world records.

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

- [ ] Query generated features by world bounds.
- [ ] Query generated features by chunk bounds.
- [ ] Query features by type and plugin owner.
- [ ] Query features by zoom relevance.
- [ ] Return coarse summaries without fine detail.
- [ ] Cache regional summaries by world revision.

## Debugging

- [ ] Show which plugin created a selected feature.
- [ ] Show which plugin changed a selected height sample.
- [ ] Show plugin execution timings by region.
- [ ] Toggle selected generation layers in debug views.

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
- That same runner now also summarizes matching regional records by
  `pluginId` and `recordType`, which gives future chunk-bounds and world-bounds
  debug panels one shared count-oriented query path without pulling renderer
  logic into the generation layer contracts.
- See `packages/plugin-api/docs/world-generation-layer-plugins.md` for the
  intended contract and why it is kept separate from the runtime content
  plugin registry.
