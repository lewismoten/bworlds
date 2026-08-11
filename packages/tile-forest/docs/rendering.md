# Forest Rendering

The forest tile now instances repeated ring-landmark geometry instead of
emitting one mesh per repeated stone or mushroom.

Progressive loading:

- Full-detail forest tiles now expose `create3DModelProgressive(...)` so the
  renderer can spread the heaviest tree, hollow, ground-detail, and firefly
  work across multiple frames.
- Current progressive phases split the heaviest tree build into two batches
  before continuing with `hollows-and-markings`,
  `understory-and-wildlife`, `landmarks-and-floor`, and `close-effects`.
- The low-detail forest path remains synchronous because it is already a small
  instanced pass.

Current layout:

- Stone-ring landmarks share one `SphereGeometry`, one material, and one
  `InstancedMesh`, with per-stone scale and position stored in matrices.
- Mushroom-ring landmarks now share one `CylinderGeometry` for stems, one
  `SphereGeometry` for caps, and two `InstancedMesh` nodes, with per-instance
  scale and position stored in matrices.
- Full-detail trees now collapse each tree's repeated branches into one
  `InstancedMesh` and each tree's repeated foliage clumps into one
  `InstancedMesh`, while keeping the trunk segments and special-case detail
  nodes as ordinary children.
- Other close-detail landmark, wildlife, and decoration meshes remain ordinary
  nodes where they carry unique shapes, animation, or interaction metadata.

This trims repeated static landmark and tree children from full-detail forest
tiles without changing landmark placement or silhouette.

Material lifetime:

- Forest tree-family style materials are now cached per Three host, not in one
  process-wide map.
- That keeps repeated forest builds on the same host reusing the same bark,
  foliage, meadow, hollow, owl, spider, web, and carving materials.
- It also prevents one host from reusing textures or materials that were
  created by a different host, which keeps material/shader ownership aligned
  with the renderer that will actually dispose them.
- Low-detail forest trees also reuse one shared trunk material and one shared
  foliage material across tree varieties, which keeps distant forest tiles
  inside the renderer's per-tile material budget.
- Full-detail forest also reuses one shared accessory palette for invariant
  hollow, owl-eye, web, carving, and meadow flower materials across varieties,
  so repeated nearby forest tiles stop minting duplicate detail materials for
  the same visual treatment.
