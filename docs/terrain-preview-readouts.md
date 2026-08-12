# Terrain Preview Readouts

`apps/web/src/terrain-preview-readout.ts` centralizes the interim terrain
readouts used before the full live chunk renderer and authoritative climate
pipeline are finished.

Current responsibilities:

- define one shared preview terrain layer catalog and kind catalog for the app
- derive a deterministic preview biome ID from the current tile kind and
  overworld terrain signals
- resolve one shared preview terrain height through the worldgen terrain-height
  sampler when the deferred readout module is loaded
- resolve the dominant shared-splat layer for one world-space tile
- feed the same preview-biome and dominant-layer logic into both the sextant
  panel and `/debug/terrain-chunks/`

Current limits:

- biome IDs are still an interim Phase 1 proxy, not the final Phase 5 climate
  and biome classification pipeline
- the sextant still falls back to the decorated runtime tile height until the
  deferred terrain preview module has loaded for that session
- the readout samples one tile at a time and does not replace the future live
  chunk material/shader path
