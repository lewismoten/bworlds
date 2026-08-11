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
- When a tile plugin uses `create3DModelProgressive(...)`, the renderer keeps
  one unfinished build active, resumes it on later frames, and keeps that tile
  key out of the pending queue until the build completes or falls out of
  visibility.
- The first visible frame is forced into a minimal progressive mode through
  `getEffectivePendingWorldBuildBudget()`, which drops the initial flush to a
  single tile when the queue is still cold.
- Near tiles can stay full-detail while farther queued tiles fall back to low
  detail through `getPendingWorldBuildDetailLevel(...)`.
- Visible-tile LOD reevaluation now also respects the shared frame budget:
  `syncTileModelDetailLevels()` can keep ordinary tiles on low detail when the
  remaining frame budget is nearly exhausted, while protected landmark and
  route-terminal tiles still keep their longer full-detail window.
- Visible-tile LOD reevaluation keeps the existing model in place when a
  replacement build cannot produce a real `modelRoot`, which avoids swapping a
  valid model for a shell-only fallback during ordinary LOD churn.
- When a visible tile tries to upgrade back to full detail and that build
  cannot produce a real model, `syncTileModelDetailLevels()` now retries the
  same tile at low detail before it allows any shell-only fallback through.
- Shell-only fallback boxes are now logged as dedicated debug events with the
  tile key and the best available failure reason, so fallback churn is visible
  in the renderer diagnostics instead of being inferred indirectly.

This is the current mechanism behind progressive loading in the renderer. It
does not yet move deterministic world generation into workers, but it does keep
one frame from stalling on an all-at-once visible-world rebuild.
