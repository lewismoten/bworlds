# Music Debug Tests

The music debug integration checks are split by behavior so the long suite can
parallelize them and the files stay easier to maintain:

- [music-debug-snapshot-helpers.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-helpers.test.ts:1)
  covers snapshot option normalization plus small formatting and seed helpers
  that do not need the long-suite path.
- [music-debug-snapshot-generation-baseline.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-generation-baseline.test.ts:1)
  covers the heaviest deterministic snapshot generation baseline plus cache
  reuse and theme-overlay expectations.
- [music-debug-snapshot-generation-variants.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-generation-variants.test.ts:1)
  covers SongDNA variant exposure, motif counters, and battle-versus-boss
  duration scenarios.
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
