# Sound Bank Debug Reference Library

The sound-bank debug page now renders the saved known-good role patches as an
explicit locked reference library alongside the generated patch report.

The library is sourced directly from
[listKnownGoodInstrumentPatches](/Users/lewismoten/dev/bworlds/apps/web/src/music-instrument-timbres.ts:705)
and rendered by
[buildSoundBankDebugReferencePatchLibraryMarkup](/Users/lewismoten/dev/bworlds/apps/web/src/sound-bank-debug.ts:1761).

That keeps the reference-patch workflow simple:

- the stored reference patches remain read-only
- generated patches still compare against the same saved anchors
- the selected generated role can highlight its matching reference card

This makes the reference library visible in the debug UI without introducing a
separate mutable preset system yet.
