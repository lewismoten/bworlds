# Sound Bank Debug Preview Envelope

The sound-bank debug page now exposes live ADSR controls for the currently
selected General MIDI program without mutating the generated bank itself.

## Flow

1. `sound-bank-debug.ts` renders the selected-program detail panel and, when a
   generated runtime patch is available, includes a debug-only ADSR control
   block.
2. `sound-bank-debug-page.ts` keeps the current slider values as page-local
   state keyed by the selected instrument id.
3. Preview actions read that state and pass it into the sound-bank preview
   helpers, which rewrite only the outgoing preview notes.
4. The live preview backends consume the same note-level envelope values, so
   Web Audio playback and waveform-envelope sampling stay aligned.

## Envelope Model

- `attackMs` and `releaseMs` map directly onto the existing note envelope.
- `sustainLevel` overrides `timbre.bodySustainLevel`.
- `decayMs` is modeled as the post-attack settle window before the note reaches
  sustain, stored on `timbre.bodySettleMs`.

`bodySettleMs` is optional. Generated instruments can omit it and continue to
derive a conservative default from the attack time, while the debug page can
set it explicitly when the user wants to audition a different decay shape.
