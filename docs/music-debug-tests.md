# Music Debug Tests

The music debug integration checks are split by behavior so the long suite can
parallelize them and the files stay easier to maintain:

- [music-debug-snapshot.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot.test.ts:1)
  covers snapshot normalization, deterministic generation, representative
  section-plan expectations, and formatting helpers.
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
