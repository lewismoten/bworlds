# Music Debug Timeline

The music debug timeline now renders planned harmony directly from the shared
procedural chord timeline instead of inferring labels from visible notes.

Current behavior:

- Section labels stay on their own header row, with chord cues and cadence
  markers stacked underneath instead of sharing the same line.
- Adaptive measure numbers and quarter-note subdivision guides now render from
  the same measure timing data as the rest of the timeline.
- The timeline header shows contiguous chord cues such as `Chord 1 major` and
  `Chord 5 minor` above the note lanes.
- Planned question and answer cadence markers now appear on the timeline header
  and in the exported SVG timeline.
- The active playhead also renders the current planned chord in a dedicated
  badge, using the same cue source as the exported SVG timeline.
- Chord cues are grouped across repeated measures so long tonic spans render as
  one readable block instead of repeated per-measure text.

This keeps the browser timeline, export bundle timeline SVG, and MIDI chord cue
labels aligned to one chord-label formatter and one measure-to-offset mapping.
