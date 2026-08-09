# Music Debug Timing

The procedural music debug flow now treats section timing as a shared contract instead of letting each export path derive its own offsets.

## Timing pipeline

`apps/web/src/procedural-music-song-timing.ts` is the single place that converts a blueprint into timed song sections. It assigns:

- exact `measureCount`
- contiguous `startMeasure` and `endMeasure`
- deterministic `startTick` and `endTick`
- millisecond offsets derived from one shared measures-to-duration calculation

This keeps the song builder, debug snapshot, and MIDI exporter on the same 4/4 timing grid.

## Validation path

`apps/web/src/music-debug-timing-validation.ts` validates the generated song before export. It checks:

- total planned measures against the blueprint
- loop bounds against the exported duration
- contiguous section boundaries in measures, ticks, and milliseconds
- per-section tick spans against their measure counts
- note start times against the song duration window
- resolved BPM against the final exported duration

The debug snapshot exposes the validation result as `timingValidation`, and the debug summary renders its status so timing regressions are visible before exporting.

## MIDI export contract

`apps/web/src/music-debug-midi.ts` now uses the precomputed `startTick` values for conductor markers and refuses export when either pitch validation or timing validation fails. That keeps the conductor track markers, loop metadata, and note scheduling aligned with the same section plan.
