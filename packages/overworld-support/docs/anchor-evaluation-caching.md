# Overworld Anchor Evaluation Caching

`@bworlds/overworld-support` now uses a packed bounded cache for default
overworld cell-anchor terrain evaluations.

Current behavior:

- `resolveOverworldCellAnchor(...)`, `collectNearbyOverworldCellAnchors(...)`,
  and `collectNearbyOverworldPoiAnchors(...)` now default to a structured
  evaluation cache instead of a plain string-keyed `Map`.
- The cache packs `spec`, `seed`, `cellX`, and `cellY` into a bounded numeric
  key path, so repeated anchor suitability checks stop rebuilding temporary
  string keys in the hot generation path.
- Existing callers can still pass a legacy `CacheLike<string, ...>` instance
  when they need custom storage behavior.
- `createOverworldAnchorResolver(...)` now uses the same packed cache for its
  shared anchor-evaluation store.

This keeps anchor evaluation reuse bounded while reducing repeated bookkeeping
work inside overlapping conflict and suitability scans.
