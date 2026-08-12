# Terrain Route Edge Blends

`@bworlds/terrain-splat-support/route-edge-blend` blends a route surface layer
gradually into the surrounding terrain sample.

## Goals

- keep road and trail edge blending separate from renderer-specific splat code
- reuse one shared route-weight contract from shoulder or distance-field stages
- preserve surrounding terrain identity while route influence tapers in

## Main API

- `blendTerrainRouteEdgeIntoSample(...)`

## Model

- route weight is clamped into `0..1`
- the surrounding terrain sample is scaled by `1 - routeWeight`
- the route layer is injected with the resolved route weight and the result is
  renormalized through the shared splat-sample rules
