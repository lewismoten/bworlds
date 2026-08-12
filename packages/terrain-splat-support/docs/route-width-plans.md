# Terrain Route Width Plans

`@bworlds/terrain-splat-support/route-width-plan` resolves deterministic road
and trail widths from lightweight route metadata.

## Goals

- keep route width decisions out of renderer-specific road mesh code
- let terrain splat builders and overlay planners consume one shared width
  contract
- keep trails narrower than roads while still allowing wider major routes

## Main API

- `createTerrainRouteWidthPlan(...)`

## Model

- `path` defaults to `trail`-class widths and scales within a narrow range from
  traffic intensity
- `road` widths come from one route class plus optional traffic intensity
- when route class metadata is absent, road signal is used to infer a stable
  class from `local-road` through `highway`
