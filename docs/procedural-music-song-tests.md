# Procedural Music Song Tests

The long-running song-generation checks are split into smaller suites so Vitest
can parallelize them and the file boundaries match the behavior under test:

- [procedural-music-song-structure.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-structure.test.ts:1)
  covers section layout, motif identity, and section-level phrase structure.
- [procedural-music-song-phrasing.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-phrasing.test.ts:1)
  covers phrase repetition, cadence behavior, and recurring percussion pulse
  generation.
- [procedural-music-song-arrangement-identity.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-arrangement-identity.test.ts:1)
  covers arrangement identity, shared DNA, and section layer-plan behavior.
- [procedural-music-song-arrangement-dynamics.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-arrangement-dynamics.test.ts:1)
  covers arrangement density, dynamics, and motif-versus-filler emphasis.
- [procedural-music-song-arrangement-boundaries.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-arrangement-boundaries.test.ts:1)
  covers section-window boundary safety for transformed notes.
- [procedural-music-song-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/procedural-music-song-test-support.ts:1)
  centralizes phrase and section helpers plus the representative exploration
  song fixture shared across the test split.
