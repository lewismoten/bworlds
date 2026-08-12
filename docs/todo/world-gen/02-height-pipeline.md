# Shared Height Pipeline

## Authoritative API

- [x] Define one world-space terrain height sampling interface.
- [x] Accept world X and Y in stable world units.
- [x] Return height in one canonical world unit.
- [x] Add feet to world-unit conversion helpers.
- [x] Keep sea level at one stable reference.
- [x] Support coarse and fine height queries.
- [x] Cache expensive regional height inputs.

## Layer Composition

- [x] Define an ordered height influence plugin interface.
- [x] Let plugins add or subtract height influence.
- [x] Let plugins declare sampling resolution and bounds.
- [ ] Compose continent uplift before mountain detail.
- [ ] Compose mountain detail before river carving.
- [ ] Compose river carving before route grading.
- [ ] Compose bridge and tunnel grading after hydrology.
- [ ] Keep render-only noise out of authoritative height.

## Shared Consumers

- [ ] Make terrain geometry sample the height API.
- [ ] Make player and camera grounding sample the height API.
- [ ] Make collision sample the height API.
- [ ] Make roads and rails sample the height API.
- [ ] Make river carving sample the height API.
- [ ] Make settlement placement query slope from height.
- [ ] Make vegetation query slope from height.
- [ ] Make map contours sample the same height API.

## Derived Data

- [x] Add slope sampling.
- [x] Add aspect sampling.
- [x] Add local curvature sampling.
- [x] Add drainage-gradient sampling.
- [x] Add regional height range sampling.
- [x] Add sea-depth sampling below sea level.

## Validation

- [x] Reject NaN and infinite height values.
- [x] Clamp impossible heights after all layers compose.
- [ ] Log the plugin that caused an invalid height.
- [x] Test deterministic height sampling.
- [x] Test exact chunk border height equality.
- [x] Test player height against rendered terrain height.

Current support:

- `@bworlds/worldgen` now exposes one reusable
  `terrainHeightSampler.sampleHeight(worldX, worldY)` and
  `terrainHeightSampler.sampleSurface(worldX, worldY)` contract from
  `createWorldGenerator(...)`, with `WORLD_TERRAIN_SEA_LEVEL` fixed at `0`
  and feet conversion helpers derived from the documented `250` meters-per-tile
  world scale.
- `@bworlds/worldgen` now exposes deterministic preview surface-height
  sampling through `createWorldGenerator().sampleTerrainHeight(x, y)`, while
  `samplePreviewSurfaceHeight(x, y)` remains as the compatibility alias for
  older callers that still use the preview-specific name.
- That same height sampler now also accepts `{ resolution: 'coarse' | 'fine' }`
  so callers can choose snapped whole-cell sampling or snapped quarter-cell
  sub-sampling without forking the terrain source; slope, curvature, range, and
  sea-depth queries accept the same resolution-aware path too.
- `apps/web` now routes the sextant terrain-height readout through that shared
  `sampleTerrainHeight(x, y)` path whenever the deferred terrain preview module
  is loaded, while keeping the decorated runtime tile height as the temporary
  bootstrap fallback until that module resolves.
- `@bworlds/worldgen` now also exposes
  `sampleTerrainSlope(worldX, worldY, sampleStep?)`, which derives one local
  central-difference grade from the same shared terrain-height sampler and
  keeps that slope query on `terrainHeightSampler.sampleSlope(...)` too; see
  `packages/worldgen/docs/terrain-height-sampler.md`.
- That same sampler now also exposes
  `sampleTerrainAspect(worldX, worldY, sampleStep?)`, which derives one local
  aspect angle from the shared slope sample and returns `null` for flat terrain.
- It now also exposes `sampleTerrainCurvature(worldX, worldY, sampleStep?)`,
  which derives one local second-difference curvature sample from the same
  shared terrain-height path.
- It now also exposes
  `sampleTerrainDrainageGradient(worldX, worldY, sampleStep?)`, which derives
  one local downhill vector plus a simple neighboring convergence summary from
  that same shared height field.
- It now also exposes
  `sampleTerrainHeightRange({ minX, maxX, minY, maxY, sampleStep? })`, which
  derives one sampled min/max height summary for an explicit world-space
  region.
- Repeated identical regional height-range queries now reuse one bounded cache
  entry keyed by normalized bounds, sample step, and coarse-or-fine query
  resolution instead of rescanning the same world-space region each time.
- It now also exposes `sampleTerrainSeaDepth(worldX, worldY)`, which turns the
  shared surface sample into one explicit sea-depth result with
  `depthBelowSeaLevel` and `isBelowSeaLevel`.
- The shared worldgen height path now also validates that sampled terrain
  heights stay finite before they are cached or summarized, via
  `validateTerrainHeightValue(...)`.
- That same path now also clamps post-compose heights through
  `clampTerrainHeightValue(...)` before validation and caching, so one shared
  world-height range stays enforced at the sampler boundary.
- `packages/worldgen/src/index.test.ts` now also calls out deterministic
  `sampleTerrainHeight(...)` behavior explicitly and verifies that adjacent
  chunk-border sample coordinates resolve exactly equal heights on both sides
  of east-west and south-north seams.
- That same runtime test coverage now also verifies that the player-facing
  state tile in `createWorldRuntime(...)` resolves the same `surfaceHeight` as
  the shared `sampleTerrainHeight(...)` query at the active player position.
- `map-overworld` now also keeps stateful tile-cache entries separate from
  stateless reads and fills missing runtime `surfaceHeight` values from the
  shared overworld relief function before caching the player-facing tile.
- The preview height sampler uses the same overworld terrain signals and relief
  curve as the current runtime relief decorator, so map previews and future
  shared terrain callers can query one reusable world-space surface height
  entry point before the full authoritative layered height pipeline lands.
- `@bworlds/worldgen` now also exposes one dedicated terrain-height influence
  plugin contract through `createWorldTerrainHeightInfluencePlugin(...)`,
  `sortWorldTerrainHeightInfluencePlugins(...)`, and
  `sampleWorldTerrainHeightInfluences(...)`; see
  `packages/worldgen/docs/terrain-height-influence-plugins.md`.
- That contract lets each height-layer plugin contribute one signed height
  delta, declare deterministic execution order, and limit itself to explicit
  world-space bounds and coarse or fine query resolutions without tying the
  authoritative height path to renderer-only noise.
- `createWorldGenerator(...)` now routes its current preview terrain-height
  query through one sorted `overworld-relief` influence stack, so the existing
  relief-based height sampler already uses the ordered plugin composition path
  instead of a package-local one-off formula.
- That same generator entry point now also accepts `heightInfluencePlugins`,
  which lets callers compose ordered uplift, carving, grading, and other
  signed height-delta layers directly into the shared terrain sampler while
  keeping invalid sampled values attributed to the plugin that produced them.
