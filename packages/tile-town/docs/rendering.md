# Tile Town Rendering

The full-detail town tile now also exposes a progressive build path so the
renderer can spread more of the town landmark work across multiple frames.

Current progressive phases:

- `buildings`
- `sign`
- `banners`
- `night-lights`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.
