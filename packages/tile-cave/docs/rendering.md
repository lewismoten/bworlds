# Cave Rendering

The full-detail cave entrance now instances its repeated outer boulders instead
of emitting one mesh per rock.

Current layout:

- The repeated entrance boulders now share one `SphereGeometry`, one material,
  and one `InstancedMesh`, with per-instance scale and position stored in
  matrices.
- The cap, portal, lantern, and interior tunnel pieces remain ordinary meshes
  because they have distinct shapes, materials, or lighting behavior.

This keeps the cave entrance silhouette intact while trimming another repeated
static `Object3D` cluster from visible overworld landmarks.
