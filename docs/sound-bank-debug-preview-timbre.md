# Sound Bank Debug Preview Timbre Controls

The sound-bank debug page now has a second layer of debug-only preview state for
tone shaping:

- `detuneCents`
- `filterCutoffHz`
- `filterQ`
- `noiseMix`

## Flow

1. `sound-bank-debug.ts` renders the selected-program detail panel with live
   tone controls when a generated runtime patch is available.
2. `sound-bank-debug-page.ts` keeps the slider state locally, keyed by the
   selected instrument id, and resets it when the seed or browser selection
   changes.
3. Preview actions pass the overrides into the sound-bank preview helpers.
4. The helpers rewrite only the outgoing preview note or the selected debug
   patch view; they do not mutate the generated instrument bank stored on the
   music snapshot.

## Rendering Alignment

The same override state feeds:

- live Web Audio preview playback
- WAV-style preview envelope/sample rendering
- selected-program diagnostics such as filter response, detune, and noise stats

That keeps the sound-bank page consistent when auditioning the patch and when
reading the patch diagnostics beside it.
