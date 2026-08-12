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
- `compareTerrainRouteSplatPathPerformance(...)`
- `estimateTerrainSplatMaterialReuse(...)`

## Comparison model

- the legacy side assumes one terrain draw call per sampled cell
- the legacy side treats each distinct weighted layer combination as one
  material/program signature
- the splat side assumes one shared terrain material/program for the whole chunk
- the splat side assumes one texture array binding per populated map type: base
  color, normal, and roughness
- the route-only comparison treats legacy road or trail meshes as extra overlay
  draw calls per route-bearing cell, while the splat side assumes those route
  layers stay inside the shared terrain pass and add no extra draw calls

## Output

- legacy and splat estimates for draw calls, materials, programs, and texture
  bindings
- route-only estimates for extra mesh-road draw calls versus route layers baked
  into the shared terrain splat path
- deterministic texture-memory and terrain frame-time estimates for the same
  chunk under legacy vs shared splat paths
- distinct texture counts per map type
- absolute reductions and normalized reduction ratios
- cross-chunk material reuse counts, per-chunk material keys, and warnings when
  a chunk falls off the shared splat material path
- the test suite also pins one deterministic regression budget for the shared
  splat fixture so draw calls, material/program counts, texture bindings,
  frame-time estimates, and route overlay draw-call reductions fail loudly when
  they drift past the expected envelope

## Current limits

- these are deterministic estimates, not live renderer timings
- texture-memory estimates use one normalized texture size/format budget model
  rather than live uploaded GPU resources
- frame-time estimates are comparative heuristics intended for trend checks
  before live renderer instrumentation exists
