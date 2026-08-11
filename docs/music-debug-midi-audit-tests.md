# Music Debug MIDI Audit Tests

The MIDI audit checks are split by behavior so the long suite can parallelize
them and each file covers one audit concern:

- [music-debug-midi-audit-baseline.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-audit-baseline.test.ts:1)
  covers representative baseline exports and round-trip MIDI facts.
- [music-debug-midi-audit-mismatch.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-audit-mismatch.test.ts:1)
  covers hard consistency failures such as note counts, metadata, pitch-class
  drift, and motif drift.
- [music-debug-midi-audit-warnings.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-audit-warnings.test.ts:1)
  covers critical and non-critical audit warnings from harmony, bass, cadence,
  contour, and percussion validation paths.

The shared normalization helpers still come from
[music-debug-midi-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/music-debug-midi-test-support.ts:1)
so the split keeps the audit inputs aligned with the MIDI export tests.
