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

Material reuse:

- repeated station builds on one Three host are expected to stay within one
  shared four-material palette for the floor/hall shell, roof, canopy trim,
  and lamp surfaces
- the regression test locks that budget so repeated nearby station builds
  cannot quietly start allocating extra equivalent materials on the same host
