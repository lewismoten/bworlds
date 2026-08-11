# Procedural Music Harmony Tests

The procedural harmony checks are split by musical concern so the long suite
can parallelize the heavier sampled-melody assertions:

- [procedural-music-harmony-chords.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony-chords.test.ts:1)
  covers progression resolution, bass figures, cadence state, and shared chord
  context reuse.
- [procedural-music-harmony-lead.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony-lead.test.ts:1)
  covers lead-note motion, contour ranges, climax placement, and accidental
  limits across sampled phrases.
- [procedural-music-harmony-voicing.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony-voicing.test.ts:1)
  covers harmony triad voicing stability and the plains cadence-cycle mapping.

This split keeps the same assertions while reducing the chance that the largest
sampled-melody checks dominate one long-suite worker.
