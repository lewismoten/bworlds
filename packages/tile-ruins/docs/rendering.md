# Ruins Rendering

The ruins tile now instances its repeated column ring and rubble fragments
instead of emitting one mesh per repeated stone.

Current layout:

- The repeated ring columns now share one `BoxGeometry`, one material, and one
  `InstancedMesh`, with per-instance height and position stored in matrices.
- The optional column caps now share one `BoxGeometry`, one accent material,
  and one `InstancedMesh`, with matrices only for the taller columns that
  receive caps.
- The rubble fragments already share one `BoxGeometry`, one material, and one
  `InstancedMesh`.
- The plinth, occasional arch, and glow/light pieces remain ordinary nodes
  because they are unique per landmark or carry light-emitter behavior.

This keeps the landmark silhouette intact while removing repeated static child
meshes from each visible ruins point of interest.
