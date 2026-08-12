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

The low-detail lighthouse silhouette now also uses the base cylinder mesh as
its root and hangs the tower, stripe, cap, and rotating beam pivot beneath it,
so reduced-quality lighthouse tiles avoid one otherwise empty wrapper `Group`
without changing the beam animation or silhouette.

The full-detail lighthouse landmark now also uses that same base cylinder mesh
as its root and attaches the tower shell, lantern room, balcony, beam pivot,
and beacon beneath it, so lighthouse tiles avoid one otherwise empty wrapper
`Group` without changing the lantern-room layout, beam animation, or night
lighting.

Progressive loading:

- The full-detail lighthouse progressive path now yields after
  `base-and-tower`, `crown-and-lantern`, `lantern-frame`,
  `balcony-and-panes`, and `beam-and-beacon`.
- Splitting the shell into two structural steps gives the renderer an earlier
  frame boundary before the lantern-frame and beam passes.
