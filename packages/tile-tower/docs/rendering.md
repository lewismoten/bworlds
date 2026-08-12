# Tile Tower Rendering

The full-detail tower tile now exposes a progressive build path so the
renderer can spread the landmark's mesh creation across multiple frames.

Current progressive phases:

- `base`
- `crown`
- `entry-lantern`

Low-detail towers keep a shorter two-step path:

- `base`
- `roof`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.

The low-detail tower silhouette now also uses the base cylinder mesh as its
root and attaches the shaft and roof beneath it, so reduced-quality tower
tiles avoid one otherwise empty wrapper `Group` without changing the silhouette.

The full-detail tower landmark now also uses that same base cylinder mesh as
its root and attaches the crown ring, roof cap, doorway, lantern glow, and
point light beneath it, so tower tiles avoid one otherwise empty wrapper
`Group` without changing the silhouette or night-light placement.
