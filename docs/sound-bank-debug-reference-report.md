# Sound Bank Debug Reference Report

The sound-bank debug page now surfaces the generated patch's built-in
`knownGoodPatchComparison` beside the selected patch controls.

## Flow

1. `procedural-music-sound-bank.ts` already enriches each generated runtime
   instrument with `knownGoodPatchComparison`.
2. `sound-bank-debug.ts` now reuses that comparison directly when the selected
   runtime patch is shown in the detail panel.
3. The report summarizes:
   - overall similarity score
   - family and waveform matches
   - the strongest matching dimensions
   - the most prominent generated-versus-reference differences

## Why This Matters

This turns the existing reference comparison into a page-level debugging tool:

- patch quality can be judged without inspecting raw objects
- weak matches get a visible warning/failure tone
- the report explains which patch dimensions drift most from the role reference

That keeps the sound-bank debug page aligned with the instrument-quality work in
the audio priorities without adding a second comparison implementation.
