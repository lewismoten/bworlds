# Procedural Music Loudness

The procedural music pipeline already normalizes generated note groups through a
shared loudness policy in [procedural-music-loudness.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-loudness.ts).

Current policy:

- `normalizeProceduralMusicLoudness(...)` runs as part of note scheduling in
  [procedural-music.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music.ts).
- The shared target loudness is `0.026`.
- Role weighting keeps lead above harmony, harmony above bass, and bass above
  percussion while still pulling the overall mix toward one target band.

This is the current loudness-target layer for generated songs. It is separate
from later per-track measurement or mastering-style validation.
