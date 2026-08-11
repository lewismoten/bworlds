# Quarry Rendering

The quarry tile now instances its repeated rubble stones instead of creating
six separate `Mesh` nodes per landmark.

Current layout:

- The quarry rim, pit, derrick, cart, lantern, and wheels still use ordinary
  meshes because they have distinct geometry or lighting behavior.
- The six surrounding rubble stones now share one `BoxGeometry`, one material,
  and one `InstancedMesh`, with per-instance scale and position stored in
  matrices.

This keeps the visible layout the same at the tile level while lowering the
number of repeated static `Object3D` nodes the renderer has to carry.
