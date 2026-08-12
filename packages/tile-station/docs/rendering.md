# Tile Station Rendering

The station tile now exposes a progressive build path so the renderer can
spread the landmark mesh creation across multiple frames.

Current progressive phases:

- `hall`
- `roof-canopy`
- `lamp`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.

The station silhouette now also uses the base floor mesh as its root and
attaches the hall, roof, canopy, lamp mesh, and point light beneath it, so
station tiles avoid one otherwise empty wrapper `Group` without changing the
silhouette or night-light placement.
