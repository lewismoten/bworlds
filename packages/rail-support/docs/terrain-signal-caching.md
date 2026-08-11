# Rail Terrain Signal Caching

`@bworlds/rail-support` now memoizes terrain reads for the lifetime of one
`buildRailConnections(...)` pass.

Current behavior:

- `buildRailConnections(...)` wraps the provided `sampleTerrainSignals(...)`
  with a small coordinate cache before it validates candidate rail curves.
- Overlapping sampled rail paths now reuse the same terrain result for the same
  coordinate instead of asking the terrain sampler again.
- The cache stays local to one connection-build pass, so it preserves the
  existing API and determinism while trimming repeated terrain lookups in the
  rail overlay generation path.

This complements the earlier `runtime-rail-network` cache-layer cleanup by
reducing work in the shared support package instead of adding another runtime
cache on top.
