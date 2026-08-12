# Ship Rendering

The ship tile now exposes a progressive build path so the renderer can spread
the heavier landmark mesh creation across multiple frames.

Current progressive phases:

- `hull`
- `lantern`
- `rigging` for tall ships or `wreckage` for broken ships

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.

The tall-ship variant also instances its repeated rigging parts instead of
emitting separate meshes for each mast, yard, and sail.

Current layout:

- The two repeated masts share one box geometry, one mast material, and one
  `InstancedMesh`.
- The two repeated yards share one box geometry, one trim material, and one
  `InstancedMesh`.
- The two repeated sails share one plane geometry, one sail material, and one
  `InstancedMesh`, with the broadside orientation applied on the parent
  instance object.
- The hull, deck, lantern, and broken-ship debris remain ordinary objects
  because they have distinct shapes, lighting behavior, or one-off damage.

This keeps the tall-ship silhouette intact while trimming another repeated
static `Object3D` cluster from the overworld ship landmark.

The ship landmark now also uses the hull mesh as its root and attaches the
deck, lantern, rigging, and wreckage details beneath it, so ship tiles avoid
one otherwise empty wrapper `Group` while preserving the same facing, variant
selection, and light placement.

Material reuse:

- repeated ship builds on one Three host are expected to stay within one
  shared five-material palette per resolved ship variant for hull, trim, mast,
  sail, and lantern surfaces
- the regression test locks that budget so repeated nearby ship builds cannot
  quietly start allocating extra equivalent materials on the same host
