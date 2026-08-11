# Procedural Music Cadence Bass Roots

`resolveCompositionDurationMultiplier(...)` in
[apps/web/src/procedural-music.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music.ts:1837)
now treats bass like another cadence-aware support layer instead of leaving it
at a flat duration multiplier, and
[apps/web/src/procedural-music-phrase-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-phrase-support.ts:1)
adds a second pass that extends cadence-measure bass notes relative to the
remaining bar length.

The current rule is intentionally narrow:

- neutral bass steps keep the existing near-default sustain
- question-cadence bass steps get a modest hold extension
- answer-cadence bass steps get the strongest hold extension

This keeps the existing root-first bass targeting logic in
[apps/web/src/procedural-music-harmony.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony.ts:520)
intact while making the cadence measures feel more anchored once note durations
are shaped into a full phrase.

Regression coverage lives in
[apps/web/src/procedural-music-phrase-support.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-phrase-support.test.ts:1),
which verifies that later-starting midpoint and closing cadence bass notes are
held longer, and that the closing answer-cadence note can sustain to the end of
the phrase.
