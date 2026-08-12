# Terrain Height Sampler

`@bworlds/worldgen` exposes one interim terrain-height sampler through
`createWorldGenerator(...)`.

Current surface:

- `sampleTerrainHeight(worldX, worldY)` returns the shared preview terrain
  height in canonical world-height units
- `sampleTerrainSurface(worldX, worldY)` adds sea-level and below-sea metadata
- `sampleTerrainSlope(worldX, worldY, sampleStep?)` derives central-difference
  slope from the same shared height sampler
- `terrainHeightSampler` exposes the same height, surface, and slope calls for
  consumers that want one shared sampler object

Current limits:

- this still samples the interim overworld relief curve, not the future fully
  layered authoritative terrain pipeline
- slope is currently local central-difference grade only; aspect, curvature,
  and drainage-derived signals still need separate Phase 2 work
