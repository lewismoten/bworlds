# Music Debug MIDI Validation Tests

The MIDI validation failure checks are split into smaller suites so the long
test mode can schedule them independently:

- [music-debug-midi-validation-cadence.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-validation-cadence.test.ts:1)
  covers cadence and percussion export blockers.
- [music-debug-midi-validation-lead-contour.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-validation-lead-contour.test.ts:1)
  covers lead-contour ending and climax export blockers.
- [music-debug-midi-validation-content.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-validation-content.test.ts:1)
  covers SongDNA, chromatic-note, timing, and motif validation blockers.

Both suites reuse the shared normalization helpers in
[music-debug-midi-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/music-debug-midi-test-support.ts:1)
so the exported-snapshot setup stays consistent with the rest of the MIDI
tests, including the shared exportable town snapshot fixture used by the split
core validation suites.
