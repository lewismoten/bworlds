# Music Debug Harmonic Alignment Validation

The music debug snapshot now includes
`snapshot.harmonicAlignmentValidation`, which blocks MIDI export earlier from
the snapshot itself instead of waiting for the post-encode MIDI audit to catch
the same failure.

Current rules:

- Harmony fails when any measure with harmony notes drops below `50%`
  chord-tone fit against the planned chord.
- Bass fails when any planned bass-root measure drifts from the detected root in
  `bassProgressionDetections`.

The summary renders this as `Harmony/Bass Check ...`, and
`createMusicDebugMidiFile()` now treats those messages as export blockers.

This moves the `docs/todo/audio-priority2.md` musical-correctness items forward
without touching the user's active timeline-layout work.
