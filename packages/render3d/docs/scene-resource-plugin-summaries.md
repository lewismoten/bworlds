# Scene Resource Plugin Summaries

The renderer now derives some debug snapshot plugin summaries from the
already-built visible tile nodes instead of rescanning every descendant
`Object3D` for plugin ownership.

## Why

`collectSceneResourceStats(...)` is still the authoritative whole-scene counter
for totals like:

- `matrixAutoUpdateCount`
- `staticMatrixAutoUpdateCount`
- `object3dCount`
- `meshCount`

But the scene graph itself does not carry stable per-plugin ownership metadata
on every descendant node. The visible tile map already knows which plugin owns
each tile build, and each finalized `DynamicTileNode` now carries the
tile-local counts needed for snapshot triage:

- `object3dCount`
- `visibleMeshCount`
- `materialCount`
- `drawCallCount`
- `staticMatrixAutoUpdateCount`

That makes the plugin summary path cheap and deterministic:

1. Build or rebuild a visible tile node.
2. Capture its tile-local scene-resource counts once.
3. Aggregate those per-tile counts by `tilePluginOwnerLabel` when exporting
   renderer stats.

## Current coverage

The renderer now exposes top-plugin summaries for:

- visible tile Object3D counts
- visible tile mesh counts
- visible tile material counts
- visible tile draw calls
- static matrix updates

- `objectTopPluginLabel`
- `objectSummary`
- `meshTopPluginLabel`
- `meshSummary`
- `materialTopPluginLabel`
- `materialSummary`
- `drawCallTopPluginLabel`
- `drawCallSummary`
- `staticMatrixUpdateTopPluginLabel`
- `staticMatrixUpdateSummary`

Those values flow into the web debug snapshot export and debug panel so the
performance follow-up work can identify which visible tile plugins dominate
scene graph size, mesh density, material churn, draw-call pressure, and which
ones keep the largest number of static transforms on `matrixAutoUpdate = true`.

## Tradeoff

This summary is intentionally tile-scoped. It attributes static matrix updates
to the owning visible tile plugin, which is the right level for current
snapshot triage, without requiring every child node in the scene graph to carry
duplicated ownership tags.
