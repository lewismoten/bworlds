# Cave Rendering

The cave tile now instances its repeated mushroom props, dripstone spires, and
full-detail entrance boulders instead of emitting one mesh per repeated
decoration.

Current layout:

- The repeated cave mushrooms now share one `CylinderGeometry`, one
  `SphereGeometry`, and two `InstancedMesh` nodes, with per-instance scale and
  position stored in matrices for the stem and cap sets.
- The repeated cave dripstone floor spires now share one `ConeGeometry`, one
  material, and one `InstancedMesh`, with per-instance height and position
  stored in matrices.
- The repeated entrance boulders now share one `SphereGeometry`, one material,
  and one `InstancedMesh`, with per-instance scale and position stored in
  matrices.
- The hanging stalactite, cap, portal, lantern, and interior tunnel pieces
  remain ordinary meshes because they have distinct shapes, materials, or
  lighting behavior.

This keeps the cave silhouette and mushroom patch layout intact while trimming
repeated static `Object3D` clusters from visible cave landmarks and cave-floor
decorations.
