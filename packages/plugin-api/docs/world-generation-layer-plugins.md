# World Generation Layer Plugins

`@bworlds/plugin-api` now exposes a dedicated contract for deterministic world
generation layers:

- `WorldGenerationLayerPlugin`
- `WorldGenerationLayerContext`
- `WorldGenerationLayerDependency`
- `WorldGenerationLayerOutputRecord`
- `WorldGenerationFeatureRecordLike`
- `createWorldGenerationLayerPlugin(...)`
- `sortWorldGenerationLayerPlugins(...)`
- `createWorldGenerationDependencyKey(...)`
- `createWorldGenerationRegionRunner(...)`

This contract is separate from the runtime tile and map plugin registry. It is
intended for frozen world-data passes such as:

- continent uplift
- mountain detail
- river carving
- climate and biome regions
- vegetation regions
- settlements
- borders
- naming

## Why This Exists

The world-gen roadmap needs every generation layer to declare:

- a stable plugin id
- execution order
- declared input dependencies
- declared output record types
- deterministic behavior from explicit inputs

The runtime tile plugin system already solves content composition, but those
plugins are renderer-aware and tile-oriented. World generation layers need a
different contract because they produce frozen regional records rather than
live tile callbacks.

## Contract Shape

Each layer declares:

- `id`: stable plugin id used for dependency wiring and debug attribution
- `order`: optional `priority`, `after`, and `before` constraints
- `inputDependencies`: declared upstream record requirements
- `outputRecords`: declared record types the layer emits
- `run(context)`: deterministic region build for one explicit bounds request

The build context includes:

- `seed`
- `worldRevision`
- `bounds`
- `queryRecords(dependency)`

This keeps renderer and UI code out of generation plugins while still giving
later pipelines one explicit way to ask for upstream data by plugin id and
record type.

## Region Runner

`createWorldGenerationRegionRunner(...)` now provides one reusable execution
and query helper for these layer plugins:

- runs layers in deterministic sorted order
- exposes upstream records to later layers through `queryRecords(...)`
- exposes explicit chunk-scoped queries through `queryChunkRecords(...)`
- normalizes plugin ownership onto emitted records
- exposes a stable declared-layer catalog through `declaredLayers`
- resolves selected records directly through `getRecordById(...)`
- filters records by bounds, plugin id, record type, and zoom relevance
- summarizes matching records by `pluginId` and `recordType`
- exposes chunk-scoped summaries through `summarizeChunkRecords(...)`
- reports per-plugin `durationMs` and `recordCount` through `pluginTimings`
- caches repeated region runs by seed, world revision, bounds, and plugin set

This gives worldgen packages one concrete regional-query path before the
higher-level continent, hydrology, climate, settlement, and naming pipelines
exist.

## Regional Queries

`createWorldGenerationDependencyKey(...)` gives future caches and summaries one
stable dependency key based on `pluginId:recordType`. That is the intended key
shape for:

- chunk-bounds summaries
- world-bounds summaries
- zoom-relevant feature subsets
- per-plugin debug filtering

`createWorldGenerationChunkBounds(...)` gives those chunk-bounds queries one
shared inclusive chunk-to-world conversion so negative chunk coordinates and
non-square chunk dimensions stay deterministic across callers.

The region runner uses those same dependency keys internally when wiring
upstream records into later layers, so query behavior stays aligned with the
declared dependency contract.

## Ordering

`sortWorldGenerationLayerPlugins(...)` applies the same style of deterministic
ordering used elsewhere in the plugin API:

- lower `priority` runs earlier
- `after` constraints delay a layer until its named predecessors
- `before` constraints place a layer ahead of named successors
- ties fall back to registration order

This is enough to model the roadmap's intended progression without forcing the
full execution engine into the same step.
