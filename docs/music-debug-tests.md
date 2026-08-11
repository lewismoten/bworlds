# Music Debug Tests

The music debug integration checks are split by behavior so the long suite can
parallelize them and the files stay easier to maintain:

- [music-debug-snapshot-helpers.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-helpers.test.ts:1)
  covers snapshot option normalization plus small formatting and seed helpers
  that do not need the long-suite path.
- [music-debug-snapshot-generation.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-generation.test.ts:1)
  covers deterministic snapshot generation, cache reuse, motif validation, and
  encounter-length expectations.
- [music-debug-snapshot-representative.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-representative.test.ts:1)
  covers representative known-good snapshot prominence and section-plan
  expectations.
- [music-debug-markup.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-markup.test.ts:1)
  covers full laboratory markup plus pending-shell rendering.
- [music-debug-playback.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-playback.test.ts:1)
  covers playback scheduling, batching, role filtering, and dry/percussion
  routing behavior.
- [music-debug-behavior.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-behavior.test.ts:1)
  covers smaller non-markup behavior checks that do not need the larger
  snapshot or playback suites.
- [music-debug-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/music-debug-test-support.ts:1)
  centralizes the representative known-good snapshots used across the split
  suites.
