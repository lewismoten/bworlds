## Visible Terrain Chunk Renderables

`render3d` now exposes one cached integration layer for visible terrain chunks:

- `src/visible-terrain-chunk-renderables.ts`

What it does:

- builds visible terrain chunk geometries from the shared chunk render-data path
- builds visible terrain chunk material compatibility plans from the same chunk
  splat grids
- pairs geometry and material compatibility into one renderable record per
  visible chunk
- reuses unchanged renderables through a bounded cache keyed by chunk render
  data and shared material compatibility

Why this exists:

- it gives the future live terrain chunk renderer one stable handoff for scene
  attachment: renderables in, objects out
- it proves unchanged chunk data can preserve renderable identity across
  repeated builds
- it isolates caching and compatibility reuse from the later scene swap,
  material instantiation, and legacy-floor toggle work
