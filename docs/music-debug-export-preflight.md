# Music Debug Export Preflight

Music debug exports now run a small preflight step before downloading MIDI or
the bundled ZIP.

Implementation notes:

- [apps/web/src/music-debug-export-preflight.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-export-preflight.ts:1)
  builds a patch-quality warning message from the existing
  `knownGoodPatchComparison` analysis.
- The preflight is warning-only. It does not block export automatically when a
  patch drifts; it asks for confirmation so the user sees the warning at the
  exact export decision point.
- The page hooks this into both `Download MIDI` and `Download Export ZIP`, so
  the warning behavior stays consistent across the two export paths.
