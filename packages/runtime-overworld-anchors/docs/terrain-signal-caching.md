# Runtime Overworld Anchor Terrain-Signal Caching

`@bworlds/runtime-overworld-anchors` now wraps each
`resolveOverworldAnchors(...)` call in a per-resolution coordinate cache for
`sampleTerrainSignals(...)`.

Current behavior:

- Nearby mountain, forest, ocean, land-neighbor, and summit-cluster checks now
  reuse the same sampled terrain object when overlapping anchor suitability
  scans touch the same coordinates.
- The cache is scoped to one resolver call, so there is no stale cross-call
  state when the world seed, state, or sampler changes.
- This reduces duplicate terrain reads in the deterministic overworld anchor
  generation path without changing anchor placement rules.
