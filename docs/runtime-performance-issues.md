# Runtime Performance Issues

Runtime performance issues now live in `.runtime-performance-issues/` at the
repository root. The directory is ignored by Git and is intended only for local
runtime triage.

The browser keeps posting the existing runtime performance snapshots for
startup and region-change checkpoints. It now also posts a separate throttled
issue report when live rendering diagnostics detect an active problem during
play.

Issue reports are throttled by stable issue hash for five seconds so repeated
frame stalls or budget rejections do not thrash the local endpoint.

Captured issue reports currently include:

- the issue timestamp, route, world seed, and world context
- the nested runtime performance snapshot with hard-limit violations
- current render tier, quality limiters, target FPS, visibility radius, and
  pending tile count
- how long the current reduced-quality streak has persisted
- an explicit visibility-radius reduction consequence when draw distance has
  already been lowered below the full-radius target
- measured quality-limiter details plus the limiter that triggered the latest
  graphics-quality downgrade
- recent plugin warnings that suggest repeated meshes should be instanced
- scene-unique material owners by plugin, separate from the existing per-tile
  material-pressure summary
- top plugin hotspots for instanced meshes, rendered instances, materials,
  draw calls, objects, meshes, LOD swaps, fallback boxes, rejected models,
  and static matrix updates
- current tile LOD/fallback details and renderer resource warnings

The Vite dev server now exposes `/api/runtime-performance-issues`:

- `POST` saves one issue report file
- `GET` lists the most recent saved issue reports first

Tests:

- [runtime-performance-tracking.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/runtime-performance-tracking.test.ts:1)
  covers issue-report creation, healthy-scene suppression, endpoint posting,
  and duplicate throttling.
- [runtime-performance-snapshot-store.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/runtime-performance-snapshot-store.test.ts:1)
  covers issue-report file naming and retention.
- [runtime-performance-issue-latest.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/runtime-performance-issue-latest.test.ts:1)
  fails when saved local runtime issue reports still exist and prints the
  summaries, plugin hotspots, current-tile context, and latest quality-change
  details that must be cleared after the underlying regression is fixed.
