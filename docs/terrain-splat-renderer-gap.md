## Terrain Splat Renderer Gap

`@bworlds/terrain-splat-support` provides the shared terrain splat contracts,
chunk/sample planning, route splat planning, packed attribute layouts, shader
source generation, worker contracts, and debug payloads needed for terrain
splatting.

The live renderer has not switched to that path yet.

Current live behavior:

- `packages/tile-route/src/index.ts` still renders roads as explicit ribbon and
  branch meshes when `render3d` leaves a route on `legacy-mesh`.
- `packages/render3d` now switches flat `road` tiles to `shared-splat` mode
  and draws them through the shared floor batching path instead of the route
  ribbon mesh.
- Those road meshes still create `MeshStandardMaterial` road and shoulder
  materials instead of feeding route appearance into one shared terrain splat
  material.
- `apps/web` and `packages/render3d` do not currently upload packed splat
  chunk data or bind a shared terrain splat shader/material for terrain chunks.

User-visible consequence:

- Flat roads no longer need physical ribbon meshes, but they still render as
  shared atlas-backed floor surfaces rather than the final PBR splat shader.
- Ground still appears through plugin-owned geometry/material choices rather
  than shared splat blending.
- The existing splat work is mostly visible through tests, debug planning, and
  support-package APIs, not through final terrain visuals in the running app.

Integration target:

1. Build or expose one terrain chunk render path in `packages/render3d` that
   consumes packed splat chunk data and shared height-field geometry.
2. Route flat roads and broad trail surfaces through that shared terrain path
   instead of `tile-route` ribbon meshes.
3. Keep geometry fallbacks only for unsupported structural cases such as
   bridges, tunnels, raised causeways, retaining walls, and stairs.
