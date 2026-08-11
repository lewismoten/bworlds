# Route Classification Caching

`tile-route` now wraps `sampleTerrainSignals(...)` in a per-classification
coordinate cache before running dock, road, bridge, and forest-log-bridge
classification helpers, and it reuses dock-footprint scans across repeated
route classifications that share the same raw terrain sampler and `poiAnchors`
array.

The sampler cache is intentionally local to a single
`classifyOverworldTile(...)` call:

- repeated neighbor reads inside one route classification reuse cached signals
- different tile classifications still stay isolated from each other
- behavior stays deterministic because the cache only memoizes pure sampler
  results for the same coordinates

The dock-footprint cache is intentionally a little broader:

- repeated nearby dock classifications can reuse one resolved dock footprint
- the shared result only keys off the original terrain sampler identity and the
  `poiAnchors` array identity
- behavior stays deterministic because the cache only memoizes pure coastline
  geometry and does not mutate anchors or sampled signals

This reduces repeated terrain reads in hot bridge and route classification
paths without changing the external plugin API.
