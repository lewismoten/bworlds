# Route Rendering

The route package now supports progressive dock model builds through
`create3DModelProgressive(...)` on the `dock` tile so the renderer can spread
the heavier crossing work across multiple frames instead of building every dock
part in one flush.

Current dock progressive phases:

- `deck-and-piles`
- `boat`
- `route-sign`

The synchronous `create3DModel()` path still exhausts the same generator so the
progressive and eager dock builds stay structurally aligned.
