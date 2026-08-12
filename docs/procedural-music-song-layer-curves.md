# Procedural Music Song Layer Curves

`apps/web/src/procedural-music-song-layers.ts` is the first pass that shapes
section-level role presence before note-specific articulation and timbre logic
run.

Current responsibilities:

- decide whether a role is muted in a given section
- apply section-level volume curves by role and section progress
- duck accompaniment roles during lead-forward phrase positions
- keep harmony space management separate from note-level velocity shaping

Why this lives before note variation:

- note variation already handles per-note velocity, beat accents, phrase arcs,
  articulation, and brightness
- section layer treatment is a higher-level arrangement pass that should stay
  stable across repeated notes in the same structural window
- keeping the layer curve and ducking logic here makes it easier to debug song
  arrangement independently from patch/timbre behavior
