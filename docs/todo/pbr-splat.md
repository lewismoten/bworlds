# PBR Terrain Splatting

## Core Architecture

- [ ] Create one PBR splat terrain material.
- [ ] Keep splat rendering separate from tile gameplay state.
- [x] Define a terrain material layer interface.
- [x] Define a terrain splat weight interface.
- [x] Keep layer IDs stable across chunks.
- [x] Keep splat data deterministic from the world seed.
- [ ] Share the same splat system across terrain plugins.

## PBR Layer Data

- [ ] Store base color texture per terrain layer.
- [ ] Store normal texture per terrain layer.
- [ ] Store roughness texture per terrain layer.
- [ ] Store metalness texture only when needed.
- [ ] Store ambient occlusion texture when useful.
- [ ] Store texture scale per terrain layer.
- [ ] Store default tint per terrain layer.
- [ ] Store roughness defaults per terrain layer.
- [x] Validate all PBR layer definitions.

## Texture Arrays

- [ ] Use WebGL2 texture arrays for terrain layers.
- [ ] Put matching base color textures into one array.
- [ ] Put matching normal textures into one array.
- [ ] Put matching roughness textures into one array.
- [ ] Keep array texture dimensions consistent.
- [ ] Keep array texture formats consistent.
- [ ] Keep layer indices aligned across all arrays.
- [ ] Add a fallback when texture arrays are unavailable.
- [ ] Report texture array memory usage.

## Terrain Layer Limits

- [x] Set a maximum number of terrain material layers.
- [x] Limit nearby terrain to a small active layer set.
- [x] Keep unused terrain layers out of chunk data.
- [x] Reuse common layers across neighboring chunks.
- [x] Warn when too many layers are active in one chunk.
- [x] Prefer shared layers over creating new variants.

## Splat Weights

- [x] Store terrain blend weights per vertex or sample.
- [x] Keep splat weights normalized to a total of one.
- [x] Clamp invalid splat weights.
- [x] Allow up to four active layers per splat sample.
- [x] Drop very small layer weights when possible.
- [x] Pack splat weights into compact vertex attributes.
- [x] Pack layer indices into compact vertex attributes.
- [ ] Keep weight data stable across terrain LOD changes.

## Terrain Type Mapping

- [x] Map plains terrain to one or more grass layers.
- [x] Map forest floor to grass, soil, and leaf layers.
- [ ] Map dirt terrain to dirt and gravel layers.
- [ ] Map rocky terrain to rock and soil layers.
- [x] Map sand terrain to sand and soil layers.
- [ ] Map snow terrain to snow and exposed ground layers.
- [ ] Map mud terrain to mud and wet soil layers.
- [x] Keep water outside normal ground splatting.

## Boundary Blending

- [ ] Blend terrain types across logical tile boundaries.
- [ ] Avoid hard square borders between terrain types.
- [ ] Generate blend zones from neighboring terrain types.
- [ ] Keep blend widths deterministic.
- [ ] Keep blend weights continuous across chunk edges.
- [ ] Blend road edges into surrounding ground.
- [ ] Blend forest floor gradually into open grass.
- [ ] Blend snow coverage gradually by local conditions.

## Height Integration

- [ ] Use the shared terrain height field for splat geometry.
- [ ] Keep splat weights independent from terrain height.
- [ ] Allow slope to influence material selection.
- [ ] Add more rock weight on steep slopes.
- [ ] Add more soil weight on gentle slopes.
- [x] Allow elevation to influence terrain layers.
- [ ] Keep shared chunk edges identical in height.

## World Influence

- [ ] Allow biome to influence splat material weights.
- [x] Allow moisture to influence splat material weights.
- [ ] Allow temperature to influence splat material weights.
- [ ] Allow season to influence splat material weights.
- [x] Allow roads to override local splat weights.
- [ ] Allow POIs to influence nearby ground appearance.
- [ ] Allow settlement footprints to alter ground layers.
- [ ] Keep world influences deterministic.

## Texture Variation

- [x] Allow several variants per terrain material family.
- [x] Limit each terrain family to a small variant pool.
- [x] Pick texture variants deterministically.
- [ ] Support 90 degree texture rotation.
- [ ] Support texture mirroring.
- [ ] Use UV transforms instead of duplicate textures.
- [ ] Add small tint variation without new materials.
- [ ] Add large-scale tint noise across terrain chunks.

## UV Mapping

- [ ] Use world-space UVs where practical.
- [ ] Keep UV scale consistent across chunk boundaries.
- [ ] Prevent texture seams at chunk borders.
- [ ] Avoid visible repetition at logical tile boundaries.
- [ ] Support per-layer texture scale.
- [ ] Support per-layer UV rotation.
- [ ] Keep UV transforms deterministic.

## Shader

- [ ] Sample terrain layers from texture arrays.
- [ ] Blend base color using splat weights.
- [ ] Blend normal maps using splat weights.
- [ ] Blend roughness using splat weights.
- [ ] Blend metalness only where required.
- [ ] Blend ambient occlusion when enabled.
- [ ] Apply terrain tint after texture blending.
- [ ] Normalize blended normals correctly.
- [ ] Keep shader branches minimal.
- [ ] Keep shader variants bounded.

## Material Reuse

- [ ] Use one shared splat material for compatible chunks.
- [ ] Avoid cloning the splat material per chunk.
- [ ] Pass chunk data through geometry attributes.
- [ ] Pass global settings through shared uniforms.
- [ ] Share texture arrays across terrain chunks.
- [ ] Report shared material reuse counts.
- [ ] Warn when a chunk creates a unique splat material.

## Chunk Generation

- [ ] Generate splat weights while building terrain chunks.
- [ ] Keep splat generation separate from mesh creation.
- [ ] Generate weight data in workers where practical.
- [x] Transfer compact splat buffers to the main thread.
- [ ] Cache splat data with terrain chunk data.
- [ ] Rebuild splat data only when terrain state changes.
- [ ] Avoid rebuilding splat data for camera movement.

## LOD Support

- [ ] Reduce geometry density for distant terrain LODs.
- [ ] Keep terrain layer identities stable across LODs.
- [ ] Preserve chunk edge splat weights across LODs.
- [ ] Preserve major terrain boundaries across LODs.
- [ ] Reduce splat sample density at distant LODs.
- [ ] Avoid visible material popping during LOD changes.
- [ ] Crossfade terrain LODs when needed.

## Roads and Trails

- [ ] Decide whether roads use splats or separate overlays.
- [x] Use splat weights for broad dirt roads where suitable.
- [ ] Use overlays for narrow trails where suitable.
- [ ] Project road overlays onto terrain height.
- [ ] Blend road shoulders into terrain splats.
- [ ] Reuse road materials across all chunks.

## Weather Effects

- [ ] Increase wetness during rain without new materials.
- [ ] Reduce roughness when terrain becomes wet.
- [ ] Darken wet terrain slightly.
- [ ] Add snow weight from weather accumulation.
- [ ] Reduce snow weight during melting.
- [ ] Add mud weight after sustained rain.
- [ ] Keep weather effects separate from base textures.

## Performance

- [ ] Measure draw calls before and after splatting.
- [ ] Measure material counts before and after splatting.
- [ ] Measure texture memory before and after splatting.
- [ ] Measure shader program count after splatting.
- [ ] Measure terrain frame time after splatting.
- [ ] Measure splat generation cost per chunk.
- [ ] Set a terrain splat generation time budget.
- [x] Set a maximum active terrain layer count.
- [ ] Add a lower-quality splat mode when overloaded.

## Debug View

- [ ] Add a splat debug mode to the terrain viewer.
- [ ] Show active layer IDs per terrain sample.
- [ ] Show blend weights as debug colors.
- [ ] Show one layer at a time.
- [ ] Show terrain texture array indices.
- [ ] Show chunk splat memory usage.
- [ ] Show active layer count per chunk.
- [ ] Show dominant terrain layer per cell.
- [ ] Add toggles for color, normal, and roughness maps.
- [ ] Add a toggle to disable splat blending.

## Validation

- [x] Reject splat weights containing NaN values.
- [x] Reject splat weights outside zero to one.
- [ ] Reject samples whose weights do not sum near one.
- [x] Reject invalid terrain layer indices.
- [ ] Reject texture arrays with mismatched dimensions.
- [ ] Warn about unused terrain texture layers.
- [ ] Warn about chunks using too many terrain layers.
- [ ] Warn about hard terrain boundaries with no blend zone.

## Tests

- [x] Test splat weights always normalize to one.
- [x] Test adjacent chunks share border splat weights.
- [ ] Test terrain layers stay stable for one seed.
- [ ] Test mixed terrain renders in one chunk.
- [ ] Test texture rotation does not add new materials.
- [ ] Test tint variation does not add new materials.
- [ ] Test distant LOD keeps major terrain boundaries.
- [ ] Test roads blend with surrounding terrain.
- [ ] Test slope can increase rock material weight.
- [ ] Test weather can alter wetness without new materials.
- [ ] Test splatting reduces terrain material count.
- [ ] Test splatting reduces terrain draw calls.

## Initial Delivery

- [ ] Build one chunk with grass and dirt splat layers.
- [ ] Add one shared PBR splat material.
- [ ] Blend two terrain layers from vertex weights.
- [ ] Add base color texture array support.
- [ ] Add normal map texture array support.

## Progress Notes

- Added compact packed splat sample support in
  `@bworlds/terrain-splat-support` using `Uint8Array(4)` layer indices and
  `Uint8Array(4)` weights that rebalance to a total of `255`, with round-trip
  and validation tests for unknown indices and fallback packing.
- Added deterministic terrain kind splat mapping in
  `@bworlds/terrain-splat-support` so seed, coordinates, tile kind, and
  overworld terrain signals resolve to normalized reusable splat samples
  without renderer coupling. The recommended overworld mapping currently covers
  plains, forest, mountain, shore, road, and water/crossing exclusions.
- Added `@bworlds/terrain-splat-support/sample-grid` to build chunk-like
  splat sample grids, preserve matching border samples across adjacent chunks,
  and flatten packed samples into contiguous `Uint8Array` buffers for transfer.
- Added chunk usage summaries in
  `@bworlds/terrain-splat-support/sample-grid` to report active and unused
  layers, dominant layer usage, unique layer combinations, and chunk-level
  warnings when terrain layer budgets are exceeded.
- Added `@bworlds/terrain-splat-support/variant-pool` to define bounded terrain
  material families and resolve deterministic layer variants from a shared pool
  instead of creating ad hoc per-chunk variants.
- Added `@bworlds/terrain-splat-support/layer-pool-plan` to rank chunk layer
  usage across a neighborhood, choose one bounded shared active layer set, and
  report which chunk layers still overflow the shared budget.
- [ ] Add roughness texture array support.
- [ ] Add a debug view for layer weights.
- [ ] Compare performance against old tile materials.

## Second Delivery

- [ ] Add four-layer blending.
- [ ] Add forest, rock, sand, and road layers.
- [ ] Add terrain boundary blending.
- [ ] Add deterministic texture variants.
- [ ] Add UV rotation and mirroring.
- [ ] Add biome-driven splat weights.
- [ ] Add slope-driven splat weights.
- [ ] Add LOD support.

## Third Delivery

- [ ] Add weather-driven wetness.
- [ ] Add snow accumulation blending.
- [ ] Add mud accumulation blending.
- [ ] Add seasonal terrain tinting.
- [ ] Add worker-based splat generation.
- [ ] Add performance limits and regression tests.

Progress: `@bworlds/terrain-splat-support` now provides the first shared PBR
splat foundation package with validated `TerrainMaterialLayerDefinition`
entries, stable catalog indexing by layer ID, bounded `TerrainSplatSample` /
`TerrainSplatWeight` normalization, compact packed sample buffers, and
deterministic terrain-kind mapping from seed plus world signals. Architecture
notes live in `packages/terrain-splat-support/docs/foundations.md` and
`packages/terrain-splat-support/docs/deterministic-mapping.md`, plus
`packages/terrain-splat-support/docs/chunk-sample-grids.md` and
`packages/terrain-splat-support/docs/variant-pools.md`, plus
`packages/terrain-splat-support/docs/neighborhood-layer-pools.md`, and focused
tests cover normalization, packing, validation, deterministic mapping, chunk
border stability, chunk layer-usage analysis, bounded family variant selection,
and neighborhood shared-layer planning.

# Roads and Paths as Terrain Splats

- [ ] Represent simple roads as terrain splat layers.
- [ ] Represent trails as terrain splat layers.
- [ ] Represent worn paths as terrain splat layers.
- [ ] Remove separate road meshes where splatting is sufficient.
- [ ] Keep road gameplay data separate from road rendering.
- [ ] Project road splat weights onto the terrain height field.
- [ ] Generate road width from route metadata.
- [ ] Generate soft shoulder weights around road edges.
- [ ] Blend roads gradually into surrounding terrain.
- [ ] Let trails use narrower blend zones than roads.
- [ ] Allow road surface type to choose a PBR layer.
- [ ] Support dirt road splat layers.
- [ ] Support gravel road splat layers.
- [ ] Support stone road splat layers.
- [ ] Support grass trail splat layers.
- [ ] Support muddy road splat layers.
- [ ] Keep road splats continuous across chunk boundaries.
- [ ] Keep road width continuous across chunk boundaries.
- [ ] Keep route intersections continuous across chunks.
- [ ] Blend junctions without overlapping road meshes.
- [ ] Generate crossroads from combined splat weights.
- [ ] Generate curved roads from route distance fields.
- [ ] Avoid forcing roads to follow square tile edges.
- [ ] Allow roads to curve inside logical terrain cells.
- [ ] Use world-space route data to generate splat weights.
- [ ] Keep route splats deterministic from world data.
- [ ] Add wheel rut variation to dirt roads.
- [ ] Add worn centers to heavily traveled paths.
- [ ] Add edge grass where roads receive little traffic.
- [ ] Let traffic intensity influence road appearance.
- [ ] Let weather influence road wetness and mud.
- [ ] Let snow partially cover road splat layers.
- [ ] Keep bridges as separate geometry.
- [ ] Keep tunnels as separate geometry.
- [ ] Keep raised causeways as separate geometry.
- [ ] Keep stairs separate when actual steps are required.
- [ ] Keep retaining walls separate from terrain splats.
- [ ] Detect when a route requires real geometry.
- [ ] Fall back to road geometry for unsupported cases.
- [ ] Show route splat weights in terrain debug mode.
- [ ] Add a toggle for road and path splat layers.
- [ ] Compare splat roads against mesh road draw calls.
- [ ] Test roads follow terrain height without gaps.
- [ ] Test roads remain continuous across chunk borders.
- [ ] Test intersections blend without visible seams.
