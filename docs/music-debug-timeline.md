# Music Debug Timeline

The music debug timeline now renders planned harmony directly from the shared
procedural chord timeline instead of inferring labels from visible notes.

Current behavior:

- Section labels stay on their own header row, with chord cues and cadence
  markers stacked underneath instead of sharing the same line.
- Section labels now sit in centered low-contrast pills so section boundaries
  stay readable without dominating the header.
- Adaptive measure numbers and quarter-note subdivision guides now render from
  the same measure timing data as the rest of the timeline.
- The timeline header shows contiguous chord cues such as `Chord 1 major` and
  `Chord 5 minor` above the note lanes.
- Chord labels now thin themselves automatically and fall back to compact
  `1 maj` or `5 min` forms on narrow spans so dense progressions stay readable.
- Per-track eye toggles above the timeline now hide or restore individual
  role lanes without affecting playback state, and that visibility choice is
  persisted with the rest of the debug page session.
- The percussion row now draws readable lane labels from the resolved drum
  families or voice names so separated kick, snare, cymbal, and similar lanes
  can be read without relying on hover.
- Notes that fall outside the active mode now render with a warning fill on the
  browser timeline and in exported SVG timelines, driven by the existing
  `notePitchDiagnostics` snapshot data.
- Hovering a note now shows its pitch or resolved drum voice plus duration, and
  the exported SVG note bars carry the same labels through `<title>` metadata.
- Planned question and answer cadence markers now appear on the timeline header
  and in the exported SVG timeline.
- The active playhead also renders the current planned chord in a dedicated
  badge, using the same cue source as the exported SVG timeline.
- Chord cues are grouped across repeated measures so long tonic spans render as
  one readable block instead of repeated per-measure text.

This keeps the browser timeline, export bundle timeline SVG, and MIDI chord cue
labels aligned to one chord-label formatter and one measure-to-offset mapping.
