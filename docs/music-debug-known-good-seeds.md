# Music Debug Known-Good Seeds

`apps/web/src/music-debug-known-good-seeds.ts` centralizes the baseline music
debug seeds that regression-style tests rely on.

Current baselines:

- `plains-midi-audit-baseline`
  Captures the fixed plains export used for exact-duration MIDI audit checks,
  so those tests do not scan a large seed grid at runtime.
- `plains-motif-baseline`
  Captures the stable plains motif case used for exact and varied motif checks.
- `forest-structure-baseline`
  Captures the forest arrangement case used for section-plan and summary checks.
- `town-blueprint-baseline`
  Captures the settled town arrangement used for blueprint occupancy checks.

These seeds are not meant to promise that every validation is globally perfect.
They exist so tests use one shared, named set of stable debug inputs instead of
scattered inline coordinates.
