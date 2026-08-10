# Sound Bank Registry

`apps/web/src/procedural-music.ts` now defines a shared
`SoundBankInstrumentDefinition` that every generated instrument carries. The
procedural layer still resolves waveform, timbre, and envelope details, but the
registry-facing metadata is now stable and explicit:

- `id` uses `theme:role:clusterX:clusterY`, which stays deterministic for the
  same world-seed inputs.
- `supportedRoles` currently contains the generated role for each instrument,
  which lets debug UIs and future registries reason about compatibility without
  inferring it from family names.
- `recommendedMidiRange`, `preferredMidiRange`, `defaultVelocity`, and
  `defaultNoteDurationMs` live beside the procedural patch data so MIDI/export
  tooling can consume one shared source of truth.
