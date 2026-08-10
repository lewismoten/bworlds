# Music Debug Critical Warnings

The MIDI audit now separates ordinary warnings from export-blocking critical
warnings.

- `mismatchMessages` still represent direct facts that disagree with the
  rendered MIDI file.
- `criticalWarningMessages` capture validations that must fail the audit even
  when the bytes themselves are internally consistent, such as cadence drift.
  Cadence failures now include the exact measure plus the lead and bass note
  names that triggered the rejection.
- `warningMessages` remain non-blocking diagnostics for softer issues like
  percussion validation hints and planned-progression drift reports. Progression
  drift warnings now include the exact measure window that drifted.

This keeps `createMusicDebugMidiFile()` strict about musically critical failures
without collapsing every advisory note into a hard export stop.
