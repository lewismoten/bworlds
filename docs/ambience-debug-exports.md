# Ambience Debug Exports

The ambience debug page now shows WAV export metrics before download for both
the full one-minute ambience bed and each individual cue.

Implementation notes:

- The page reuses [apps/web/src/wav-export-metrics.ts](/Users/lewismoten/dev/bworlds/apps/web/src/wav-export-metrics.ts:1)
  to compute rendered WAV duration and encoded byte size without building a
  separate Blob first.
- Cue downloads use a smaller quick-audition warning budget than the full
  minute export, so short cue renders can warn when they drift into larger
  debug artifacts without flagging the intentionally long one-minute bed.
- The current minute-bed warning budget is `6 MB`, which keeps the standard
  `48 kHz` mono one-minute render visible in the UI without marking it as an
  automatic warning.
