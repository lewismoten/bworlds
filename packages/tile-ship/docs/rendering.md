# Ship Rendering

The tall-ship variant now instances its repeated rigging parts instead of
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
