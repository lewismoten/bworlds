# Plains Rendering

The plains tile now ships a native 3D mesh instead of relying on the renderer's
generic missing-model path.

Current behavior:

- Both `full` and `low` detail plains models use one cached `MeshStandardMaterial`
  per Three host.
- `full` detail uses a slightly wider plane than `low` detail, but both stay
  intentionally cheap so ordinary plains tiles do not add meaningful
  scene-graph or draw-call pressure.
- The per-detail `PlaneGeometry` instances are cached per Three host, so
  repeated plains tiles reuse the same base geometry instead of rebuilding
  identical ground surfaces.
- The plains model stays under the renderer's geometry-group budget because the
  cached plane mesh does not carry the six face groups that `BoxGeometry`
  would add.

This removes the old no-model plains case from runtime diagnostics and gives the
renderer a deterministic low-cost land mesh for the most common overworld tile.
