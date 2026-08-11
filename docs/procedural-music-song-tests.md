# Procedural Music Song Tests

The long-running song-generation checks are split into smaller suites so Vitest
can parallelize them and the file boundaries match the behavior under test:

- [procedural-music-song-structure.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-structure.test.ts:1)
  covers section layout, motif identity, and section-level phrase structure.
- [procedural-music-song-phrasing.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-phrasing.test.ts:1)
  covers phrase repetition, cadence behavior, and recurring percussion pulse
  generation.
- [procedural-music-song-arrangement.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-arrangement.test.ts:1)
  covers arrangement-specific density, dynamics, and section window
  constraints.
- [procedural-music-song-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/procedural-music-song-test-support.ts:1)
  centralizes phrase and section helpers shared across the test split.
