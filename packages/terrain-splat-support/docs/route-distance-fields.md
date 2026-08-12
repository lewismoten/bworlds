# Terrain Route Distance Fields

`@bworlds/terrain-splat-support/route-distance-field` samples deterministic
world-space road and trail polylines without assuming one route per tile.

## Goals

- generate splat weights from shared world-space route data instead of only
  tile-edge heuristics
- let curved roads and trails pass through logical terrain cells without being
  forced to follow square tile borders
- combine multiple route corridors into deterministic intersection samples

## Main API

- `sampleTerrainRouteDistanceField(...)`

## Model

- each route is one polyline in world space with one shared width plan
- the sampler finds the nearest point on every route segment to one sample point
- route weights come from the existing route shoulder-width contract
- multiple route contributions are combined with bounded normalized weights so
  crossroads can emerge from the same field

## Output

- nearest route ID, nearest point, and nearest distance for one sample
- combined surface, shoulder, and total route weights
- one ordered contribution list for all contributing routes
- one deterministic intersection count for samples touched by multiple routes
