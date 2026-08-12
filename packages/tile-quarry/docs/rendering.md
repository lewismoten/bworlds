# Tile Quarry Rendering

The quarry tile now exposes a progressive build path so the renderer can
spread the heavier landmark mesh creation across multiple frames.

Current progressive phases:

- `pit-rubble`
- `derrick`
- `cart-lantern`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.

The quarry landmark now also uses the rim mesh as its root and attaches the
pit, derrick, lantern, and cart details beneath it, so quarry tiles avoid one
otherwise empty wrapper `Group` without changing the landmark silhouette or
night-light placement.

Material reuse:

- repeated quarry builds on one Three host are expected to stay within one
  shared six-material palette for the stone rim plus timber, rope, rubble,
  dark metal, and lantern surfaces
- the regression test locks that budget so repeated nearby quarry builds
  cannot quietly start allocating extra equivalent materials on the same host
