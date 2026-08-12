# Shared Height Pipeline

## Authoritative API

- [x] Define one world-space terrain height sampling interface.
- [x] Accept world X and Y in stable world units.
- [x] Return height in one canonical world unit.
- [x] Add feet to world-unit conversion helpers.
- [x] Keep sea level at one stable reference.
- [ ] Support coarse and fine height queries.
- [ ] Cache expensive regional height inputs.

## Layer Composition

- [ ] Define an ordered height influence plugin interface.
- [ ] Let plugins add or subtract height influence.
- [ ] Let plugins declare sampling resolution and bounds.
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
- [ ] Add drainage-gradient sampling.
- [x] Add regional height range sampling.
- [ ] Add sea-depth sampling below sea level.

## Validation

- [ ] Reject NaN and infinite height values.
- [ ] Clamp impossible heights after all layers compose.
- [ ] Log the plugin that caused an invalid height.
- [ ] Test deterministic height sampling.
- [ ] Test exact chunk border height equality.
- [ ] Test player height against rendered terrain height.

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
  `sampleTerrainHeightRange({ minX, maxX, minY, maxY, sampleStep? })`, which
  derives one sampled min/max height summary for an explicit world-space
  region.
- The preview height sampler uses the same overworld terrain signals and relief
  curve as the current runtime relief decorator, so map previews and future
  shared terrain callers can query one reusable world-space surface height
  entry point before the full authoritative layered height pipeline lands.
