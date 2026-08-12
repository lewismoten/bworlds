# Terrain Route Render Plans

`@bworlds/terrain-splat-support/route-render-plan` combines the lower-level
route width, surface, geometry, and appearance helpers into one renderer-free
decision about whether a route stays on terrain splats or still needs a
separate route mesh path.

## Goals

- represent simple flat roads as terrain splat layers by default
- represent light trails and worn paths as terrain splat layers when their
  shape does not require a sharper overlay or structural geometry
- expose one explicit `removeSeparateRoadMesh` flag so callers can stop
  emitting redundant road meshes when splatting is sufficient

## Main API

- `createTerrainRouteRenderPlan(...)`

## Policy

- flat `road` routes classify as `simple-road` splats unless geometry fallback
  is required
- `path` routes can classify as `trail` or `worn-path` splats when they are
  light enough or explicitly dirt/grass biased
- sharper or busier gravel-like trails can stay on `overlay` mode
- bridges, tunnels, stairs, causeways, retaining walls, and unsupported shapes
  still force `geometry` fallback

## Output

- the chosen `mode` and higher-level `classification`
- `removeSeparateRoadMesh` and `requiresSeparateRouteMesh`
- the composed width, surface, geometry, and appearance sub-plans
- one reason string suitable for debug output and future runtime diagnostics
