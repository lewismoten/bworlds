# Procedural Music Reference Patches

`apps/web/src/music-instrument-timbres.ts` now includes a small read-only
known-good patch library for the four core procedural song roles:

- `lead`: a breathy flute patch
- `harmony`: a bowed string bed
- `bass`: an upright bass anchor
- `percussion`: a punchy kick pulse

These references are intentionally conservative. They are not meant to replace
the generated patch system. Instead, they provide stable anchors we can use for
future comparison tasks such as:

- checking generated patches against trusted role targets
- detecting when two roles collapse into nearly identical timbres
- giving debug tools a canonical patch to audition alongside generated output

Each reference patch is frozen, recipe-safe for its family, and distinct enough
to expose the current role goals:

- `lead` keeps the breath-noise layer and brighter filter range
- `harmony` preserves the bowed attack peak and sustained body
- `bass` keeps a low cutoff with stronger fundamental support
- `percussion` stays short and punchy with a narrow lowpass body

Generated instruments now also carry a `knownGoodPatchComparison` snapshot.
That comparison scores the generated patch against the role's reference anchor
across envelope, brightness, harmonic, filter, and optional timbre traits. This
gives later debug and validation work a stable per-role similarity report
without recomputing patch comparisons in multiple places.
