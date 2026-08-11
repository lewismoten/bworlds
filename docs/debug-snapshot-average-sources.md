# Debug Snapshot Average Sources

The exported debug snapshot now distinguishes between two different average FPS
views:

- `summary.liveAverageFps` comes from the live render-budget state, which is a
  rolling per-frame average maintained by the frame loop.
- `summary.averageFps` and `summary.averageFrameMs` come from the exported
  debug snapshot history samples.

Those values can differ because they are derived from different sample windows.
That is expected.

Example:

- a live render-budget window can still show about `59 FPS`
- while a sparse exported history sample set can average around `33.3 ms`
- which corresponds to about `30 FPS`

The snapshot now records explicit source labels so that mismatch is visible in
the exported JSON instead of looking like an unexplained contradiction.
