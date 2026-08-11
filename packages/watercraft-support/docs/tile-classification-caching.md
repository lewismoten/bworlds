# Watercraft Tile Classification Caching

`@bworlds/watercraft-support` now routes watercraft navigation and landing
searches through the same cached overworld tile sampler used by `getTile(...)`.

Current behavior:

- `canWalk(...)` now reuses the map-local tile cache instead of calling the
  uncached global overworld classifier directly.
- `getExit(...)` now does the same for landing and relaunch searches, so
  repeated watercraft exit checks stop reclassifying the same overworld tiles.
- The cache still invalidates on `overworldTileRevision`, so player-built or
  runtime-overridden overworld tiles remain fresh.
