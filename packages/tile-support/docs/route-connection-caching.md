# Route Connection Caching

`@bworlds/tile-support` now caches reusable route-connection segments for
`hasConnectedRoutePath(...)` when the same town and bridge anchor arrays are
queried repeatedly.

Current behavior:

- `resolveConnectedRouteSegments(...)` precomputes eligible town-pair segments
  plus the nearest eligible bridge segment for each town anchor.
- Each segment carries an expanded axis-aligned bounds box based on its path
  tolerance.
- `hasConnectedRoutePath(...)` uses those bounds to reject distant points
  before it falls back to `distanceToLineSegment(...)`.
- The cache is keyed by the town-anchor array, bridge-anchor array, and the
  active route-distance/tolerance options, so repeated route classification and
  roadside-profile scans reuse the same segment metadata.

This complements the existing terrain-signal and route-presence caching in
`createRoadsideRouteProfile(...)` and directly supports the route-calculation
reduction work tracked in `docs/todo/errors.md`. `tile-route` now also reuses
the final `createConnectedRoutePathResolver(...)` result across repeated
classifications that share the same anchor arrays, so nearby route scans avoid
rebuilding the point-query layer on top of these cached segments.
