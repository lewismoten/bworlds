# River Path Bounds

`@bworlds/overworld-support` now caches one axis-aligned bounds object per
river curve or fork path array and uses that bounds check before walking
segment distances.

Current behavior:

- `resolveRiverPathBounds(...)` memoizes the min/max extents for a sampled
  river path or raw control-point path in a `WeakMap`.
- `canRiverPathAffectPoint(...)` expands those bounds by the river falloff
  radius and rejects obviously distant tiles before any segment-distance math
  runs.
- `getRiverControlPathSignalAtPoint(...)` and the sampled-path signal helper
  both use that early-out, so the terrain sampler skips most off-path scans
  while preserving the same deterministic signal values for nearby tiles.

This is a small but hot optimization in the shared river-generation path, and
it directly supports the broader `docs/todo/errors.md` work to consolidate
river and route calculations.
