# Sound Bank Debug Analysis Views

The selected patch panel on the sound-bank debug page now keeps four compact
analysis views together:

- waveform preview
- spectrum preview
- envelope preview
- filter response preview

## Flow

1. `sound-bank-debug.ts` resolves the effective runtime patch after applying the
   active debug-only oscillator, envelope, and timbre overrides.
2. The same effective patch feeds all four analysis builders, so the charts stay
   aligned with the audible preview state.
3. `sound-bank-debug.css` lays the views out as a responsive grid so expanded
   and compact shells can reuse the same analysis cards without branching
   markup.

## Why This Matters

Showing the views together makes it easier to compare what changed after a
debug-only patch override:

- oscillator toggles visibly remove spectral energy and waveform content
- ADSR overrides reshape the envelope card without changing the generated bank
- timbre overrides shift the filter response while preserving a shared patch
  context

That keeps the patch-analysis surface consistent with the sound-bank page's
debug-only playback model.
