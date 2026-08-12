# Terrain Route Geometry Plans

`@bworlds/terrain-splat-support/route-geometry-plan` decides when a route
should stay on the splat path and when a real structural geometry path is
required instead.

## Goals

- keep structural route decisions out of renderer-specific road mesh code
- preserve bridges, tunnels, causeways, stairs, and retaining walls as geometry
  when splats cannot represent them faithfully
- expose one fallback signal when a route case is unsupported by the splat path

## Main API

- `createTerrainRouteGeometryPlan(...)`

## Model

- bridges always stay on separate geometry
- tunnels always stay on separate geometry
- raised causeways move to geometry when the route surface is elevated enough
- stairs and retaining walls move to geometry when actual stepped or wall
  structure is required
- unsupported route shapes can explicitly request a road-geometry fallback
- flat ordinary roads and paths stay on the splat path
