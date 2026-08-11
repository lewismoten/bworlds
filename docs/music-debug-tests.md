# Music Debug Tests

The music debug integration checks are split by behavior so the long suite can
parallelize them and the files stay easier to maintain:

- [music-debug-snapshot-helpers.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-helpers.test.ts:1)
  covers snapshot option normalization plus small formatting and seed helpers
  that do not need the long-suite path.
- [music-debug-snapshot-generation-baseline.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-generation-baseline.long.test.ts:1)
  covers the heaviest deterministic snapshot generation baseline plus cache
  reuse and theme-overlay expectations.
- [music-debug-snapshot-generation-variants.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-generation-variants.long.test.ts:1)
  covers SongDNA variant exposure, motif counters, and battle-versus-boss
  duration scenarios.
- [music-debug-snapshot-representative.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-representative.long.test.ts:1)
  covers representative known-good snapshot prominence and section-plan
  expectations.
- [music-debug-markup.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-markup.long.test.ts:1)
  covers full laboratory markup plus pending-shell rendering.
- [music-debug-song-playback.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-song-playback.long.test.ts:1)
  covers playback scheduling, batching, role filtering, and dry/percussion
  routing behavior.
- [music-debug-page-restore.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-page-restore.test.ts:1)
  covers the restore layer that rehydrates persisted form fields and playback
  state before `pageState` exists, keeping snapshot-driven rendering out of the
  early bootstrap path.
- [music-debug-timeline-fast.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-timeline-fast.test.ts:1)
  keeps timeline coordinate math, label hit-testing, and compact chord-label
  formatting in the fast suite.
- [music-debug-timeline.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-timeline.long.test.ts:1)
  stays on the long path because it builds full debug snapshots to cover hover
  diagnostics, drift markers, motif markers, and SVG export rendering.
- [music-debug-behavior.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-behavior.long.test.ts:1)
  covers smaller non-markup behavior checks that do not need the larger
  snapshot or playback suites.
- [music-debug-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/music-debug-test-support.ts:1)
  centralizes the representative known-good snapshots used across the split
  suites.
