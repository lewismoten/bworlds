## Visible Terrain Chunk Meshes

`render3d` now exposes one scene-sync helper for visible terrain chunks:

- `src/visible-terrain-chunk-meshes.ts`

What it does:

- consumes cached visible terrain chunk renderables
- reuses mesh identity by renderable cache key
- reuses one material instance per compatible terrain material bucket
- disposes stale bucket materials when no visible chunk still uses them
- syncs one dedicated root group without touching the legacy floor path

Why this exists:

- the live terrain chunk renderer needs one narrow scene handoff before it can
  replace nearby legacy floor meshes
- chunk compatibility and renderable caching are only useful if scene objects
  can also preserve identity across repeated syncs
- this keeps shared chunk mesh lifecycle separate from the later world-scene
  toggle and parity rollout work
