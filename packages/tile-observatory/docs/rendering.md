# Tile Observatory Rendering

The full-detail observatory tile now also exposes a progressive build path so
the renderer can spread the heavier landmark work across multiple frames.

Current progressive phases:

- `base`
- `dome`
- `telescope`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.
