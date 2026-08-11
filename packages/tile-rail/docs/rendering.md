# Rail Rendering

The rail tile now instances its repeated sleepers and steel rails instead of
emitting separate repeated meshes per track segment.

Current layout:

- The two steel rails now share one geometry, one material, and one
  `InstancedMesh`, with per-instance offsets placing them on either side of the
  track centerline.
- The four wooden sleepers now share one geometry, one material, and one
  `InstancedMesh`, with the track direction applied on the parent instance
  object.

This trims repeated static `Object3D` nodes from each visible rail tile without
changing the current scene layout.

The tile now also exposes `create3DModelProgressive(...)` so the renderer can
yield between laying the two rails and the four sleepers instead of forcing the
entire rail tile build into one synchronous flush.
