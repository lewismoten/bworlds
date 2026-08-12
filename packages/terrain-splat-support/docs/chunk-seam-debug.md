# Terrain Splat Chunk Seam Debug

`@bworlds/terrain-splat-support/chunk-seam-debug` compares adjacent chunk-grid
borders before any live renderer or overlay UI exists.

Current responsibilities:

- compare east-west or south-north chunk seams
- verify that adjacent grids actually touch on the same world border
- report active-layer mismatches when one border introduces or drops a layer
- report weight mismatches when the same border layer resolves different weights
- keep the output renderer-free so future HUDs, inspectors, or CI checks can
  reuse the same seam analysis payload

Current limits:

- this analyzes splat sample seams, not final mesh normals or rendered pixels
- it does not yet draw a heatmap or interactive seam overlay in the web app
- it assumes both grids were built on compatible sample steps and world bounds
