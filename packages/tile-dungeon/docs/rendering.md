# Dungeon Rendering

The full-detail dungeon landmark now instances its repeated corner towers,
roof caps, and gate posts instead of emitting separate meshes for each one.

Current layout:

- The repeated tower bodies share one cylinder geometry, one wall material, and
  one `InstancedMesh`.
- The repeated tower caps share one cone geometry, one roof material, and one
  `InstancedMesh`.
- The repeated gate posts share one box geometry, one trim material, and one
  `InstancedMesh`.
- The gate, beacon lights, banners, and central keep remain ordinary objects
  because they have distinct materials, animation, or interaction data.

This reduces another repeated static `Object3D` cluster in full-detail
landmarks while keeping the same silhouette and beacon placement.
