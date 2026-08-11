# Performance Snapshot Follow-Up

- [x] consider improving the runtime-performance-snapshots API - mainly adding an additional API to report when rendering issues occur, but limited to a few seconds so that we don't have thrasing. The goal is to have that separate API to report important issues rarely that need to be addressed, and build a failing test when an issue is reported - ie what plugins, parameters, etc. was failing along with budget and reason.
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
- [x] Report cloned material count by plugin.
- [ ] Reuse shared materials instead of cloning them.
- [ ] Cache materials by their effective property values.
- [ ] Avoid cloning materials only to change unused values.
- [ ] Share SpriteMaterial instances where possible.
- [ ] Report material cache hit and miss counts.
- [ ] Fail tests when material counts regress sharply.

## Instancing

- [ ] Investigate why no visible InstancedMesh objects are found.
- [ ] Verify instanced models survive the tile build pipeline.
- [ ] Verify LOD conversion does not replace instanced models.
- [ ] Report InstancedMesh counts by tile plugin.
- [ ] Report rendered instance counts by tile plugin.
- [ ] Add a test scene that must contain visible instances.
- [ ] Warn when repeated meshes exist but no instances exist.

## Scene Graph

- [ ] Remove unnecessary one-child groups from scene models.
- [ ] Investigate the 106 groups containing only one child.
- [ ] Report one-child group counts by plugin.
- [ ] Flatten groups that provide no transform or semantic value.
- [ ] Investigate the 656 static objects using matrix auto-update.
- [ ] Disable matrix auto-update for truly static objects.
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
- [ ] Add a normal low-cost plains model instead of a wall box.
- [ ] Cache the plains fallback geometry for reuse.
- [ ] Avoid rebuilding identical plains fallback models.
- [ ] Count fallback models by plugin in the snapshot.
- [ ] Warn when one plugin dominates fallback model usage.

## Quality Reduction

- [x] Report each quality limiter with its measured value.
- [x] Report which limiter caused the latest quality change.
- [x] Show materials as critical in the summary.
- [ ] Show visibility radius reduction as a consequence.
- [ ] Avoid calling the tier healthy while quality is reduced.
- [ ] Track how long the renderer remains in reduced quality.
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
