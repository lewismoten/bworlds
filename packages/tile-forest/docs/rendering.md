# Forest Rendering

The forest tile now instances repeated ring-landmark geometry instead of
emitting one mesh per repeated stone or mushroom.

Current layout:

- Stone-ring landmarks share one `SphereGeometry`, one material, and one
  `InstancedMesh`, with per-stone scale and position stored in matrices.
- Mushroom-ring landmarks now share one `CylinderGeometry` for stems, one
  `SphereGeometry` for caps, and two `InstancedMesh` nodes, with per-instance
  scale and position stored in matrices.
- Other close-detail landmark, wildlife, and decoration meshes remain ordinary
  nodes where they carry unique shapes, animation, or interaction metadata.

This trims repeated static landmark children from full-detail forest tiles
without changing landmark placement or silhouette.
