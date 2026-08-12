## Terrain Surface Render Modes

`Create3DModelContext` now carries an optional `terrainSurfaceMode` hint so the
renderer can tell tile plugins whether terrain is still being drawn by legacy
mesh geometry or by a shared terrain surface.

Supported modes:

- `legacy-mesh`: the current default. Tile plugins should keep building any
  floor-adjacent geometry they need.
- `shared-splat`: the renderer owns the terrain surface. Tile plugins should
  avoid emitting flat terrain-covering geometry that would duplicate the shared
  ground path.

Current intended usage:

- flat overworld roads can return `null` in `shared-splat` mode because their
  surface should come from the renderer-owned terrain splat path
- bridges, docks, tunnels, stairs, retaining walls, and other structural
  geometry should continue to build real meshes even when the terrain surface
  is shared

This keeps the transition incremental:

1. add the renderer-owned shared terrain path
2. switch selected plugins to stop duplicating flat surface geometry
3. keep structural fallbacks on mesh geometry where splats are insufficient
