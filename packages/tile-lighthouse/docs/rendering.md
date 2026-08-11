# Lighthouse Rendering

The lighthouse tile now instances its repeated lantern-room framing details
instead of emitting one mesh per repeated ring or post.

Current layout:

- The two lantern-room frame rings now share one cylinder geometry, one frame
  material, and one `InstancedMesh`.
- The four lantern-room frame posts already share one box geometry, one frame
  material, and one `InstancedMesh`.
- The balcony rail posts, lantern-room panes, and wall-glow boxes remain
  instanced as before.
- The tower shell, glass, balcony deck, beam, and light-emitter nodes remain
  ordinary objects where they have unique geometry, transform behavior, or
  lighting state.

This trims another small repeated static cluster from the full-detail
lighthouse while preserving the lantern-room silhouette.
