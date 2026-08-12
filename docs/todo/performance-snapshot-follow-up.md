# Performance Snapshot Follow-Up

- [x] consider improving the runtime-performance-snapshots API - mainly adding an additional API to report when rendering issues occur, but limited to a few seconds so that we don't have thrasing. The goal is to have that separate API to report important issues rarely that need to be addressed, and build a failing test when an issue is reported - ie what plugins, parameters, etc. was failing along with budget and reason.
- [ ] Limit each tree species to 10 material variants per part type.
- [ ] Reuse bark, foliage, and branch materials across nearby trees.
- [ ] Prefer tinting shared materials over creating new textures.
- [ ] Use color shifts to distinguish related tree species.
- [ ] Avoid unique textures when color variation is sufficient.
- [ ] Share material variants between compatible tree species.
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
      recovery.
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
- [ ] Avoid cloning materials only to change unused values.
- [x] Share SpriteMaterial instances where possible.
      Progress: the ambient night-sky star field already uses `THREE.Sprite`
      nodes for distant stars, and `render3d` now reuses one shared
      `SpriteMaterial` across the full 360-star field instead of allocating a
      unique material per star. That removes roughly 359 avoidable scene-unique
      material references from the persistent sky layer while keeping the
      per-star brightness variation through sprite scale.
- [ ] Report material cache hit and miss counts.
- [ ] Fail tests when material counts regress sharply.

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
- [ ] Investigate the 656 static objects using matrix auto-update.
- [ ] Disable matrix auto-update for truly static objects.
      Progress: `render3d` now freezes each visible tile root group at build
      creation time, so floor-only plains tiles and other static tile
      containers stop contributing one avoidable `matrixAutoUpdate` traversal
      per visible tile while dynamic descendants still keep their responder-
      flagged transforms live.
- [x] Report static matrix updates by plugin.
- [ ] Reduce total Object3D count without changing visuals.

## LOD Stability

- [ ] Investigate why LOD swaps occur 24 times per second.
- [ ] Report LOD swaps by tile and plugin.
- [ ] Add a maximum acceptable LOD swap rate.
- [ ] Increase hysteresis when repeated swaps are detected.
- [ ] Prevent LOD churn while the player remains nearly still.
- [ ] Keep the last valid model during failed LOD upgrades.
- [ ] Cache the last successful LOD for every visible tile.
- [ ] Prefer cached lower LODs before generating fallbacks.

## Plains Tile Fallbacks

- [ ] Investigate repeated tile-plains model rejection events.
- [x] Distinguish missing models from budget rejections.
- [x] Do not label missing plugin models as budget failures.
- [x] Add a normal low-cost plains model instead of a wall box.
- [ ] Cache the plains fallback geometry for reuse.
- [ ] Avoid rebuilding identical plains fallback models.
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
- [ ] Track recovery back to full quality.
- [ ] Add hysteresis before restoring full graphics quality.

## Build Scheduler

- [ ] Review the pending build tile hard limit of four.
- [ ] Clarify why soft pending tiles is eight but hard is four.
- [ ] Rename limits where lower values represent more pressure.
- [ ] Record peak pending tile count during the sample window.
- [ ] Record peak pending build time during the sample window.
- [ ] Report scheduler starvation events.
- [ ] Report model downgrade reasons separately from failures.

## Snapshot Diagnostics

- [x] Add top material-producing plugins to the snapshot.
- [x] Add top Object3D-producing plugins to the snapshot.
- [x] Add top mesh-producing plugins to the snapshot.
- [x] Add top draw-call-producing plugins to the snapshot.
- [x] Add top LOD-swapping plugins to the snapshot.
- [x] Add top fallback-model plugins to the snapshot.
- [x] Add top matrix-update plugins to the snapshot.
- [ ] Include cache hit rates for geometry and materials.
