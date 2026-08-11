# Sound Bank Debug A/B Comparison

The selected-instrument detail panel now exposes an instant A/B phrase preview
on top of the existing sound-bank debug playback wiring.

## Flow

1. The selected runtime patch already had a live phrase preview path through
   `data-preview-id`.
2. The locked role reference already had a phrase preview path through
   `data-reference-patch-role`.
3. The A/B panel now renders one button for each path against the same selected
   role:
   - `Play A: Current Patch` reuses the live generated patch preview and still
     honors the current envelope, timbre, and oscillator overrides.
   - `Play B: Reference Patch` reuses the locked reference phrase preview and
     intentionally ignores those live overrides.

## Why This Matters

This makes patch comparison fast enough to use while tuning:

- the timing, role, and phrase shape stay constant between A and B
- live control changes stay isolated to the generated patch side
- the locked reference remains a stable audio anchor instead of drifting with
  the current debug controls

That keeps the comparison behavior aligned with the existing reference patch
report without introducing a second playback implementation.
