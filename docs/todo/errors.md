# High Priority

Always run tests to make sure all tests pass

- [x] Fix the MIDI export motif mismatch when a lead motif spans a section boundary.
      Whole-song motif validation now uses the continuous lead-note sequence so
      bundle export stays aligned with the MIDI audit.

# Prevent Runaway Vitest Processes

- [x] Keep parallel workers enabled for the normal test suite.
- [x] Fail the full test suite after 60 seconds.
- [x] Kill all Vitest workers when the suite timeout expires.
- [x] Print active test files before forced termination.
- [x] Print the last started test before forced termination.
- [x] Set a reasonable timeout for each individual test.
- [x] Set timeouts for `beforeAll` and `afterAll` hooks.
- [x] Check tests for infinite loops and unbounded generation.
      Vitest now runs a repository source audit that rejects unconditional
      infinite loops in test files plus suspiciously large static fixtures
      before they can land as hangs.
- [x] Check async tests for missing `await` statements.
      ESLint now enforces `@typescript-eslint/await-thenable` plus
      `@typescript-eslint/no-floating-promises` across TypeScript files so
      missing awaits and dropped promises fail lint.
- [x] Ensure every promise eventually resolves or rejects.
      Registered test cleanups and tracked `close()`/`destroy()`/`terminate()`
      handles now fail fast if they do not settle within 100ms, so leaked async
      teardown work reports a test failure instead of hanging the suite.
- [x] Clear intervals and timeouts after every test.
- [x] Close servers, sockets, workers, and file watchers.
      Shared Vitest cleanup now supports registered teardown callbacks plus
      tracked `close()`/`destroy()`/`terminate()` handles so open resources can
      be closed centrally after each test.
- [x] Restore fake timers and mocks after every test.
- [x] Prevent concurrent full-suite runs in the same project.
- [x] Make the agent wait for one test run to finish.
- [x] Run hanging files alone with one worker and verbose output.
- [x] Record worker PIDs when the full suite starts.
- [x] Add a regression test after finding each hang.
      `vitest-supervisor.test.ts` now simulates a hung full-suite run and
      asserts the timeout diagnostics, worker PID reporting, and forced
      shutdown path so the hang-mitigation behavior stays covered.

# Next Highest

- [x] Optimize the hash-seed pipeline, not just `hash2D()` itself.
      The bottleneck has moved into:

  - `mixHashCharacter()` ~8.6%
  - `getCachedHashSeed()` ~7.4%
  - `mixHashString()` ~6.5%

  Together those are over **22% of sampled CPU time**. Stop repeatedly hashing strings in hot world-generation paths. Convert stable strings/plugin IDs/seeds into numeric hash seeds once and reuse them.

- [x] Eliminate string-based procedural hashing inside inner loops.
      Pre-hash things like `"forest"`, `"river"`, `"height"`, `"branch"`, plugin IDs, world seed components, etc. A tile generator should mostly combine integers once it enters its hot loops.

- [ ] Eliminate the remaining 500 ms and 150 ms frame stalls.
  - [ ] Convert long plugin loops to generators that yield work to the scheduler.
  - [ ] Resume unfinished generators on later frames.
  - [x] Prioritize nearby and visible generation jobs first.
  - [x] Allow queued generators to be cancelled when no longer relevant.
  - [ ] Let generators yield progress without creating final Three.js objects yet.
  - [x] Warn when a plugin performs long synchronous work between yields.
  - [ ] Keep simple/cheap plugin methods synchronous where generators add no value.
  - [x] If enough CPU budget remains in a frame, generator can be called again to do next bit of work
        Pending world builds already reuse the same frame flush while budget
        remains: `flushPendingWorldBuild()` loops through multiple queued tiles in
        one frame, and `pending-world-build-processing.test.ts` now proves the
        helper keeps admitting additional entries until the shared budget is
        exhausted.
- [ ] Reduce unique materials and shader program variants.
- [x] Stop cloning materials when shared materials can be reused.
- [ ] Reduce Object3D count and unnecessary scene hierarchy depth.
      Progress: `tile-quarry` now collapses its six repeated rubble stones into
      one `InstancedMesh`, and `tile-rail` now collapses four repeated sleepers
      into one `InstancedMesh`, which removes small clusters of redundant
      static child nodes from each visible landmark or track tile.
- [x] Disable matrix updates for static objects and static subtrees.
- [x] Remove has() + get() double cache lookups.
- [x] Cache nearby overworld anchor queries by region or tile.
- [x] Reduce repeated syncWorldCurvature() work each frame.
- [x] Cache sky-position calculations unless celestial state changes.
- [ ] Instance repeated trees, foliage, rocks, and other static props.
      Progress: forest low-detail trees and several forest detail sets were
      already instanced, quarry landmarks now instance their repeated rubble
      stones, and rail tiles now instance their repeated sleepers instead of
      emitting one mesh per repeated prop.

- [x] Cache whole generation contexts/results instead of caching tiny calculations individually.
      I see `createOverworldGenerationContext()`, terrain sampling, anchor resolution, river paths, route detection, etc. Rather than repeatedly asking multiple small caches about the same coordinate, compute a reusable per-tile/per-cell context once and pass it down through plugins.

- [ ] Consolidate river and route calculations.
      The trace still shows `getCachedRiverCurvePoints()`, `getCachedRiverForkPath()`, `getDistanceToLineSegment()`, route connectivity checks, rail-network resolution, and terrain classification in the generation path. Resolve those once per relevant region/tile and share the result instead of having multiple plugins rediscover them.

- [x] Generate 3D content nearest-first and low-detail-first.
      On entering 3D, immediately render cheap terrain and low LOD models. Queue high-detail trees, decorations, river details, distant objects, etc. afterward. The player should get a responsive frame before the entire render radius is complete.

- [ ] Move deterministic world-generation computation into workers.
      The CPU profile is dominated by cache/hashing/world-generation code that does not need access to WebGL. Move terrain signals, hashes, anchors, river paths, tree descriptors, cave descriptors, etc. into workers and send compact numeric results back to the rendering thread.
