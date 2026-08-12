## Visible Terrain Chunk Geometries

`render3d` now exposes one chunk-geometry bridge for the floor migration:

- `src/visible-terrain-chunk-geometries.ts`

What it does:

- consumes visible terrain chunk groups from `visible-terrain-chunks`
- validates each chunk still matches the authoritative worldgen `16x16` bounds
- builds shared chunk render data through
  `@bworlds/terrain-splat-support/chunk-build`
- converts the shared height-field geometry plan plus packed splat attributes
  into one `BufferGeometry` per visible terrain chunk through
  `@bworlds/three-support`

Why this exists:

- it proves the renderer can build chunk geometry from the shared height and
  splat pipeline without rebuilding that data inside `render3d`
- it gives the future live terrain renderer a narrow, testable handoff:
  visible chunk IDs in, chunk geometries out
- it keeps the scene swap, material binding, and legacy-floor toggle work
  separate from the chunk-geometry build step
