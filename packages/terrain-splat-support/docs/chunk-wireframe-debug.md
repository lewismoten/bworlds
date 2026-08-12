# Terrain Chunk Wireframe Debug

`@bworlds/terrain-splat-support/chunk-wireframe-debug` turns one shared terrain
chunk geometry plan into a renderer-free wireframe payload.

## Responsibilities

- deduplicate mesh edges into stable wireframe segments
- expose chunk border segments separately from interior mesh edges
- optionally include triangle diagonals when full topology inspection is needed
- keep the payload renderer-free so future overlays or inspectors can consume it

## Current limits

- this module does not attach line segments to a live Three.js scene
- it only reflects the supplied geometry plan, including any current LOD choice
