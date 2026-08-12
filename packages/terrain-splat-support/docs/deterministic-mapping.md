# Deterministic Terrain Splat Mapping

`@bworlds/terrain-splat-support` now includes a renderer-free mapping layer for
turning deterministic world inputs into normalized terrain splat samples.

Inputs:

- `seed`
- world coordinates `x` and `y`
- tile `kind`
- optional `OverworldSignals` such as `moisture`, `elevation`, `riverSignal`,
  and `roadSignal`

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
- `createOverworldTerrainSplatDefinitions(...)` provides one recommended
  overworld mapping set for `plains`, `forest`, `mountain`, `shore`, `road`,
  and water/crossing exclusions

Why this matters:

- chunk generation can now build splat samples from world data without touching
  renderer code
- terrain plugins can share one mapping contract instead of inventing
  plugin-specific splat rules
- later texture-array and material work can consume deterministic, already
  normalized samples

Current scope:

- base-layer variation is deterministic from seed plus world coordinates
- moisture, elevation, and road signal thresholds can influence blend weights
- `river`, `ocean`, `bridge`, and `dock` are excluded from normal ground
  splatting in the recommended overworld definitions
- this layer does not yet generate per-vertex geometry attributes or render
  terrain materials
