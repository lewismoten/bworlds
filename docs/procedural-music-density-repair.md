# Procedural Music Density Repair

[apps/web/src/procedural-music-song-density.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-density.ts:1)
now applies two separate measure-safety passes after density pruning:

- `ensureMeasureRetainsActiveLayer(...)` restores one original planned note
  when pruning would otherwise mute every remaining note inside the measure.
- `ensureMeasureHasAttack(...)` synthesizes one low-impact repair attack when a
  measure was already empty before pruning, so the representative full song
  does not leave every role silent at the same time.

The repair attack clones the nearest available source note template by role
priority, shifts it into the empty measure, and tags the instrument id with
`:measure-gap-repair` so later song-processing code can recognize it as a
generated density repair instead of authored phrase material.

Regression coverage lives in
[apps/web/src/procedural-music-song-density.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-density.test.ts:1),
including both:

- the pruning-path restoration case where one planned note must survive
- the composed-empty case where the density stage must synthesize one repair
  attack to keep the full arrangement from dropping all roles in the same
  measure
