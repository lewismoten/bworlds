## Logical Tile State

`render3d` now creates an explicit logical tile snapshot before it decides how
to render floor content.

Shared helper:

- `src/logical-tile-state.ts`

Current snapshot fields:

- `tileX`
- `tileY`
- authoritative decorated `tile`
- `kind`
- tile `definition`
- atlas `variant`
- `tilePluginOwnerLabel`
- `terrainSurfaceSelection`
- derived `terrainSurfaceMode`

Why this exists:

- gameplay indexing still depends on authoritative logical tiles
- local feature queries still need the decorated tile state even if floor
  rendering moves to chunked terrain
- the 2D map and text viewport still consume the same logical tile state
- floor meshes can change or disappear without redefining what the tile is

This is a migration guardrail for removing legacy floor rendering: the renderer
must keep logical tile state explicit and separate from whatever geometry path
draws the floor.
