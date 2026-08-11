# Tile Quarry Rendering

The quarry tile now exposes a progressive build path so the renderer can
spread the heavier landmark mesh creation across multiple frames.

Current progressive phases:

- `pit-rubble`
- `derrick`
- `cart-lantern`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.
