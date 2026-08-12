# Deterministic Terrain Splat Mapping

`@bworlds/terrain-splat-support` now includes a renderer-free mapping layer for
turning deterministic world inputs into normalized terrain splat samples.

Inputs:

- `seed`
- world coordinates `x` and `y`
- tile `kind`
- optional `OverworldSignals` such as `moisture`, `elevation`, `riverSignal`,
  and `roadSignal`, plus terrain-local `temperature` and `season` inputs when
  the caller wants climate-sensitive ground blending, plus an optional `biome`
  label when neighboring-world context should influence the chosen ground mix,
  and an optional normalized `slope` value when local terrain steepness should
  influence the selected ground blend

Outputs:

- one normalized `TerrainSplatSample`
- up to four active layers
- stable base-layer variant selection for the same seed and coordinates

Current mapping model:

- `createTerrainKindSplatCatalog(...)` validates reusable terrain-kind mapping
  definitions against the shared terrain layer catalog
- `resolveTerrainKindSplatSample(...)` picks one deterministic base layer for a
  tile kind, applies conditional blend layers from terrain signals, and
  normalizes the result
- terrain-kind mappings can resolve their base layer from either explicit
  `baseLayerIds` or one shared `baseFamilyId`
- `createOverworldTerrainSplatDefinitions(...)` provides one recommended
  overworld mapping set for `plains`, `forest`, `mountain`, `shore`, `dirt`,
  `path`, `road`, `rocky`, `snow`, `mud`, and water/crossing exclusions
- `createTerrainSplatSampleGrid(...)` resolves chunk-like bounds into a stable
  sample grid that adjacent chunks can share along matching borders
- `packTerrainSplatSampleGrid(...)` flattens that grid into contiguous
  `Uint8Array` buffers for worker or renderer handoff

Why this matters:

- chunk generation can now build splat samples from world data without touching
  renderer code
- terrain plugins can share one mapping contract instead of inventing
  plugin-specific splat rules
- later texture-array and material work can consume deterministic, already
  normalized samples

Current scope:

- base-layer variation is deterministic from seed plus world coordinates
- moisture, elevation, slope, road signal, temperature, season, and biome
  thresholds can influence blend weights
- recommended mappings now cover exposed-ground snow blends plus dirt, mud, and
  rocky surface mixes without renderer-specific rules, and can now add light
  winter snow cover to plains and forest ground when the caller resolves cold
  seasonal signals through the shared mapping layer, plus coastal sand or
  wetland soil bias when the caller resolves biome labels through the same
  deterministic contract, plus gentler soil bias or steeper rock bias when the
  caller resolves local slope through that same shared mapping contract
- `river`, `ocean`, `bridge`, and `dock` are excluded from normal ground
  splatting in the recommended overworld definitions
- packed sample grids quantize weights to `Uint8`, so unpacked weights preserve
  layer identity and normalized totals with small bounded error
- this layer does not yet generate per-vertex geometry attributes or render
  terrain materials
