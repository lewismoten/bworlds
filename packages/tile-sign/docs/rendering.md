# Tile Sign Rendering

The full-detail roadside sign tile now also exposes a progressive build path so
the renderer can spread sign landmark work across multiple frames.

Current progressive phases:

- `posts`
- `placards`
- `lantern`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.
