# Debug Snapshot Performance Tier

The live debug snapshot and exported debug snapshot now derive
`performanceTier` from the highest active render-budget severity instead of
only looking at frame time.

Current tier inputs:

- frame-time budget status
- visibility-radius budget status
- pending build budget status
- pending build tile count status
- estimated GPU memory budget status

Tier rules:

- any `critical` limit forces `performanceTier = critical`
- otherwise any `warning` limit forces `performanceTier = reduced`
- otherwise the tier remains `healthy`

Budget-direction notes:

- `frameMs` and `estimatedGpuMemoryBytes` are higher-is-worse metrics
- `visibilityRadius`, `pendingBuildBudgetMs`, and `pendingBuildTiles` are
  lower-is-worse metrics
- lower-is-worse metrics validate their threshold ordering before export so the
  snapshot fails fast if a soft limit is accidentally lower than a hard limit

`pendingBuildBudgetMs` now uses an explicit soft limit instead of treating the
absolute maximum budget as the warning line. The soft limit matches the steady
state scheduler budget at the current target FPS, which prevents a normal 60
FPS frame budget from being mislabeled as degraded.

This prevents the debug panel or exported snapshot from claiming the renderer
is healthy while a tracked resource limit is already in a critical state.
