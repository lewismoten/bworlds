# Procedural Music Phrase Ending Sustain

[apps/web/src/procedural-music-lead-phrase.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-lead-phrase.ts:1)
now includes a small rebalancing pass for phrase-ending measures before lead
durations are connected.

The goal is narrow: if the final lead note in a phrase-ending bar starts so late
that it would only blip briefly before the planned tail rest, the shaper pulls
that note earlier just enough to preserve a usable closing sustain.

This keeps the existing tail-rest boundary intact while making phrase endings
read more intentionally musical instead of sounding clipped by timing
humanization or a late attack.

Regression coverage lives in
[apps/web/src/procedural-music-lead-phrase.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-lead-phrase.test.ts:1),
including a case where a very late ending note is shifted earlier and stretched
to the phrase-rest boundary.
