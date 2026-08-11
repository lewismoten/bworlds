# Sound Bank Debug Shell Tests

The sound-bank shell coverage that used to live in
[apps/web/src/sound-bank-debug-shell.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-bank-debug-shell.test.ts)
now runs as three focused files:

- [apps/web/src/sound-bank-debug-shell-options.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-bank-debug-shell-options.long.test.ts)
  covers option normalization and seed randomization helpers.
- [apps/web/src/sound-bank-debug-shell-markup.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-bank-debug-shell-markup.long.test.ts)
  covers the main browser shell markup, layout toggles, and patch-variant rendering.
- [apps/web/src/sound-bank-debug-shell-audio.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-bank-debug-shell-audio.long.test.ts)
  covers audio status diagnostics, mute-state warnings, and invalid instrument registration warnings.
- [apps/web/src/sound-bank-debug-preview-mode.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-bank-debug-preview-mode.test.ts)
  covers the processed-versus-dry preview toggle so melodic and percussion
  preview notes can share the same debug controls while selectively zeroing the
  wet send, previewing short phrases, and applying live ADSR overrides without
  rebuilding the generated bank.
- [apps/web/src/sound-bank-debug-preview-envelope.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-bank-debug-preview-envelope.test.ts)
  covers normalization and note-level application of the debug-only preview
  envelope state that feeds the live ADSR controls on the sound-bank page.

This keeps the same assertions while giving the long-suite runner more files to
parallelize, which reduces the wall-clock impact of the largest remaining
browser-heavy shell test.
