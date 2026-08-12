# Terrain Splat Performance Estimates

`@bworlds/terrain-splat-support/performance-estimate` compares one chunk's
renderer-free splat grid against one naive per-cell terrain path.

## Goals

- prove that one shared splat material path can reduce terrain draw calls
- prove that one shared splat material path can reduce terrain material and
  shader program variants
- keep the comparison deterministic so tests can validate the direction of the
  change before final renderer integration exists

## Main API

- `compareTerrainSplatChunkPerformance(...)`
- `estimateTerrainSplatMaterialReuse(...)`

## Comparison model

- the legacy side assumes one terrain draw call per sampled cell
- the legacy side treats each distinct weighted layer combination as one
  material/program signature
- the splat side assumes one shared terrain material/program for the whole chunk
- the splat side assumes one texture array binding per populated map type: base
  color, normal, and roughness

## Output

- legacy and splat estimates for draw calls, materials, programs, and texture
  bindings
- distinct texture counts per map type
- absolute reductions and normalized reduction ratios
- cross-chunk material reuse counts, per-chunk material keys, and warnings when
  a chunk falls off the shared splat material path

## Current limits

- these are deterministic estimates, not live renderer timings
- the helper does not estimate terrain frame time yet
- the helper does not estimate final GPU texture memory ownership because that
  depends on the renderer's upload and cache behavior
