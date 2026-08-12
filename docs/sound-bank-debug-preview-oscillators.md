# Sound Bank Debug Preview Oscillator Controls

The sound-bank debug page now exposes a third layer of debug-only preview state
for oscillator routing:

- `carrierEnabled`
- `harmonicEnabled`
- `carrierGainMultiplier`
- `harmonicGainMultiplier`
- `harmonicRatio`
- `carrierWaveform`
- `harmonicWaveform`
- `soloTarget`

## Flow

1. `sound-bank-debug.ts` renders carrier and harmonic toggle buttons plus
   waveform selectors, gain sliders, and a harmonic-ratio slider beside the
   selected generated patch.
2. `sound-bank-debug-page.ts` keeps the oscillator state local to the current
   selected instrument and re-renders the panel when the user toggles, solos,
   or changes either oscillator waveform.
3. Preview actions pass the oscillator override into the same note helpers used
   by melodic and percussion audition buttons.
4. The helpers rewrite only the outgoing preview note or the selected patch
   diagnostics; they never mutate the generated sound bank on the music
   snapshot.

## Rendering Alignment

The same oscillator override state now drives:

- live Web Audio preview playback
- WAV-style debug preview rendering
- selected patch diagnostics such as waveform shape and active oscillator count

That keeps the waveform panel, patch stats, and audible preview in sync when
the carrier or harmonic oscillator is muted, soloed, switched between the
built-in Web Audio waveform types, rebalanced with debug-only gain changes, or
retuned to a different harmonic multiple.
