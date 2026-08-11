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
  after the tower shell, lantern framing, balcony/window pass, and beam/beacon
  pass while still keeping `create3DModel()` aligned by exhausting the same
  generator synchronously.
- `tile-dungeon`, `tile-cave`, `tile-town`, `tile-sign`,
  `tile-observatory`, `tile-tower`, `tile-station`, `tile-ship`,
  `tile-quarry`, `tile-ruins`, and `tile-forest` now follow the same pattern
  for their heavier landmark builds, each yielding coarse structural phases
  before returning the final Three.js object.

This is the typed scheduler seam for the `errors.md` frame-stall work. The
renderer now keeps one unfinished plugin build alive across frames and resumes
as many yielded steps as fit inside the current flush budget, but additional
tile plugins still need to adopt `create3DModelProgressive(...)` before their
heavier loops benefit from the same scheduling.
