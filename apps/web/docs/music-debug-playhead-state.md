## Music Debug Playhead State

The music debug timeline now resolves one playhead status label string for both
canvas drawing and SVG export.

That label combines:

- the active chord cue at the current playhead offset
- the active scale label derived from the snapshot root pitch class and theme
  mode label

Keeping the playhead label in one resolver avoids separate canvas and SVG logic
drifting apart when timeline diagnostics expand further.
