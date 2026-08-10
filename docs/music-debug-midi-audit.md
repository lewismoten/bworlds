# Music Debug MIDI Audit

The music debug snapshot tracks motif presence in two different ways:

- `sectionMotifMatches` is section-local debug data for the UI.
- `motifValidation` is the whole-song export contract used by MIDI validation.

This distinction matters because a recognizable lead motif can start near the
end of one section and finish at the start of the next. Section-local counts are
still useful for inspecting arrangement choices, but they can undercount those
boundary-spanning matches. The MIDI audit reads the exported lead line as one
continuous sequence, so the snapshot now computes export-facing motif totals the
same way.

When touching motif validation logic, keep these invariants aligned:

- Whole-song motif totals should match the MIDI audit.
- Section summaries should stay section-local for debugging.
- Export validation should fail only for real composition/export drift, not for
  differences caused by section boundaries.
