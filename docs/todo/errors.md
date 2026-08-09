# High Priority

- [x] Enforce a hard per-frame generation budget
   No world-generation, tile-building, LOD, cache filling, or procedural work should be allowed to hold `loop()` for seconds. Process only a few milliseconds of queued work, then yield to the next frame.

- [ ] Rewrite the hot cache path to minimize lookups and allocations.
   `cache-support.get()` is still the single hottest sampled function at about **14% of CPU samples**, with `has()` another **6.5%** and `set()` another **4.4%**. Avoid `has()` + `get()`, use single-lookup APIs, and make cache keys allocation-free.

- [ ] Optimize the hash-seed pipeline, not just `hash2D()` itself.
   The bottleneck has moved into:

   * `mixHashCharacter()` ~8.6%
   * `getCachedHashSeed()` ~7.4%
   * `mixHashString()` ~6.5%

   Together those are over **22% of sampled CPU time**. Stop repeatedly hashing strings in hot world-generation paths. Convert stable strings/plugin IDs/seeds into numeric hash seeds once and reuse them.

- [ ] Eliminate string-based procedural hashing inside inner loops.
   Pre-hash things like `"forest"`, `"river"`, `"height"`, `"branch"`, plugin IDs, world seed components, etc. A tile generator should mostly combine integers once it enters its hot loops.

- [ ] Reduce garbage generation by an order of magnitude.
   Reclaiming ~6.4 GB during a four-second frame means you're creating huge amounts of temporary data. Profile and remove temporary arrays, coordinate objects, cache-key strings, spread objects, callbacks, and intermediate descriptors from generation loops.

- [ ] Cache whole generation contexts/results instead of caching tiny calculations individually.
   I see `createOverworldGenerationContext()`, terrain sampling, anchor resolution, river paths, route detection, etc. Rather than repeatedly asking multiple small caches about the same coordinate, compute a reusable per-tile/per-cell context once and pass it down through plugins.

- [ ] Consolidate river and route calculations.
   The trace still shows `getCachedRiverCurvePoints()`, `getCachedRiverForkPath()`, `getDistanceToLineSegment()`, route connectivity checks, rail-network resolution, and terrain classification in the generation path. Resolve those once per relevant region/tile and share the result instead of having multiple plugins rediscover them.

- [x] Stop rebuilding the debug/status HTML every render frame.
   The trace explicitly shows `updateStatus()` calling `innerHTML`, `ParseHTML`, and invalidating layout from inside `render()`. Update the debug panel at perhaps **2–4 times per second**, and mutate existing text nodes instead of rebuilding HTML.

- [ ] Generate 3D content nearest-first and low-detail-first.
   On entering 3D, immediately render cheap terrain and low LOD models. Queue high-detail trees, decorations, river details, distant objects, etc. afterward. The player should get a responsive frame before the entire render radius is complete.

- [ ] Move deterministic world-generation computation into workers.
    The CPU profile is dominated by cache/hashing/world-generation code that does not need access to WebGL. Move terrain signals, hashes, anchors, river paths, tree descriptors, cave descriptors, etc. into workers and send compact numeric results back to the rendering thread.
