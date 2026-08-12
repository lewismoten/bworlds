# Shared Visible Floor Batching

`render3d` now batches simple visible plains floors into a shared instanced
layer instead of creating one floor mesh per visible plains tile.

## Why

The plains plugin already stopped creating its own duplicate ground model, but
the renderer was still attaching one floor box mesh to every visible tile node.
In the August 12, 2026 runtime issue snapshots, that left `tile-plains` as the
top draw-call owner even when plains had no plugin model at all.

## Current behavior

- Only simple full-tile plains floors use the shared layer.
- Underlay floors, water floors, and river-edge floor geometry still use their
  tile-local meshes.
- The shared plains floor batches are grouped by atlas variant so they can keep
  correct tile UVs while sharing one atlas material.
- World-curvature offset is baked into each shared floor instance position
  whenever visible-tile curvature sync runs.

## Effect

The immediate runtime impact was a large reduction in plains floor ownership in
the saved issue snapshots from Wednesday, August 12, 2026:

- `tile-plains` draw-call ownership dropped from `1053` to `15`.
- The dominant draw-call hotspot shifted back to `tile-forest`.

That does not fully resolve the active runtime issue, but it removes plains
floor rendering as the main draw-call source and makes the remaining hotspot
more actionable.
