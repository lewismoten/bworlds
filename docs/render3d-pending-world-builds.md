# Render3D Pending World Builds

The 3D renderer does not try to finish every visible-tile build in one pass.
`create3DRenderer()` keeps a nearest-first pending queue and drains it
progressively inside `flushPendingWorldBuild()`.

Current behavior:

- `syncVisibleWorld()` rebuilds the pending queue in visibility order and
  cancels stale entries when the player moves or turns.
- `flushPendingWorldBuild()` computes the remaining shared frame budget before
  it starts work, then keeps building queued tiles while both time and tile
  count budgets remain.
- The first visible frame is forced into a minimal progressive mode through
  `getEffectivePendingWorldBuildBudget()`, which drops the initial flush to a
  single tile when the queue is still cold.
- Near tiles can stay full-detail while farther queued tiles fall back to low
  detail through `getPendingWorldBuildDetailLevel(...)`.

This is the current mechanism behind progressive loading in the renderer. It
does not yet move deterministic world generation into workers, but it does keep
one frame from stalling on an all-at-once visible-world rebuild.
