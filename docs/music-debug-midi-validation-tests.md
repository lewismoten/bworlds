# Music Debug MIDI Validation Tests

The MIDI validation failure checks are split into smaller suites so the long
test mode can schedule them independently:

- [music-debug-midi-validation-core.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-validation-core.test.ts:1)
  covers cadence, percussion, and lead-contour blockers.
- [music-debug-midi-validation-content.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-validation-content.test.ts:1)
  covers SongDNA, chromatic-note, timing, and motif validation blockers.

Both suites reuse the shared normalization helpers in
[music-debug-midi-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/music-debug-midi-test-support.ts:1)
so the exported-snapshot setup stays consistent with the rest of the MIDI
tests.
