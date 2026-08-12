# Terrain Splat Neighborhood Layer Pools

`@bworlds/terrain-splat-support/layer-pool-plan` selects one bounded active
layer set that nearby chunk grids can try to share.

Main responsibilities:

- combine several chunk usage summaries into one ranked neighborhood layer pool
- prioritize layers that appear in more chunks and are used more often
- report which chunk layers fit inside the shared pool and which do not
- warn when the neighborhood still exceeds the shared active-layer budget

Current API:

- `planTerrainSplatNeighborhoodLayerPool(...)`

Why this exists:

- nearby chunks should reuse one small active layer set whenever possible
- shared pools reduce pressure to create or bind too many terrain materials
- overflow reporting gives chunk generation and renderer code one explicit place
  to react when a neighborhood cannot fit within the budget

Current behavior:

- layer ranking prefers broader chunk presence first, then total usage count
- lexical ordering breaks stable ties
- chunk coverage reports both covered and missing layer IDs per member chunk
