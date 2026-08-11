# Cave Terrain-Signal Caching

`@bworlds/tile-cave` now wraps each cave-linking classification pass in a
per-call coordinate cache for `sampleTerrainSignals(...)`.

Current behavior:

- `resolveLinkedCaveEntrances(...)` reuses sampled terrain objects while it
  checks overlapping mountain-pass probes between nearby cave entrances.
- The cache is scoped to one overworld classification pass, so cave placement
  still reflects the active seed and terrain sampler without cross-call state.
- This trims repeated terrain reads in the cave generation path while keeping
  cave-system linking rules unchanged.
