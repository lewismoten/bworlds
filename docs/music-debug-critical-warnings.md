# Music Debug Critical Warnings

The MIDI audit now separates ordinary warnings from export-blocking critical
warnings.

- `mismatchMessages` still represent direct facts that disagree with the
  rendered MIDI file.
- `criticalWarningMessages` capture validations that must fail the audit even
  when the bytes themselves are internally consistent, such as cadence drift.
- `warningMessages` remain non-blocking diagnostics for softer issues like
  percussion validation hints and planned-progression drift reports.

This keeps `createMusicDebugMidiFile()` strict about musically critical failures
without collapsing every advisory note into a hard export stop.
