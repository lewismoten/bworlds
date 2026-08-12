# Cave Rendering

The cave tile now instances its repeated mushroom props, dripstone spires,
fallen-rock obstacle boulders, and full-detail entrance boulders instead of
emitting one mesh per repeated decoration.

The full-detail cave-mouth build now also exposes a progressive path with four
phases:

- `entrance-boulders`
- `portal-shell`
- `arch-and-pillars`
- `lantern`

The synchronous `create3DModel()` path exhausts the same generator, so the
progressive renderer and the eager build path stay structurally aligned.

Current layout:

- The repeated cave mushrooms now share one `CylinderGeometry`, one
  `SphereGeometry`, and two `InstancedMesh` nodes, with the stem instances now
  serving as the tile root and the cap instances attached beneath them. Per-
  instance scale and position stay stored in matrices for both sets.
- The repeated cave dripstone floor spires now share one `ConeGeometry`, one
  material, and one `InstancedMesh`, with the spire instances now serving as
  the tile root and the hanging stalactite attached beneath them. Per-instance
  height and position stay stored in matrices.
- The repeated cave obstacle boulders now share one `SphereGeometry`, one
  material, and one `InstancedMesh`, with per-instance scale and position
  stored in matrices.
- The repeated entrance boulders now share one `SphereGeometry`, one material,
  and one `InstancedMesh`, with per-instance scale and position stored in
  matrices.
- The mirrored cave-mouth cheek rocks and inner pillars now each share one
  `SphereGeometry`, one material, and one `InstancedMesh`, with local portal
  positions and scale stored in matrices.
- The hanging stalactite, cap, portal, lantern, and interior tunnel pieces
  remain ordinary meshes because they have distinct shapes, materials, or
  lighting behavior.

This keeps the cave silhouette and mushroom patch layout intact while trimming
repeated static `Object3D` clusters from visible cave landmarks and cave-floor
decorations.
