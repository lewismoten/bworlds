# Route Classification Caching

`tile-route` now wraps `sampleTerrainSignals(...)` in a per-classification
coordinate cache before running dock, road, bridge, and forest-log-bridge
classification helpers.

This is intentionally local to a single `classifyOverworldTile(...)` call:

- repeated neighbor reads inside one route classification reuse cached signals
- different tile classifications still stay isolated from each other
- behavior stays deterministic because the cache only memoizes pure sampler
  results for the same coordinates

This reduces repeated terrain reads in hot bridge and route classification
paths without changing the external plugin API.
