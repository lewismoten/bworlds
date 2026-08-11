# Music Debug Export Bundle Tests

The export-bundle checks are split by behavior so the long suite can schedule
them separately and the test files stay small:

- [music-debug-export-bundle-archive.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-export-bundle-archive.test.ts:1)
  covers ZIP contents and report payload assertions.
- [music-debug-export-bundle-download.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-export-bundle-download.test.ts:1)
  covers blob download wiring.
- [music-debug-export-bundle-metrics.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-export-bundle-metrics.test.ts:1)
  covers measured export timings and preview WAV counts.
- [music-debug-export-bundle-fallback.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-export-bundle-fallback.test.ts:1)
  covers the fallback path that still packages a ZIP when strict MIDI export
  validation would reject the snapshot.
- [music-debug-export-bundle-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/music-debug-export-bundle-test-support.ts:1)
  centralizes the small ZIP reader shared by the archive assertions.
