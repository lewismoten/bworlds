# Music Debug Quality Status

`apps/web/src/music-debug-quality-status.ts` now defines one shared
`createMusicDebugQualityStatus()` helper for the music laboratory.

It separates validation output into two groups:

- Blocking reasons: pitch-export failures, motif failures, timing failures,
  cadence failures, SongDNA failures, MIDI-audit mismatches, MIDI-audit
  critical warnings, and lead-contour ending or climax failures.
- Warning reasons: non-blocking percussion validation messages and MIDI-audit
  warning messages.

That helper is used by both the in-page summary and the exported debug report,
so the UI and JSON bundle can no longer disagree about whether a snapshot is
still considered "good" for export review.
