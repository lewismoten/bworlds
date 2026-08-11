# Dock Survey Caching

`@bworlds/dock-route-support` keeps a per-state survey cache for dock-cluster
discovery so repeated route and placement queries do not rescan every dock tile
inside the same search window.

Current behavior:

- surveyed dock rows are tracked as numeric ranges per `y` coordinate
- discovered dock clusters are cached by anchor key for reuse across route
  resolution and placement queries
- tile-to-cluster membership now lives in a numeric coordinate cache instead of
  allocating temporary `${x}:${y}` lookup keys during repeated dock scans
- local flood-fill and ocean-path searches now use coordinate caches for visited
  and blocked tile tracking where the lookup only depends on `x` and `y`

This keeps the existing public API and deterministic route behavior while
trimming hot-path temporary string allocation in dock-cluster discovery and
water-route search.
