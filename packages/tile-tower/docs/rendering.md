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
