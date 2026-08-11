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

The same scoring path now also biases lead recovery toward stepwise motion
after a larger leap. Candidate ranking keeps structural accents flexible, but
neutral phrase motion now pays an extra penalty when it chains one large jump
into another instead of resolving through a smaller recovery step.

Neutral lead steps now also prefer contrary motion when the bass just takes a
clear directional move. The rule stays out of cadence and climax windows, but
when bass and lead would otherwise travel in parallel on an ordinary step, the
lead selector now reuses its ranked candidate list to pick an opposite-direction
option first when one is available.

Question-cadence handling now also distinguishes meter strength explicitly:
strong question beats stay on unstable chord tones, while weak question beats
can still use the passing tone that leans into the answer.

Regression coverage lives in:

- [apps/web/src/procedural-music-lead-motion.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-lead-motion.test.ts:1)
  for direct scoring behavior
- [apps/web/src/procedural-music-harmony-question-cadence.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony-question-cadence.test.ts:1)
  for the strong-beat versus weak-beat question-cadence split
- [apps/web/src/procedural-music-harmony-lead.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-harmony-lead.long.test.ts:1)
  for generated lead-note runs across sampled phrases
