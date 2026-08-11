# Music Debug Phrase Intent Validation

The music debug snapshot now includes
`snapshot.phraseIntentValidation`, which turns the diagnostic
`phraseIntentScore` into an explicit export gate.

Current thresholds:

- overall phrase-intent score must stay at or above `60%`
- motif component must stay at or above `55%`
- contour component must stay at or above `60%`
- cadence component must stay at or above `50%`

The summary renders this as `Phrase Intent Check ...`, and
`createMusicDebugMidiFile()` now treats those messages as export blockers
before the MIDI bytes are encoded.

This moves the `docs/todo/audio-priority2.md` phrase-intent requirement from a
debug-only score toward an actual correctness gate without touching the user's
active timeline-layout work.
