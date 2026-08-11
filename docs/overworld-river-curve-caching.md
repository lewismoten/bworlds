# Overworld River Curve Caching

`createOverworldTerrainSignalSampler(...)` now keeps a per-cell cache of sampled
river curve points in addition to the existing control-point and fork-path
caches.

This matters because terrain sampling runs frequently during overworld
generation, route classification, rail resolution, and nearby-anchor work. The
main river path used to rebuild its sampled bezier segments on each terrain
lookup even when the same control cell had already been visited.

Current cache layers for river path sampling:

- control points are cached per river control cell
- sampled main-channel curve points are cached per river control cell
- sampled fork paths are cached per river control cell

That keeps river signal sampling deterministic while avoiding repeated bezier
materialization during hot generation paths.
