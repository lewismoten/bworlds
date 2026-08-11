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
- `create3DRenderer()` now remembers the last successful visible detail level
  for each tile key and uses that cached level as a pending-build hint, so a
  tile that last succeeded on low detail can come back quickly before it tries
  to climb back to full detail again.
- Visible tiles that are currently showing only a shell fallback are now
  allowed back into `syncTileModelDetailLevels()` even when the requested
  detail level has not changed, so those fallback-only entries can retry a real
  build instead of getting stuck permanently.
- When visible LOD recovery already knows the last successful tile detail was
  `low`, it now retries that cached low-detail path before spending work on
  another full-detail rebuild attempt.
- Visible LOD recovery now also records the attempted detail chain when a retry
  still ends without a real model, and each attempted step can now carry its
  own fallback reason, so debug output can show whether recovery failed on
  `full`, `low`, or a cached `low -> full` sequence and why each step failed.
- Cached low-detail recovery no longer retries the same `low` build twice in a
  single visible recovery chain; once cached `low` has already failed, the
  helper falls through to the requested `full` result instead of rebuilding the
  same low-detail fallback again.
- Render churn stats now count successful lower-LOD visible recoveries
  separately from ordinary LOD replacements, so recovery activity can be
  measured directly in the debug stats.
- Render churn stats now also count fallback-box appearances directly, so hard
  recovery failures are measurable without scanning the recent debug-event
  stream by hand.

This is the current mechanism behind progressive loading in the renderer. It
does not yet move deterministic world generation into workers, but it does keep
one frame from stalling on an all-at-once visible-world rebuild.
