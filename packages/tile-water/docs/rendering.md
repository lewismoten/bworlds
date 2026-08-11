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
