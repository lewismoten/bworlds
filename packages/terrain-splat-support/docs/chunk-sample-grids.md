# Terrain Splat Chunk Sample Grids

`@bworlds/terrain-splat-support/sample-grid` provides a chunk-oriented layer on
top of deterministic terrain-kind mapping.

Main responsibilities:

- resolve a rectangular world-space bounds into one normalized splat sample per
  grid coordinate
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
- bounds must divide evenly by `step` so chunk edges stay exact
- packed buffers store four layer indices and four weights per sample

Why this exists:

- chunk generators can build splat samples before mesh creation
- worker pipelines can transfer one compact buffer pair instead of nested
  objects
- chunk border continuity can be tested independently from rendering

Usage summaries:

- report sorted active layer IDs for one grid
- report unused layer IDs relative to the shared layer catalog
- count unique layer combinations across samples
- identify one dominant layer by usage count
- emit warnings when chunk-level active-layer or variation budgets are exceeded
