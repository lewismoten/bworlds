# Rail Rendering

The rail tile now instances its repeated sleepers instead of emitting four
separate static meshes per track segment.

Current layout:

- The two steel rails remain individual meshes because they need distinct
  offsets on either side of the track centerline.
- The four wooden sleepers now share one geometry, one material, and one
  `InstancedMesh`, with the track direction applied on the parent instance
  object.

This trims repeated static `Object3D` nodes from each visible rail tile without
changing the current scene layout.
