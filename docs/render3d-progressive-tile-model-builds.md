# Render3D Progressive Tile Model Builds

`@bworlds/plugin-api` now exposes an optional
`tilePlugin.create3DModelProgressive(context)` hook for heavy 3D tile models.

Current groundwork:

- Progressive builders yield `completedSteps`, optional `totalSteps`, and an
  optional `label`.
- `createTilePluginModelFromCostEstimate(...)` now starts a progressive build
  without forcing the final Three.js object to exist immediately.
- `resumeProgressiveTileModelBuild(...)` advances the generator one or more
  steps and returns either the latest progress yield or the completed model.
- `resumeProgressiveTileModelBuildWithinBudget(...)` lets the renderer consume
  multiple yielded steps from the same active build while the current
  pending-world-build flush still has budget remaining.
- `tile-lighthouse` now uses the hook for its full-detail 3D model, yielding
  after `base-and-tower`, `crown-and-lantern`, lantern framing,
  balcony/window, and beam/beacon passes while still keeping
  `create3DModel()` aligned by exhausting the same generator synchronously.
- `tile-dungeon`, `tile-cave`, `tile-town`, `tile-sign`,
  `tile-observatory`, `tile-tower`, `tile-station`, `tile-ship`,
  `tile-quarry`, `tile-ruins`, `tile-forest`, `tile-mountain`,
  `tile-water`, and the `tile-route` dock renderer now follow the same pattern
  for their heavier landmark builds, each yielding coarse structural phases
  before returning the final Three.js object.
- `tile-forest` now splits its full-detail tree construction into two
  resumable batches before close-detail passes, which reduces how much work can
  hide behind the first progressive yield, and now also splits the remaining
  close-detail pass into separate `understory-and-wildlife` and
  `landmarks-and-floor` phases so meadow flowers, birds, spiders, trail props,
  and floor clutter no longer share one large scheduler step.
- `tile-town` now splits its full-detail building population into two
  resumable batches before signage, banners, and light passes, and now splits
  the remaining building population into a third resumable batch so one large
  structure loop does not dominate the first progressive step or the follow-up
  population pass.
- `tile-dungeon` now splits tower population, gate assembly, the gate beacon,
  and the tower beacon pass into separate resumable steps, which gives the
  renderer additional frame boundaries before the banner pass.

This is the typed scheduler seam for the `errors.md` frame-stall work. The
renderer now keeps one unfinished plugin build alive across frames and resumes
as many yielded steps as fit inside the current flush budget, but additional
tile plugins still need to adopt `create3DModelProgressive(...)` before their
heavier loops benefit from the same scheduling.
