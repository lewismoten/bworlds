# Performance Snapshot Follow-Up

- [x] consider improving the runtime-performance-snapshots API - mainly adding an additional API to report when rendering issues occur, but limited to a few seconds so that we don't have thrasing. The goal is to have that separate API to report important issues rarely that need to be addressed, and build a failing test when an issue is reported - ie what plugins, parameters, etc. was failing along with budget and reason.
      Progress: the client-side issue reporter now only posts direct,
      actionable tile/plugin/runtime diagnostics to
      `/api/runtime-performance-issues`; generic frame/draw-call/material/
      object pressure and reduced-quality limiter narration stay in the saved
      payload context without creating another issue file on their own, and
      wrapped `Latest LOD failure` / `Latest fallback reason` strings are now
      also suppressed when they only restate generic budget-threshold pressure
      such as `tile drawCallCount 21>17` or
      `plugin unique materialCount 13>12`.
- [x] Limit each tree species to 10 material variants per part type.
- [x] Reuse bark, foliage, and branch materials across nearby trees.
- [ ] Prefer tinting shared materials over creating new textures.
- [ ] Use color shifts to distinguish related tree species.
- [ ] Avoid unique textures when color variation is sufficient.
- [x] Share material variants between compatible tree species.
      Progress: `tile-forest` now resolves full-detail broadleaf materials
      through one shared host-level family bundle, so oak and birch nearby on
      the same renderer reuse the same trunk, foliage, and close-detail
      materials instead of maintaining separate species-level bundles, and
      forest landmark, wildlife, meadow, breadcrumb, and bird accessory
      materials now resolve through one host-level shared bundle instead of
      maintaining separate broadleaf-versus-conifer duplicates for those
      non-structural props, and low-detail forest tree instances now reuse one
      shared trunk material plus the existing family foliage materials so mixed
      broadleaf-and-conifer recovery tiles stay inside the low-detail material
      budget instead of reaching four unique tree materials during LOD
      recovery, and several full-detail forest accessory accents now reuse one
      shared field, stem, light-accent, or dark-wildlife material instead of
      paying separate material instances for visually similar meadow stems,
      breadcrumb markers, owl eyes, bird bodies, spiders, and flower accent
      colors, and forest fireflies now stay disabled outside full-quality
      close-detail rendering so reduced/minimal forest scenes do not pay one
      extra `PointsMaterial` that pushes the visible forest plugin material
      budget from `12` to `13`, and the forest regression tests now verify
      that sampled oak, birch, and pine full-detail tiles each stay at one
      trunk/branch material plus one foliage material, with oak and birch
      explicitly sharing the same broadleaf material pair, and a nearby-tile
      regression test now verifies that neighboring oak and birch forest tiles
      on one host reuse the same broadleaf bark/branch material and foliage
      material instead of allocating duplicate near-identical variants.
- [ ] Extend with plugin-event-channel-system.md

## Fix Measurement Problems First

- [x] Verify average FPS agrees with average frame duration.
- [x] Verify p50, p95, and p99 use enough frame samples.
- [x] Do not report every percentile from one frame sample.
- [x] Record a longer frame history before exporting snapshots.
- [x] Explain why 59 FPS reports a 33.3 ms average frame.
- [x] Do not report performance as healthy with critical limits.
- [x] Derive performance tier from all active budget limits.
- [x] Validate soft and hard threshold ordering by metric type.
- [x] Document whether higher or lower values are better.
- [x] Add tests for inverted lower-is-worse limits.

## Material Count

- [ ] Investigate why the scene has 467 unique materials.
- [x] Find which plugins create the most materials.
- [x] Report unique material count by plugin.
- [x] Report scene-unique material owners by plugin.
- [x] Report cloned material count by plugin.
- [ ] Reuse shared materials instead of cloning them.
- [ ] Cache materials by their effective property values.
      Progress: `tile-route` now caches dock route sign label materials per
      Three host and per effective label content instead of allocating a fresh
      `MeshBasicMaterial` for every reused boat/stop label plane, so repeated
      dock-route signs can share the same painted label material whenever the
      texture and render-state values match, and `tile-town` now applies the
      same per-host, per-label material caching to town name sign faces so
      repeated front/back placard labels reuse one `MeshBasicMaterial` instead
      of paying a fresh material allocation for each repeated town sign build,
      and `tile-dungeon` now reuses one shared host-level gate-bar texture and
      material across all dungeon regions because that barred-gate surface does
      not vary by region or quality.
- [ ] Avoid cloning materials only to change unused values.
- [x] Share SpriteMaterial instances where possible.
      Progress: the ambient night-sky star field already uses `THREE.Sprite`
      nodes for distant stars, and `render3d` now reuses one shared
      `SpriteMaterial` across the full 360-star field instead of allocating a
      unique material per star. That removes roughly 359 avoidable scene-unique
      material references from the persistent sky layer while keeping the
      per-star brightness variation through sprite scale, and the
      constellation, aurora, and celestial-event sky layers now also reuse
      shared line, sprite, and additive-ribbon materials by compatible
      color/opacity buckets instead of allocating a fresh material per visible
      star, connection, ribbon, rib, or comet tail.
- [x] Report material cache hit and miss counts.
      Progress: `render3d` now tracks cumulative material cache reuse across
      the persistent shared sky/event material buckets and exposes hit, miss,
      and hit-rate counters through the live debug snapshot plus exported
      diagnostics payloads, so runtime captures can distinguish poor material
      reuse from unavoidable live material ownership.
- [ ] Fail tests when material counts regress sharply.
      Progress: route dock labels, town sign labels, and dungeon gate bars now
      have repeated-build regression tests that fail if those paths start
      allocating extra unique materials on the same Three host.

## Instancing

- [ ] Investigate why no visible InstancedMesh objects are found.
- [ ] Verify instanced models survive the tile build pipeline.
- [ ] Verify LOD conversion does not replace instanced models.
- [x] Report InstancedMesh counts by tile plugin.
- [x] Report rendered instance counts by tile plugin.
- [x] Add a test scene that must contain visible instances.
- [x] Warn when repeated meshes exist but no instances exist.

## Scene Graph

- [ ] Remove unnecessary one-child groups from scene models.
- [ ] Investigate the 106 groups containing only one child.
- [x] Report one-child group counts by plugin.
- [ ] Flatten groups that provide no transform or semantic value.
      Progress: `tile-forest` now places each full-detail tree's branch,
      foliage, bark-damage, and historical-marker instance sets directly under
      the tile root instead of a dedicated wrapper group per tree, preserving
      the same transforms and metadata on the instanced children while trimming
      one avoidable `Group` from every full-detail tree.
- [ ] Investigate the 656 static objects using matrix auto-update.
- [ ] Disable matrix auto-update for truly static objects.
      Progress: `render3d` now freezes each visible tile root group at build
      creation time, so floor-only plains tiles and other static tile
      containers stop contributing one avoidable `matrixAutoUpdate` traversal
      per visible tile while dynamic descendants still keep their responder-
      flagged transforms live.
- [x] Report static matrix updates by plugin.
- [ ] Reduce total Object3D count without changing visuals.
      Progress: low-detail `tile-forest` tiles now collapse every trunk into
      one shared instanced mesh per tile instead of splitting trunks by tree
      form. Mixed low-detail forest tiles still keep separate canopy buckets so
      pine silhouettes remain recognizable, but they no longer pay an extra
      low-detail trunk container for each form present in the tile, and
      `tile-plains` now defers to the renderer's shared visible floor mesh
      instead of stacking a second plugin-owned plains plane on top of every
      visible plains tile, and visible shared-floor plains tiles now also skip
      the hidden plugin sentinel group because `render3d` treats those entries
      as tiles that do not support plugin models instead of retrying `full ->
low` visible recovery, and `render3d` now batches simple visible plains floors by
      atlas variant into one shared instanced layer instead of one box mesh per
      visible plains tile, which dropped the live `tile-plains` draw-call
      ownership from `1053` to `15` in the August 12, 2026 runtime issue
      snapshots and moved the top draw-call hotspot back to `tile-forest`, and
      full-detail `tile-forest` now batches branch and foliage instance sets
      tile-wide by compatible form/material buckets instead of emitting one
      branch mesh and one foliage mesh per tree.

## LOD Stability

- [ ] Investigate why LOD swaps occur 24 times per second.
- [x] Report LOD swaps by tile and plugin.
      Progress: `render3d` now records each `lod-changed` recent debug event
      with the tile key, owning plugin, and a concise `from -> to` summary, so
      the existing merged recent-event stream, exported debug snapshots, and
      minimap heatmap can attribute swap churn to specific tiles instead of
      only the aggregate top-plugin rate summary.
- [x] Add a maximum acceptable LOD swap rate.
      Progress: the live debug snapshot now emits a resource warning when
      `lodReplacementsPerSecond` rises above the acceptable churn threshold,
      and the warning carries the top plugin plus its swap rate summary so
      LOD thrash is visible immediately during `errors.md` triage instead of
      being buried in the raw swap counters.
- [x] Increase hysteresis when repeated swaps are detected.
      Progress: `render3d` now widens the low-detail exit hysteresis whenever
      recent `lodReplacementsPerSecond` stays above the churn threshold, so
      tiles that are already in `low` detail must move farther back inside the
      boundary before they can flip to `full` again. That keeps repeated
      `full <-> low` swaps from flapping at the same distance boundary while
      normal low-detail entry thresholds stay unchanged.
- [ ] Prevent LOD churn while the player remains nearly still.
      Progress: `render3d` now widens the movement required to seed another
      visible-tile LOD sync pass whenever recent `lodReplacementsPerSecond`
      stays above the churn threshold, so near-stationary jitter no longer
      restarts a full visible LOD sweep at the normal `0.18`-tile threshold
      while swap churn is already high.
- [x] Keep the last valid model during failed LOD upgrades.
- [x] Cache the last successful LOD for every visible tile.
- [x] Prefer cached lower LODs before generating fallbacks.
      Progress: `render3d` now routes visible rebuilds through a recoverable
      `full -> low` chain, preserves the current visible model when a rebuild
      only resolves to a fallback shell, records `lastSuccessfulVisibleTileDetailLevels`
      only for real `modelRoot` results, and prefers a cached successful `low`
      build before retrying expensive `full` detail. The behavior is covered in
      `packages/render3d/docs/tile-lod-recovery.md` and the renderer tests for
      fallback-only replacement guards and cached low-detail recovery.

## Plains Tile Fallbacks

- [x] Investigate repeated tile-plains model rejection events.
      Progress: `tile-plains` remains a renderer-owned shared-floor/fallback
      tile with no `create3DModel(...)` path and `wallHeight: 0`, so plains now
      stay associated with fallback-box activity instead of rejected-model
      hotspots in the regression fixtures and renderer tests.
- [x] Distinguish missing models from budget rejections.
- [x] Do not label missing plugin models as budget failures.
- [x] Add a normal low-cost plains model instead of a wall box.
- [x] Cache the plains fallback geometry for reuse.
- [x] Avoid rebuilding identical plains fallback models.
      Progress: `render3d` now batches repeated wall-height fallback boxes
      through one shared instanced layer by compatible tile kind, variant, and
      wall height, so identical plains fallback boxes reuse shared geometry and
      material instead of rebuilding one fallback mesh object per tile.
- [x] Count fallback models by plugin in the snapshot.
      Progress: the live debug snapshot and exported snapshot already carry
      `fallbackBoxSummary` / `lod.fallbackSummary`, so fallback-box rates are
      preserved as per-plugin counts instead of only a single total.
- [x] Warn when one plugin dominates fallback model usage.
      Progress: the debug panel now parses `fallbackBoxSummary` and adds a
      resource warning when one plugin accounts for at least 60% of the current
      fallback-model rate, so repeated plains or forest fallback churn is
      visible immediately during `errors.md` triage.

## Quality Reduction

- [x] Report each quality limiter with its measured value.
- [x] Report which limiter caused the latest quality change.
- [x] Show materials as critical in the summary.
- [x] Show visibility radius reduction as a consequence.
- [x] Avoid calling the tier healthy while quality is reduced.
- [x] Track how long the renderer remains in reduced quality.
- [ ] Reduce full-detail forest tree count more aggressively while quality is reduced.
      Progress: reduced-quality `tile-forest` full-detail tiles now keep no
      full-detail trees and collapse even the player tile to the existing
      low-detail instanced background path so chunk draw calls fall sooner
      when the renderer is already constrained, and reduced-quality nearby
      forest tiles also collapse entirely to the existing low-detail instanced
      background path so chunk draw calls fall sooner when the renderer is
      already constrained,
      and reduced-quality forest tiles now skip optional close-detail
      accessories such as hollows, owls, carvings, meadows, birds, webs,
      breadcrumbs, bushes, landmarks, and floor props, and reduced-quality
      low-detail forest tiles now keep one shared trunk mesh plus one shared
      canopy silhouette pass for the remaining visible subset, and
      reduced-quality background
      forest now keeps canopy silhouettes only inside the immediate ring around
      the player while farther tiles fall back to a stable sparse subset so
      chunk draw calls stop spending half the visible forest budget on distant
      silhouettes.
- [x] Track recovery back to full quality.
- [x] Add hysteresis before restoring full graphics quality.
      Progress: `render-budget` now requires a short healthy-frame recovery
      streak before it restores `60 FPS` plus the full visibility radius after
      a performance-driven quality downgrade, so the existing graphics-quality
      change tracking records a more stable `reduced/minimal -> full` recovery
      instead of immediately bouncing back on the first healthy smoothed frame.

## Build Scheduler

- [x] Review the pending build tile hard limit of four.
      Progress: the scheduler cap review confirmed that `4` is only the
      minimum tile allowance for the healthy `60 FPS` path; the reduced
      `30 FPS` path already tightens further to `2`, while healthy budgets keep
      a preferred allowance of `8`.
- [x] Clarify why soft pending tiles is eight but hard is four.
      Progress: the pending-build tile caps now use decreasing-metric names
      (`preferred` / `minimum`) instead of the misleading `soft` / `hard`
      labels, which makes the `8 -> 4` and `4 -> 2` transitions explicit as
      progressively tighter scheduler pressure states rather than ordinary
      higher-is-worse caps.
- [x] Rename limits where lower values represent more pressure.
      Progress: the shared render-budget path now uses `preferred` /
      `minimum` for pending-build tile caps in the plugin-facing render budget,
      web debug snapshot/export payloads, and related tests, so lower
      allowances no longer appear under inverted `soft` / `hard` names.
- [x] Record peak pending tile count during the sample window.
      Progress: `render3d` already records recent pending-queue sizes and
      surfaces the sample-window peak through the live web debug snapshot and
      exported snapshot payloads as `peakPendingTileCount` /
      `peakPendingTileBuildCount`, so captures keep the high-water mark instead
      of only the queue depth at export time.
- [x] Record peak pending build time during the sample window.
      Progress: `render3d` now tracks recent pending-build flush durations and
      surfaces the peak flush time through the web debug snapshot/export path,
      so sample captures show how long the scheduler spent flushing queued tile
      work instead of only how many tiles it processed.
- [x] Report scheduler starvation events.
      Progress: `render3d` now records per-plugin pending-build scheduler
      starvation rates when queued tile work cannot advance within the shared
      generation/frame budget, and the web debug snapshot/runtime issue path
      now surfaces that summary so long-running pending queues can be tied to
      the dominant tile plugin instead of only showing aggregate backlog.
- [x] Report model downgrade reasons separately from failures.
      Progress: the debug snapshot/export path now records the most recent
      successful `full -> low` LOD downgrade reason separately from the latest
      `model-rejected` failure, so successful low-detail recoveries stop being
      conflated with outright visible LOD recovery failures during triage.

## Snapshot Diagnostics

- [x] Add top material-producing plugins to the snapshot.
- [x] Add top Object3D-producing plugins to the snapshot.
- [x] Add top mesh-producing plugins to the snapshot.
- [x] Add top draw-call-producing plugins to the snapshot.
- [x] Add top LOD-swapping plugins to the snapshot.
- [x] Add top fallback-model plugins to the snapshot.
- [x] Add top matrix-update plugins to the snapshot.
- [x] Include cache hit rates for geometry and materials.
      Progress: the live snapshot and exported diagnostics now include
      geometry and material cache hit counts, miss counts, and hit rates, with
      geometry reuse covering shared box/plane plus tile-atlas geometry
      variants and material reuse covering the renderer-owned shared sky/event
      material buckets.
