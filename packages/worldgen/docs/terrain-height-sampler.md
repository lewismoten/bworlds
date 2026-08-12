# Terrain Height Sampler

`@bworlds/worldgen` exposes one interim terrain-height sampler through
`createWorldGenerator(...)`.

Current surface:

- `sampleTerrainHeight(worldX, worldY)` returns the shared preview terrain
  height in canonical world-height units
- `sampleTerrainHeight(worldX, worldY, { resolution })` supports both
  `'coarse'` snapped cell queries and `'fine'` quarter-cell sub-samples
- `sampleTerrainSurface(worldX, worldY, { resolution? })` adds sea-level and
  below-sea metadata from that same coarse-or-fine query path
- `sampleTerrainSlope(worldX, worldY, sampleStepOrOptions?)` derives
  central-difference slope from the same shared height sampler
- `sampleTerrainAspect(worldX, worldY, sampleStep?)` derives one local aspect
  angle from that same slope sample, or `null` for flat or near-flat terrain
- `sampleTerrainCurvature(worldX, worldY, sampleStepOrOptions?)` derives one
  local second-difference curvature sample from the same height path
- `sampleTerrainHeightRange({ minX, maxX, minY, maxY, sampleStep?,
resolution? })` derives one sampled min/max height summary for an explicit
  world-space region
- `sampleTerrainSeaDepth(worldX, worldY, { resolution? })` exposes one explicit
  below-sea summary from the shared surface sample
- `terrainHeightSampler` exposes the same height, surface, slope, aspect,
  curvature, range, and sea-depth calls for consumers that want one shared
  sampler object
- `validateTerrainHeightValue(height, label?)` is the shared finite-value guard
  used by the sampler path before height values are cached or summarized
- `clampTerrainHeightValue(height, bounds?)` is the shared post-compose clamp
  used by the sampler path before validated heights are cached

Current limits:

- this still samples the interim overworld relief curve, not the future fully
  layered authoritative terrain pipeline
- coarse queries snap to whole-cell world coordinates and fine queries snap to
  quarter-cell coordinates so the sampler stays deterministic and cacheable
- slope, aspect, and curvature are currently local finite-difference
  derivatives only; drainage-derived signals still need separate Phase 2 work
