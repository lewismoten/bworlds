# Dungeon Rendering

The full-detail dungeon landmark now instances its repeated corner towers,
roof caps, gate posts, tower beacon braziers, and banner support hardware
instead of emitting separate meshes for each one.

The full-detail build now also exposes a progressive path with six phases:

- `shell-and-keep`
- `towers`
- `gate-structure`
- `gate-beacon`
- `tower-beacons`
- `banners`

The synchronous `create3DModel()` path exhausts the same generator, so the
progressive renderer and the eager build path stay structurally aligned.

Current layout:

- The repeated tower bodies share one cylinder geometry, one wall material, and
  one `InstancedMesh`.
- The repeated tower caps share one cone geometry, one roof material, and one
  `InstancedMesh`.
- The repeated gate posts share one box geometry, one trim material, and one
  `InstancedMesh`.
- The repeated tower beacon braziers share one cylinder geometry, one trim
  material, and one `InstancedMesh`.
- The repeated banner poles share one cylinder geometry, one trim material,
  and one `InstancedMesh`.
- The repeated banner crossbars share one box geometry, one trim material, and
  one `InstancedMesh`.
- The gate, beacon lights, banner cloth, gate beacon brazier, and central keep
  remain ordinary objects because they have distinct materials, animation, or
  interaction data.

This reduces another repeated static `Object3D` cluster in full-detail
landmarks while keeping the same silhouette and beacon placement.

The low-detail dungeon silhouette now also uses the base keep mesh as its root
and attaches the smaller keep, corner towers, gate pieces, and beacon nodes
beneath it, so reduced-quality dungeon tiles avoid one otherwise empty wrapper
`Group` without changing the silhouette or beacon placement.
