## Visible Terrain Chunks

`render3d` now exposes one renderer-owned grouping step for shared floor cells:

- `src/visible-terrain-chunks.ts`

What it does:

- collects visible shared-floor terrain cells from the existing tile renderer
- converts each cell to authoritative terrain chunk coordinates through
  `@bworlds/worldgen`
- groups cells by `16x16` logical terrain chunk bounds
- keeps chunk ordering and per-cell ordering stable for later cache keys and
  chunk rebuild comparisons

Why this exists:

- the future terrain chunk renderer should start from chunk IDs, not from a raw
  visible tile scan every time it wants to build chunk geometry
- chunk grouping should reuse the same negative-coordinate and border contract
  that the worldgen package already tests
- this lets the legacy floor migration move one step closer to chunk geometry
  without coupling the renderer to splat material or mesh-building details yet
