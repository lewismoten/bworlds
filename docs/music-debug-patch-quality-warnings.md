# Music Debug Patch Quality Warnings

Patch quality warnings are now part of the normal music debug quality summary.
They do not block MIDI export, but they show up before export whenever a
generated instrument drifts too far from its role's known-good reference.

The warning pipeline lives in
[apps/web/src/music-debug-patch-quality.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-patch-quality.ts:1).
It uses the same role-reference comparison data that powers the sound-bank
debug reference report, so the thresholds stay aligned across both pages.

Current thresholds:

- `pass`: similarity at or above `75%` with matching family and waveform
- `warning`: waveform mismatch or similarity below `75%`
- `failure`: family mismatch or similarity below `60%`

The warnings are folded into
[createMusicDebugQualityStatus](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-quality-status.ts:1)
so the existing "Quality" summary line and exported parameter report surface
them without introducing another export-only status path.
