# Tile Station Rendering

The station tile now exposes a progressive build path so the renderer can
spread the landmark mesh creation across multiple frames.

Current progressive phases:

- `hall`
- `roof-canopy`
- `lamp`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.
