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
