# Procedural Music Harmony Register

Harmony voicings now clamp themselves against the upcoming lead register before
they become rendered song notes.

## Flow

1. [apps/web/src/procedural-music.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music.ts:1)
   resolves the next lead step while building a harmony step.
2. That projected lead note becomes a ceiling for
   [apps/web/src/procedural-music-harmony.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony.ts:1),
   which forwards the limit into
   [apps/web/src/procedural-music-harmony-voicing.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony-voicing.ts:1).
3. The voicing helper shifts candidate triads down until their top note clears
   the upcoming lead by at least a small interval, instead of letting the
   accompaniment sit inside the same rendered register.

## Why This Matters

This moves the `docs/todo/audio-priority2.md` harmony-register item forward
without changing the broader chord planner:

- harmony stays supportive instead of colliding with the melodic line
- the existing voice-leading scoring still chooses nearby inversions first
- the rule works at the rendered register level, including arrangement octave
  shifts
