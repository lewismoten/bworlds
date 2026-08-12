# Terrain Route Shoulder Weights

`@bworlds/terrain-splat-support/route-shoulder-weight` resolves a soft route
shoulder falloff from one distance-to-center sample plus a shared width plan.

## Goals

- generate deterministic shoulder taper weights around road and trail edges
- keep shoulder falloff separate from renderer-specific mesh or splat builders
- let later route-blend stages reuse one bounded route-weight profile

## Main API

- `resolveTerrainRouteShoulderWeights(...)`

## Model

- full route weight is preserved inside the route surface width
- outside the surface, weight falls linearly through the shoulder band
- once the sample moves beyond the shoulder width, route weight becomes zero
