# Procedural Percussion Patterns

The procedural music pipeline now treats percussion as a small pattern engine
instead of a single isolated hit source.

## What changed

- Forest music (`deep-forest`) now emits a soft repeating pulse built from
  `shaker`, `hand-percussion`, and selective `kick`/`cymbals` accents.
- Percussion notes can carry note-level family overrides in their
  `instrumentId` suffix, which lets MIDI export preserve mixed drum families
  within one percussion role track.
- Theme-specific patterns live in
  [apps/web/src/procedural-music-percussion.ts](../src/procedural-music-percussion.ts)
  so rhythm rules stay out of the larger scheduler and song files.

## Why

This keeps forest songs from collapsing into sparse cymbal taps and gives the
audio debug exports a clearer groove that better matches the section blueprint.
