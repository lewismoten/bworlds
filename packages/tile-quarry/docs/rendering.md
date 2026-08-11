# Quarry Rendering

The quarry tile now instances its repeated rubble stones and cart wheels
instead of creating separate repeated `Mesh` nodes for those props.

Current layout:

- The quarry rim, pit, derrick, cart body, and lantern still use ordinary
  meshes because they have distinct geometry or lighting behavior.
- The six surrounding rubble stones now share one `BoxGeometry`, one material,
  and one `InstancedMesh`, with per-instance scale and position stored in
  matrices.
- The two repeated cart wheels now share one `CylinderGeometry`, one material,
  and one `InstancedMesh`, with per-instance position stored in matrices.

This keeps the visible layout the same at the tile level while lowering the
number of repeated static `Object3D` nodes the renderer has to carry.
