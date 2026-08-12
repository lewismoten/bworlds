# Shared Visible Floor Batching

`render3d` now batches simple visible terrain floors into a shared instanced
layer instead of creating one floor mesh per visible terrain tile.

## Why

The plains plugin already stopped creating its own duplicate ground model, but
the renderer was still attaching one floor box mesh to every visible tile node.
In the runtime issue snapshots from Wednesday, August 12, 2026, that left
`tile-plains` as the top draw-call owner even when plains had no plugin model
at all.

## Current behavior

- Simple full-tile `plains`, `forest`, and `shore` floors use the shared
  layer.
- `road` uses the shared layer only when terrain surface selection chooses the
  temporary `shared-splat` mode.
- Underlay floors, water floors, and river-edge floor geometry still use their
  tile-local meshes.
- Shared terrain floor batches are grouped by atlas variant and terrain blend
  signature so they can keep correct tile UVs and edge blending while sharing
  one atlas material.
- World-curvature offset is baked into each shared floor instance position
  whenever visible-tile curvature sync runs.
- Ordinary shared-floor terrain tiles no longer allocate a hidden plugin
  sentinel `Group`; the visible LOD recovery path now treats those builds as
  tiles that do not support plugin models, which avoids the extra per-tile
  object and the redundant `full -> low` recovery retry.

## Effect

The immediate runtime impact was a large reduction in plains floor ownership in
the saved issue snapshots from Wednesday, August 12, 2026:

- `tile-plains` draw-call ownership dropped from `1053` to `15`.
- The dominant draw-call hotspot shifted back to `tile-forest`.

That does not fully resolve the active runtime issue, but it removes plains
floor rendering as the main draw-call source and makes the remaining hotspot
more actionable.
