# Rail Runtime Cache Layering

`runtime-rail-network` no longer keeps its own per-tile cache for
`resolveOverworldTile(...)`.

The cache layering now stays in `@bworlds/rail-support`:

- rail region snapshots cache station scans, connections, and resolved rail
  tiles per region
- train placements cache animated traffic per region and time bucket

The runtime plugin now delegates directly to those shared caches instead of
adding a second tile-local memoization layer on top.
