# Music Debug Critical Warnings

The MIDI audit now separates ordinary warnings from export-blocking critical
warnings.

- `mismatchMessages` still represent direct facts that disagree with the
  rendered MIDI file.
- `criticalWarningMessages` capture validations that must fail the audit even
  when the bytes themselves are internally consistent, such as cadence drift.
  Cadence failures now include the exact measure plus the lead and bass note
  names that triggered the rejection, including final answer cadences that miss
  tonic.
- Lead-contour ending failures and off-peak climax failures are also treated as
  critical warnings, using the exact measure and note context from the contour
  analysis.
- Harmony and bass progression drift are now critical warnings too, using the
  exact measure window plus detected versus planned harmony/root labels.
- Progression drift warnings now also include the concrete played note labels
  for the offending bass note or harmony chord.
- When those critical warnings point to a specific phrase, song construction now
  regenerates only that failed phrase window before reapplying the full-song
  shaping passes.
- `warningMessages` remain non-blocking diagnostics for softer issues like
  percussion validation hints and planned-progression drift reports. Progression
  drift warnings now include the exact measure window that drifted.

This keeps `createMusicDebugMidiFile()` strict about musically critical failures
without collapsing every advisory note into a hard export stop.
