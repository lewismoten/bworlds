# High Priority

- [X] Optimize the hash-seed pipeline, not just `hash2D()` itself.
   The bottleneck has moved into:

   * `mixHashCharacter()` ~8.6%
   * `getCachedHashSeed()` ~7.4%
   * `mixHashString()` ~6.5%

   Together those are over **22% of sampled CPU time**. Stop repeatedly hashing strings in hot world-generation paths. Convert stable strings/plugin IDs/seeds into numeric hash seeds once and reuse them.

- [X] Eliminate string-based procedural hashing inside inner loops.
   Pre-hash things like `"forest"`, `"river"`, `"height"`, `"branch"`, plugin IDs, world seed components, etc. A tile generator should mostly combine integers once it enters its hot loops.

- [ ] Eliminate the remaining 500 ms and 150 ms frame stalls.
  - [ ] Convert long plugin loops to generators that yield work to the scheduler.
  - [ ] Resume unfinished generators on later frames.
  - [ ] Prioritize nearby and visible generation jobs first.
  - [ ] Allow queued generators to be cancelled when no longer relevant.
  - [ ] Let generators yield progress without creating final Three.js objects yet.
  - [ ] Warn when a plugin performs long synchronous work between yields.
  - [ ] Keep simple/cheap plugin methods synchronous where generators add no value.
  - [ ] If enough CPU budget remains in a frame, generator can be called again to do next bit of work
- [ ] Reduce unique materials and shader program variants.
- [ ] Stop cloning materials when shared materials can be reused.
- [ ] Reduce Object3D count and unnecessary scene hierarchy depth.
- [ ] Disable matrix updates for static objects and static subtrees.
- [X] Remove has() + get() double cache lookups.
- [X] Cache nearby overworld anchor queries by region or tile.
- [X] Reduce repeated syncWorldCurvature() work each frame.
- [X] Cache sky-position calculations unless celestial state changes.
- [ ] Instance repeated trees, foliage, rocks, and other static props.


- [ ] Cache whole generation contexts/results instead of caching tiny calculations individually.
   I see `createOverworldGenerationContext()`, terrain sampling, anchor resolution, river paths, route detection, etc. Rather than repeatedly asking multiple small caches about the same coordinate, compute a reusable per-tile/per-cell context once and pass it down through plugins.

- [ ] Consolidate river and route calculations.
   The trace still shows `getCachedRiverCurvePoints()`, `getCachedRiverForkPath()`, `getDistanceToLineSegment()`, route connectivity checks, rail-network resolution, and terrain classification in the generation path. Resolve those once per relevant region/tile and share the result instead of having multiple plugins rediscover them.

- [ ] Generate 3D content nearest-first and low-detail-first.
   On entering 3D, immediately render cheap terrain and low LOD models. Queue high-detail trees, decorations, river details, distant objects, etc. afterward. The player should get a responsive frame before the entire render radius is complete.

- [ ] Move deterministic world-generation computation into workers.
    The CPU profile is dominated by cache/hashing/world-generation code that does not need access to WebGL. Move terrain signals, hashes, anchors, river paths, tree descriptors, cave descriptors, etc. into workers and send compact numeric results back to the rendering thread.
