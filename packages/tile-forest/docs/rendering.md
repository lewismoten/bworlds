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
- In reduced and minimal quality, some distant background forest tiles now
  collapse all the way to an empty sentinel instead of paying even the canopy
  silhouette pass. Nearby reduced-quality forest tiles still keep the existing
  low-detail canopy silhouette so the forest edge around the player does not
  disappear abruptly.
- Reduced-quality forest now keeps that canopy silhouette only inside the
  immediate ring around the player and sparsifies farther background tiles to a
  stable subset, while minimal quality drops every background tile beyond the
  immediate ring.

Current layout:

- Stone-ring landmarks share one `SphereGeometry`, one material, and one
  `InstancedMesh`, with per-stone scale and position stored in matrices.
- Mushroom-ring landmarks now share one `CylinderGeometry` for stems, one
  `SphereGeometry` for caps, and two `InstancedMesh` nodes, with per-instance
  scale and position stored in matrices.
- Those landmark geometries are now also shared per Three host across repeated
  landmark tiles instead of rebuilding identical stone-ring and mushroom-ring
  geometry objects on every tile model creation.
- Full-detail trees now collapse each tree's repeated branches into one
  `InstancedMesh` and each tree's repeated foliage clumps into one
  `InstancedMesh`.
- Full-detail trunk segments now also batch at the tile level into shared
  `InstancedMesh` groups keyed by taper geometry and material, so dense forest
  tiles do not pay two standalone trunk draw calls per tree before close-detail
  props are added.
- Full-detail forest birds now collapse into three animated `InstancedMesh`
  sets per tile for left wings, right wings, and bodies instead of emitting
  one `Group` with three child meshes per bird.
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
  broadleaf foliage material plus one shared conifer foliage material across
  tree varieties, which keeps mixed distant forest tiles inside the renderer's
  per-tile material budget even when one low-detail tile contains both forms.
- Full-detail forest also reuses one shared accessory palette for invariant
  hollow, owl-eye, web, carving, and meadow flower materials across varieties,
  so repeated nearby forest tiles stop minting duplicate detail materials for
  the same visual treatment.
- Full-detail broadleaf trees now also share one host-level trunk/foliage/
  detail material bundle across oak and birch species, while conifers keep a
  separate bundle. That trims compatible-species material duplication without
  changing the broader broadleaf-versus-pine silhouette split.
