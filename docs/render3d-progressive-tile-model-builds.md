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

This is the typed scheduler seam for the `errors.md` frame-stall work.
Renderer-level pending-build resumption still needs to be wired to these
helpers so one unfinished plugin build can continue across later frames.
