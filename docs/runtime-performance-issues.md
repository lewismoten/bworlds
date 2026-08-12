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

Recent mitigation work:

- `tile-route` bridge appearances now share textured material sets by bridge
  region and style type instead of creating a fresh textured material bundle
  for every bridge cluster. Bridge layout jitter still varies per bridge, but
  nearby bridges no longer inflate scene-unique material counts just to change
  local geometry.
- `tile-town` full-detail building styles now resolve through a bounded shared
  palette and texture-pattern set instead of painting a separate wall and roof
  texture for every town region. Town placement and building geometry still vary
  by tile, but compatible regions now reuse the same material bundles.
- `tile-sign` now resolves sign dimensions and core placard/post materials from
  a bounded shared regional variant set instead of generating a distinct sign
  style for every region coordinate. Sign text textures still vary by message,
  but the underlying material set is now reused across compatible regions.
- `tile-lighthouse` now separates lighthouse appearance sharing from per-region
  sweep timing. Regions still keep their own rotation speed and direction, but
  matching beam and pane color combinations now reuse one shared emissive
  material bundle instead of recreating identical lighthouse appearance
  materials for every region.
- `tile-route` road surfaces now resolve through bounded shared painted style
  variants instead of painting a fresh road and shoulder texture pair for every
  road region. Road layout still varies by tile, but repeated footpath/cobble/
  brick style combinations now reuse the same material bundle across regions.
- `tile-forest` now resolves full-detail broadleaf tree materials through one
  shared host-level family bundle instead of keeping separate oak and birch
  material sets. Broadleaf geometry and tree state still vary per tree, but
  compatible nearby species stop duplicating trunk, foliage, and accessory
  materials just to swap between the two broadleaf species.
- `render3d` now disposes tracked world-root child materials before clearing
  the visible world on context resets. That closes the gap where route or
  world changes could leave hundreds of detached tile materials counted in the
  scene after `visibleTileCount` had already dropped to zero.
- `render3d` floor and water surfaces now share one atlas-backed floor
  material instead of cloning one textured `MeshStandardMaterial` per tile
  sprite variant. Variant selection now lives in cached per-geometry UV
  remaps, which reduces scene material churn without flattening the visible
  floor art variety.
- `tile-forest` birds now collapse into three animated instanced sets per
  tile instead of one group plus three child meshes per bird. Bird motion is
  still updated every frame, but the repeated wing/body draw calls and object
  nodes now scale with three instanced meshes instead of three meshes per
  inhabitant.
- `tile-forest` landmark rings now reuse shared host geometry for their stone
  and mushroom pieces instead of recreating identical sphere/cylinder geometry
  objects on every landmark tile build. That reduces repeated geometry churn
  in the same visible forest cluster without changing landmark placement.
- `render3d` now freezes each static visible tile root group as soon as its
  build shell is created, instead of leaving one always-static container per
  tile on `matrixAutoUpdate`. Dynamic descendants still opt back in through
  their existing responder tags, but plain floor-only tiles and other static
  tile roots stop contributing avoidable per-frame matrix churn.

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
