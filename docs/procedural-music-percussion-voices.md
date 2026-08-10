# Procedural Music Percussion Voices

`apps/web/src/procedural-music-percussion-voices.ts` now centralizes the used
procedural drum-note set for both synthesis and MIDI export.

Before this change, percussion synthesis only had one recipe per family even
though export already fanned those families out across multiple GM drum notes.
Now each used note gets its own voice definition with:

- a stable MIDI drum note
- its own waveform
- note-specific envelope and gain multipliers
- note-specific timbre shaping on top of the shared family recipe

That keeps one source of truth for the currently used drum-note set while
preserving the existing groove patterns. It also sets up the next percussion
tasks so named voices, debug displays, and validation can all build on the same
shared definitions.

Each used drum note now also has a stable voice name such as `crash`,
`closed-hat`, `snare-rim`, `low-bongo`, or `cabasa`. That means the same shared
table can answer all of these questions consistently:

- which GM note a procedural hit exports to
- which synthesis recipe that hit should use
- which named percussion voice a debug tool should display
