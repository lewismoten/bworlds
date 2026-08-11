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

This prevents the debug panel or exported snapshot from claiming the renderer
is healthy while a tracked resource limit is already in a critical state.
