# Tile Observatory Rendering

The full-detail observatory tile now also exposes a progressive build path so
the renderer can spread the heavier landmark work across multiple frames.

Current progressive phases:

- `base`
- `dome`
- `telescope`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.

The observatory now also uses the base mountain plinth mesh as its root and
attaches the tower, trim ring, dome pivot, and telescope pivot beneath it, so
observatory tiles avoid one otherwise empty wrapper `Group` without changing
the dome-opening or telescope animation behavior.
