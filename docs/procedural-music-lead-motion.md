# Procedural Music Lead Motion

[apps/web/src/procedural-music-harmony.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony.ts:1)
resolves lead semitones by ranking nearby chord and contour candidates instead
of committing directly to one fixed note target.

The ranking path now includes a repeated-pitch penalty from
[apps/web/src/procedural-music-lead-motion.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-lead-motion.ts:1).
That penalty scales with the current same-pitch run length so neutral phrase
motion is biased away from flat repeated-note strings, while structural cadence
windows can still keep deliberate reiteration when they need to reinforce a
question or answer cadence.

Regression coverage lives in:

- [apps/web/src/procedural-music-lead-motion.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-lead-motion.test.ts:1)
  for direct scoring behavior
- [apps/web/src/procedural-music-harmony-lead.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony-lead.test.ts:1)
  for generated lead-note runs across sampled phrases
