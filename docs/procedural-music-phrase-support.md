# Procedural Music Phrase Support

[apps/web/src/procedural-music-phrase-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-phrase-support.ts:1)
shapes support-layer notes after phrase generation but before song-wide density
pruning.

Current responsibilities:

- Extends bass and harmony durations enough to keep phrase support audible.
- Holds cadence-measure bass roots longer than neutral-measure roots.
- Pushes harmony notes down by octaves when phrase shaping would otherwise leave
  them inside the same local register as the lead.
- Inserts short harmony anchor notes into long lead rest windows when support
  would otherwise disappear entirely.
- Thins later harmony attack clusters inside measures where the lead is busy,
  so key melody moments keep one harmonic foundation without stacking repeated
  accompaniment attacks on top of the same measure.

Regression coverage lives in
[apps/web/src/procedural-music-phrase-support.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-phrase-support.test.ts:1).
