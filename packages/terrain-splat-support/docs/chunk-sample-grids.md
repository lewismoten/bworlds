# Terrain Splat Chunk Sample Grids

`@bworlds/terrain-splat-support/sample-grid` provides a chunk-oriented layer on
top of deterministic terrain-kind mapping.

Main responsibilities:

- resolve a rectangular world-space bounds into one normalized splat sample per
  grid coordinate
- optionally blend neighboring terrain samples into deterministic transition
  zones around logical terrain boundaries
- preserve identical border samples when adjacent chunks request the same world
  coordinates
- flatten packed samples into contiguous `Uint8Array` layer-index and weight
  buffers for transfer or upload

Current API:

- `createTerrainSplatSampleGrid(...)`
- `getTerrainSplatGridSample(...)`
- `packTerrainSplatSampleGrid(...)`
- `unpackTerrainSplatSampleGrid(...)`
- `summarizeTerrainSplatSampleGridUsage(...)`

Important constraints:

- bounds are inclusive on both axes
- `step` defaults to `1`
- `blendWidth` defaults to `0`
- bounds must divide evenly by `step` so chunk edges stay exact
- packed buffers store four layer indices and four weights per sample

Why this exists:

- chunk generators can build splat samples before mesh creation
- worker pipelines can transfer one compact buffer pair instead of nested
  objects
- chunk border continuity can be tested independently from rendering
- blend-zone generation can stay renderer-free while still using world-space
  neighbors outside the local grid bounds

Blend zones:

- when `blendWidth > 0`, the grid resolves the same deterministic neighboring
  world samples around each coordinate and mixes differing terrain kinds into
  the center sample
- cardinal neighbors contribute more than diagonal neighbors
- farther neighbors inside the blend width contribute less than closer ones
- because neighbor sampling happens in world space instead of only from the
  in-grid samples, adjacent chunk builds preserve identical border samples even
  when each chunk is generated separately
- this reduces hard single-layer boundaries and lets open grass, snow, roads,
  and forest-floor mixes taper across logical tile edges before renderer code
  exists

Usage summaries:

- report sorted active layer IDs for one grid
- report unused layer IDs relative to the shared layer catalog
- count unique layer combinations across samples
- identify one dominant layer by usage count
- emit warnings when chunk-level active-layer or variation budgets are exceeded
- optionally warn when neighboring samples collapse into hard single-layer
  transitions with no blend zone
