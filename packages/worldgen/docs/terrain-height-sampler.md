# Terrain Height Sampler

`@bworlds/worldgen` exposes one interim terrain-height sampler through
`createWorldGenerator(...)`.

Current surface:

- `sampleTerrainHeight(worldX, worldY)` returns the shared preview terrain
  height in canonical world-height units
- `sampleTerrainSurface(worldX, worldY)` adds sea-level and below-sea metadata
- `sampleTerrainSlope(worldX, worldY, sampleStep?)` derives central-difference
  slope from the same shared height sampler
- `sampleTerrainAspect(worldX, worldY, sampleStep?)` derives one local aspect
  angle from that same slope sample, or `null` for flat or near-flat terrain
- `sampleTerrainCurvature(worldX, worldY, sampleStep?)` derives one local
  second-difference curvature sample from the same height path
- `terrainHeightSampler` exposes the same height, surface, slope, aspect, and
  curvature calls for consumers that want one shared sampler object

Current limits:

- this still samples the interim overworld relief curve, not the future fully
  layered authoritative terrain pipeline
- slope, aspect, and curvature are currently local finite-difference
  derivatives only; drainage-derived signals still need separate Phase 2 work
