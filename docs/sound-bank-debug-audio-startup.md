# Sound Bank Debug Audio Startup

The sound bank debug page keeps a single preview sink alive for the page, but
it does not instantiate `AudioContext` during module load or initial render.
The sink reports `idle` until a user clicks `Start Audio`, `Resume Audio`, or a
preview button that needs playback.

`apps/web/src/procedural-music.ts` owns the lazy Web Audio lifecycle. The page
only reads `getAudioState()` and calls `resume()` through
`createMusicDebugInstrumentPreviewPlayer()`, which keeps UI state separate from
preview playback and lets the same sink survive rerenders.
