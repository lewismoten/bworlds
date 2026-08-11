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

The music debug page now renders that summary in a dedicated `Section
Validation` panel instead of only compressing it into the one-line `Section
Checks` status row. That panel keeps the existing whole-song summary intact
while exposing explicit per-section `pass` or `fail` badges plus the first and
full reason lists for any failing section.

Keep the separation clear when changing this area:

- whole-song validators remain the export contract
- section summaries remain a derived diagnostic view
- section failures should be explainable from the underlying validators
