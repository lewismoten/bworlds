# Overworld Tile Composition Caching

`@bworlds/overworld-support` now caches fully composed overworld tiles for
repeated generation requests that share the same plugin registry, terrain
sampler, world-state revision, seed, coordinates, and starting tile kind.

Current behavior:

- `createOverworldGenerationContext(...)` still caches the shared generation
  snapshot for signals, placement chances, and nearby anchors.
- `composeOverworldTileFromPlugins(...)` now layers a second cache on top of
  that snapshot so repeated composition of the same tile does not rerun
  `classifyTerrainTile(...)`, `classifyOverworldTile(...)`, and
  `decorateOverworldTile(...)`.
- The composed-tile cache only applies when the starting tile is the default
  path or a simple `{ kind }` tile, which matches current production call
  sites in `map-overworld` and `watercraft-support`.
- Richer custom `initialTile` payloads still bypass the composed-tile cache so
  composition stays correct without needing a broad tile serializer.

This keeps the cache small and safe while removing repeated terrain
classification work from the overworld generation path.
