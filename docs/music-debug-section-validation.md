# Music Debug Section Validation

`MusicDebugSnapshot` now carries both whole-song export gates and a derived
`sectionValidationSummary`.

The new section summary is debug-facing. It combines existing section-local
checks from:

- harmony chord progression detection
- bass root progression detection
- cadence validation
- density validation

Each section reports `pass` or `fail` for those four checks plus an `overall`
status and human-readable reasons. This is intended for the music debug UI and
for exported rejection reports so composition drift is visible at the section
level instead of only as whole-song failures.

Keep the separation clear when changing this area:

- whole-song validators remain the export contract
- section summaries remain a derived diagnostic view
- section failures should be explainable from the underlying validators
