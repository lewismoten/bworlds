# Mountain Rendering

The mountain tile now exposes `create3DModelProgressive(...)` for its full 3D
stack so the renderer can spread taller peak construction across multiple
frames instead of forcing the whole cone stack through one flush.

Current progressive phases:

- `base`
- `upper`
- `crown`
- `snowcap`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.

The mountain stack now also uses the base cone mesh as its root and attaches
the upper cone, crown, and snowcap beneath it, so mountain tiles avoid one
otherwise empty wrapper `Group` without changing the peak silhouette.

Material reuse:

- repeated mountain builds on one Three host are expected to stay within one
  shared two-material palette for the rock body and optional snowcap surfaces
- the regression test locks that budget so repeated nearby mountain builds
  cannot quietly start allocating extra equivalent materials on the same host
