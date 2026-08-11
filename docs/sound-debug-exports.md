# Sound Debug Exports

The sound debug page now computes WAV preview export metrics before download so
the UI can show both the rendered preview duration and the encoded mono PCM16
file size up front.

Implementation notes:

- [apps/web/src/sound-debug-export-metrics.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-debug-export-metrics.ts:1)
  owns the shared duration/byte-size calculation for sound-debug WAV exports.
- The helper assumes the current `encodeMonoPcm16Wav(...)` layout: `44` header
  bytes plus `2` bytes per mono sample.
- The current quick-audition warning budget is `96 KB`. Larger previews render
  a warning banner before download so longer debug sounds do not surprise the
  user with oversized sample files.

This is intentionally small and isolated so the same helper can later be reused
by ambience or music debug export surfaces when those pages gain the same
pre-download metrics.
