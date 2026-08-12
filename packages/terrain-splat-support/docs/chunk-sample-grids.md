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
- `createTerrainSplatSampleGridLod(...)`
- `createAdaptiveTerrainSplatSampleGrid(...)`
- `createTerrainSplatChunkPreview(...)`
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
- when one side of a boundary is a broad road or path tile, the same blend-zone
  pass gives that road edge extra weight so adjacent terrain samples pick up a
  deterministic dirt or gravel shoulder instead of stopping at a hard seam

LOD grids:

- `createTerrainSplatSampleGridLod(...)` resolves a coarser sample grid from
  the same world-space tile resolver instead of downsampling only from one
  already-built chunk
- `lodStepMultiplier` increases the output `step` while keeping the same world
  bounds, so distant terrain can use fewer splat samples
- each coarse LOD sample aggregates weighted fine-sample influences from the
  surrounding world-space neighborhood
- because the aggregation resolves the same world coordinates on both sides of
  a chunk edge, adjacent LOD chunk builds preserve matching border samples
- major terrain identities such as forest and snow remain present near coarse
  boundaries instead of collapsing to one unrelated dominant layer
- this gives the renderer a stable, deterministic coarse splat input before any
  mesh-decimation or crossfade logic exists

Adaptive generation:

- `createAdaptiveTerrainSplatSampleGrid(...)` measures chunk-generation cost
  against an optional `budgetMs`
- when a build exceeds the budget and `fallbackLodStepMultiplier` is larger
  than the primary detail level, the helper retries with a coarser LOD grid
- the result reports `elapsedMs`, `budgetMs`, `exceededBudget`, one `quality`
  label, and an optional warning string
- this gives worker or chunk-generation code one renderer-free way to track
  terrain splat cost and degrade gracefully before full shared material support
  exists

Usage summaries:

- report sorted active layer IDs for one grid
- report unused layer IDs relative to the shared layer catalog
- count unique layer combinations across samples
- identify one dominant layer by usage count
- emit warnings when chunk-level active-layer or variation budgets are exceeded
- optionally warn when neighboring samples collapse into hard single-layer
  transitions with no blend zone

Chunk previews:

- `createTerrainSplatChunkPreview(...)` converts one sample grid into a simple
  row-major preview of dominant layers and mixed cells
- preview cells report `dominantLayerId`, sorted `activeLayerIds`, and whether
  the sample is mixed
- the preview summary reports grid-wide `activeLayerIds`, `mixedCellCount`, and
  one dominant layer for the whole chunk
- this gives tests, tooling, and future debug views a render-free way to prove
  that one chunk already contains mixed grass/dirt/road/forest samples before
  shared material or shader code exists
