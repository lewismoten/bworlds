# Music Debug MIDI Tests

The long-running MIDI checks are split by behavior so Vitest can schedule them
across workers instead of serializing one large file:

- [music-debug-midi-export.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-export.test.ts:1)
  covers binary structure, track metadata, controller setup, percussion note
  mapping, and export variants.
- [music-debug-midi-validation.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-validation.test.ts:1)
  covers rejection paths for cadence, contour, SongDNA, and other export
  validation failures.
- [music-debug-midi-interaction.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-interaction.test.ts:1)
  covers the download wiring and export-role selection helpers.
- [music-debug-midi-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/music-debug-midi-test-support.ts:1)
  centralizes binary parsing helpers and snapshot normalization used by the
  MIDI tests.

This keeps the assertions unchanged while making the long suite easier to
parallelize and the individual files easier to maintain.
