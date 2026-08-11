# Music Debug Timeline

The music debug timeline now renders planned harmony directly from the shared
procedural chord timeline instead of inferring labels from visible notes.

Current behavior:

- The timeline header shows contiguous chord cues such as `Chord 1 major` and
  `Chord 5 minor` above the note lanes.
- The active playhead also renders the current planned chord in a dedicated
  badge, using the same cue source as the exported SVG timeline.
- Chord cues are grouped across repeated measures so long tonic spans render as
  one readable block instead of repeated per-measure text.

This keeps the browser timeline, export bundle timeline SVG, and MIDI chord cue
labels aligned to one chord-label formatter and one measure-to-offset mapping.
