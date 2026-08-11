# Music Debug Phrase Intent Score

The music debug snapshot now exposes a compact phrase-intent score that rolls
three existing diagnostics into one summary:

- `motif`: weights exact motif matches above varied ones so clearer statements
  raise the score.
- `contour`: scores how many contour checkpoints stay in range, then boosts the
  score when the climax stays near the planned peak and the phrase resolves to
  tonic.
- `cadence`: scores the share of cadence checkpoints that match both the target
  tones and the active harmony.

The combined score lives at `snapshot.phraseIntentScore`, and the summary line
appears in the laboratory markup as `Phrase Intent ...`.

This moves the `docs/todo/audio-priority2.md` phrase-intent item forward using
the existing motif, contour, and cadence validators instead of introducing a
separate conflicting audit path.
