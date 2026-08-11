# Music Debug Chord-Tone Scores

The music debug snapshot now includes duration-weighted chord-tone scores for
`bass`, `harmony`, and `lead`.

- `snapshot.chordToneScores.measures` records one entry per measure with the
  planned chord label and per-role note counts, chord-tone counts, overlapping
  duration totals, and a `0..1` score.
- `snapshot.chordToneScores.tracks` rolls those measures up per role and keeps
  the weakest measure number so the summary can point at the worst local fit.
- The laboratory summary renders those rollups as `Chord-Tone Score ...`,
  which gives a fast read on how often each role stays on active chord tones
  before drilling into progression drift or cadence failures.

This supports the open `docs/todo/audio-priority2.md` item to add chord-tone
scores for every measure and track without touching the user's current
timeline-layout work.
