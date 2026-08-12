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

- [x] Store base color texture per terrain layer.
- [x] Store normal texture per terrain layer.
- [x] Store roughness texture per terrain layer.
- [x] Store metalness texture only when needed.
- [x] Store ambient occlusion texture when useful.
- [x] Store texture scale per terrain layer.
- [x] Store default tint per terrain layer.
- [x] Store roughness defaults per terrain layer.
- [x] Validate all PBR layer definitions.

## Texture Arrays

- [ ] Use WebGL2 texture arrays for terrain layers.
- [x] Put matching base color textures into one array.
- [x] Put matching normal textures into one array.
- [x] Put matching roughness textures into one array.
- [x] Keep array texture dimensions consistent.
- [x] Keep array texture formats consistent.
- [x] Keep layer indices aligned across all arrays.
- [x] Add a fallback when texture arrays are unavailable.
- [x] Report texture array memory usage.

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
- [x] Keep weight data stable across terrain LOD changes.

## Terrain Type Mapping

- [x] Map plains terrain to one or more grass layers.
- [x] Map forest floor to grass, soil, and leaf layers.
- [x] Map dirt terrain to dirt and gravel layers.
- [x] Map rocky terrain to rock and soil layers.
- [x] Map sand terrain to sand and soil layers.
- [x] Map snow terrain to snow and exposed ground layers.
- [x] Map mud terrain to mud and wet soil layers.
- [x] Keep water outside normal ground splatting.

## Boundary Blending

- [x] Blend terrain types across logical tile boundaries.
- [x] Avoid hard square borders between terrain types.
- [x] Generate blend zones from neighboring terrain types.
- [x] Keep blend widths deterministic.
- [x] Keep blend weights continuous across chunk edges.
- [x] Blend road edges into surrounding ground.
- [x] Blend forest floor gradually into open grass.
- [x] Blend snow coverage gradually by local conditions.

## Height Integration

- [ ] Use the shared terrain height field for splat geometry.
- [ ] Keep splat weights independent from terrain height.
- [x] Allow slope to influence material selection.
- [x] Add more rock weight on steep slopes.
- [x] Add more soil weight on gentle slopes.
- [x] Allow elevation to influence terrain layers.
- [ ] Keep shared chunk edges identical in height.

## World Influence

- [x] Allow biome to influence splat material weights.
- [x] Allow moisture to influence splat material weights.
- [x] Allow temperature to influence splat material weights.
- [x] Allow season to influence splat material weights.
- [x] Allow roads to override local splat weights.
- [x] Allow POIs to influence nearby ground appearance.
- [x] Allow settlement footprints to alter ground layers.
- [x] Keep world influences deterministic.

## Texture Variation

- [x] Allow several variants per terrain material family.
- [x] Limit each terrain family to a small variant pool.
- [x] Pick texture variants deterministically.
- [x] Support 90 degree texture rotation.
- [x] Support texture mirroring.
- [x] Use UV transforms instead of duplicate textures.
- [x] Add small tint variation without new materials.
- [x] Add large-scale tint noise across terrain chunks.

## UV Mapping

- [x] Use world-space UVs where practical.
- [x] Keep UV scale consistent across chunk boundaries.
- [x] Prevent texture seams at chunk borders.
- [x] Avoid visible repetition at logical tile boundaries.
- [x] Support per-layer texture scale.
- [x] Support per-layer UV rotation.
- [x] Keep UV transforms deterministic.

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

- [x] Generate splat weights while building terrain chunks.
- [x] Keep splat generation separate from mesh creation.
- [x] Generate weight data in workers where practical.
- [x] Transfer compact splat buffers to the main thread.
- [x] Cache splat data with terrain chunk data.
- [x] Rebuild splat data only when terrain state changes.
- [x] Avoid rebuilding splat data for camera movement.

## LOD Support

- [ ] Reduce geometry density for distant terrain LODs.
- [x] Keep terrain layer identities stable across LODs.
- [x] Preserve chunk edge splat weights across LODs.
- [x] Preserve major terrain boundaries across LODs.
- [x] Reduce splat sample density at distant LODs.
- [ ] Avoid visible material popping during LOD changes.
- [ ] Crossfade terrain LODs when needed.

## Roads and Trails

- [ ] Decide whether roads use splats or separate overlays.
- [x] Use splat weights for broad dirt roads where suitable.
- [ ] Use overlays for narrow trails where suitable.
- [ ] Project road overlays onto terrain height.
- [x] Blend road shoulders into terrain splats.
- [ ] Reuse road materials across all chunks.

## Weather Effects

- [x] Increase wetness during rain without new materials.
- [x] Reduce roughness when terrain becomes wet.
- [x] Darken wet terrain slightly.
- [x] Add snow weight from weather accumulation.
- [x] Reduce snow weight during melting.
- [x] Add mud weight after sustained rain.
- [x] Keep weather effects separate from base textures.

## Performance

- [ ] Measure draw calls before and after splatting.
- [ ] Measure material counts before and after splatting.
- [ ] Measure texture memory before and after splatting.
- [ ] Measure shader program count after splatting.
- [ ] Measure terrain frame time after splatting.
- [x] Measure splat generation cost per chunk.
- [x] Set a terrain splat generation time budget.
- [x] Set a maximum active terrain layer count.
- [x] Add a lower-quality splat mode when overloaded.

## Debug View

- [ ] Add a splat debug mode to the terrain viewer.
- [x] Show active layer IDs per terrain sample.
- [x] Show blend weights as debug colors.
- [x] Show one layer at a time.
- [x] Show terrain texture array indices.
- [x] Show chunk splat memory usage.
- [x] Show active layer count per chunk.
- [x] Show dominant terrain layer per cell.
- [x] Add toggles for color, normal, and roughness maps.
- [x] Add a toggle to disable splat blending.

## Validation

- [x] Reject splat weights containing NaN values.
- [x] Reject splat weights outside zero to one.
- [x] Reject samples whose weights do not sum near one.
- [x] Reject invalid terrain layer indices.
- [x] Reject texture arrays with mismatched dimensions.
- [x] Warn about unused terrain texture layers.
- [x] Warn about chunks using too many terrain layers.
- [x] Warn about hard terrain boundaries with no blend zone.

## Tests

- [x] Test splat weights always normalize to one.
- [x] Test adjacent chunks share border splat weights.
- [x] Test terrain layers stay stable for one seed.
- [x] Test mixed terrain renders in one chunk.
- [x] Test texture rotation does not add new materials.
- [x] Test tint variation does not add new materials.
- [x] Test distant LOD keeps major terrain boundaries.
- [x] Test roads blend with surrounding terrain.
- [x] Test slope can increase rock material weight.
- [x] Test weather can alter wetness without new materials.
- [x] Test splatting reduces terrain material count.
- [x] Test splatting reduces terrain draw calls.

## Initial Delivery

- [x] Build one chunk with grass and dirt splat layers.
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
- Added optional hard-boundary analysis in
  `@bworlds/terrain-splat-support/sample-grid` so neighboring single-layer
  transitions with no blend zone can be flagged before renderer integration.
- Added `@bworlds/terrain-splat-support/variant-pool` to define bounded terrain
  material families and resolve deterministic layer variants from a shared pool
  instead of creating ad hoc per-chunk variants.
- Added `@bworlds/terrain-splat-support/layer-pool-plan` to rank chunk layer
  usage across a neighborhood, choose one bounded shared active layer set, and
  report which chunk layers still overflow the shared budget.
- Integrated terrain-kind splat mapping with shared material families so kinds
  can resolve deterministic bounded variants through `baseFamilyId` instead of
  embedding raw variant arrays.
- Added `@bworlds/terrain-splat-support/texture-array-plan` to build renderer-
  free base-color, normal, roughness, and optional-map texture-array plans
  from the shared layer catalog, keep layer indices aligned across array
  purposes, reject mismatched dimensions or formats before WebGL upload, and
  estimate array memory usage for future terrain budget tooling.
- Added active-layer subset support to
  `@bworlds/terrain-splat-support/texture-array-plan` so optional metalness and
  ambient-occlusion arrays can be planned only for participating chunk layers.
  Plan sets now report skipped unused catalog layers and unknown requested
  layers before renderer upload code exists.
- Added deterministic terrain UV transform support in
  `@bworlds/terrain-splat-support` so terrain layers can advertise quarter-turn
  rotation and axis mirroring without duplicating textures. The support
  package now validates those options and resolves one stable transform from
  seed, world position, and layer ID for later shared-material integration.
- Added world-space UV sampling support in
  `@bworlds/terrain-splat-support` so layer texture scale, rotation, and
  mirroring can project border-safe repeated UV samples directly from world
  coordinates before renderer integration.
- Added deterministic tint-variation support in
  `@bworlds/terrain-splat-support` so terrain layers can resolve small color
  drift from seed, world position, layer ID, and terrain kind without adding
  new textures or per-chunk materials.
- Added cell-based tint fields in
  `@bworlds/terrain-splat-support` so nearby terrain can share the same
  low-frequency tint drift across broader world-space regions while staying
  deterministic from seed and layer metadata.
- Added focused material-invariance tests in
  `@bworlds/terrain-splat-support` so deterministic UV rotation/mirroring and
  tint variation are locked to metadata-only behavior and do not imply new
  shared material identities for the same terrain layer catalog entry.
- Added a renderer-free texture binding fallback contract in
  `@bworlds/terrain-splat-support/texture-array-plan` so the shared terrain
  layer catalog can resolve either aligned WebGL2 array plans or per-layer
  texture fallback bindings with stable layer slots, warnings, and memory
  estimates when texture arrays are unavailable.
- Added `applyTerrainSplatWeatherEffects(...)` in
  `@bworlds/terrain-splat-support` so current weather, sustained wetness, snow
  accumulation, and melting can overlay shared `mud` and `snow` layer weights
  plus wetness-driven roughness/tint metadata without mutating the
  deterministic base terrain sample.
- Added `resolveTerrainMaterialLayerSeasonalTintTransform(...)` in
  `@bworlds/terrain-splat-support` so shared layer tint metadata can apply
  deterministic spring, summer, autumn, or winter color shifts on top of the
  existing tint-variation path without introducing season-specific materials.
- Added low-frequency `uvMacroVariationCellSize` /
  `uvMacroVariationStrength` support in `@bworlds/terrain-splat-support` so
  world-space UV sampling can decorrelate repeated wrapped phases across broad
  terrain regions without reintroducing seams at logical tile boundaries.
- Added `createTerrainSplatChunkPreview(...)` in
  `@bworlds/terrain-splat-support/sample-grid` so one chunk build can expose
  dominant layers, mixed-cell counts, and render-free active-layer previews for
  grass/dirt/road/forest chunk validation before shared material integration.
- Synced the second-delivery checklist with implemented support-package
  coverage for four-layer normalization, forest/rock/sand/road mappings,
  deterministic terrain boundary blending, bounded deterministic texture
  variants, and biome-driven splat weighting that are already covered by the
  current tests and package docs.
- Added `createAdaptiveTerrainSplatSampleGrid(...)` in
  `@bworlds/terrain-splat-support/sample-grid` so chunk generation can measure
  splat build cost, compare it against a time budget, and retry with a coarser
  deterministic LOD grid when overloaded.
- Added `@bworlds/terrain-splat-support/worker-contract` so chunk tile inputs,
  packed splat outputs, transferables, and adaptive build metrics can move
  through one serializable worker request/result contract without coupling
  splat generation to mesh creation.
- Added `@bworlds/terrain-splat-support/chunk-cache` so chunk splat data can
  reuse one bounded cache keyed to terrain state, ignore camera-only movement,
  and rebuild only when the serialized chunk inputs or terrain revision change.
- Added `@bworlds/terrain-splat-support/chunk-build` so terrain chunk builders
  can generate packed splat weights through one cache-aware entry point without
  coupling splat generation to mesh creation.
- Added `@bworlds/terrain-splat-support/debug-view` so chunk splat grids can
  expose per-sample active layer IDs, dominant layers, one-layer weight views,
  blend colors, texture-array indices, and packed memory usage before any
  terrain viewer UI is wired up.
- [x] Add roughness texture array support.
- [ ] Add a debug view for layer weights.
- [ ] Compare performance against old tile materials.

## Second Delivery

- [x] Add four-layer blending.
- [x] Add forest, rock, sand, and road layers.
- [x] Add terrain boundary blending.
- [x] Add deterministic texture variants.
- [x] Add UV rotation and mirroring.
- [x] Add biome-driven splat weights.
- [x] Add slope-driven splat weights.
- [x] Add LOD support.

## Third Delivery

- [x] Add weather-driven wetness.
- [x] Add snow accumulation blending.
- [x] Add mud accumulation blending.
- [x] Add seasonal terrain tinting.
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
`packages/terrain-splat-support/docs/neighborhood-layer-pools.md`, plus
`packages/terrain-splat-support/docs/texture-array-plans.md`, plus
`packages/terrain-splat-support/docs/uv-transforms.md`, plus
`packages/terrain-splat-support/docs/tint-variation.md`, plus
`packages/terrain-splat-support/docs/weather-effects.md`, plus
`packages/terrain-splat-support/docs/seasonal-tinting.md`, and focused tests
cover normalization, packing, validation, deterministic mapping, chunk border
stability, chunk layer-usage analysis, bounded family variant selection,
neighborhood shared-layer planning, stable terrain family resolution for the
same seed, texture-array plan validation for aligned dimensions, formats, and
memory estimates, plus deterministic UV rotation, mirroring, macro phase
variation, tint variation, and seasonal tint resolution, plus world-space UV
scale and seam continuity, plus deterministic temperature- and season-aware
blend conditions so the shared overworld splat mapping can add cold winter
snow cover to plains and forest ground without coupling climate-sensitive
terrain blending to renderer code, plus deterministic biome-aware blend
conditions so the same shared mapping can shift plains and forest ground toward
coastal or wetland mixes without inventing plugin-specific splat rules, plus
deterministic slope-aware blend conditions so the shared overworld splat
mapping can favor gentler soil mixes or steeper exposed rock without coupling
slope rules to renderer code, plus deterministic POI and settlement influence
conditions so nearby landmarks and settlement footprints can bias dirt,
gravel, or clearing layers without embedding plugin-specific ground rules into
renderer code, plus deterministic sample-grid blend zones driven by
neighboring world samples so forest-floor and snow transitions can taper
across chunk boundaries without depending on renderer-only smoothing, plus
deterministic coarse sample-grid LOD aggregation so distant terrain can reduce
splat density while preserving major terrain identities and matching
chunk-edge weights from the same world-space inputs, plus road-aware
sample-grid shoulder weighting so broad road tiles can bleed deterministic
dirt/gravel edge material into adjacent terrain without needing renderer-only
overlays, plus render-free chunk preview summaries so one chunk can expose
dominant layers and mixed-cell coverage before shader work exists, plus
deterministic weather overlays so rain, snow accumulation, melting, and
sustained wetness can adjust terrain splat weights and wetness metadata
without changing the shared base sample identity, plus deterministic seasonal
tint overlays so spring, summer, autumn, and winter can shift shared layer
color metadata without changing material identity.

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
