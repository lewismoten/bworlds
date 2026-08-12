# Water Rendering

The river tile now exposes `create3DModelProgressive(...)` so the renderer can
spread the heaviest ribbon-mesh work across multiple frames instead of building
the center pool plus every water and highlight strip in one flush.

Current progressive phases:

- `center-pool`
- `branch-water` or `curve-water`
- `branch-highlight` or `curve-highlight`

Stub rivers use a shorter two-step path:

- `stub-water`
- `stub-highlight`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.

River tiles now also use the center pool mesh as the root for connected rivers
and the primary ribbon mesh as the root for stub rivers, attaching the
remaining water/highlight ribbons beneath that first mesh so each river tile
avoids one otherwise empty wrapper `Group` without changing the river shape.

Material reuse:

- repeated river builds on one Three host are expected to stay within one
  shared two-material palette for the main water body and highlight ribbons
- the regression test locks that budget so repeated nearby river builds cannot
  quietly start allocating extra equivalent water materials on the same host
