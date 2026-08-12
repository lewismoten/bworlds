# Terrain Route Junction Blends

`@bworlds/terrain-splat-support/route-junction-blend` composes multiple
world-space route contributions into one normalized terrain splat sample.

## Goals

- let crossroads and other junctions stay on the shared splat path without
  requiring overlapping road meshes
- merge multiple route contributions by layer ID into one bounded sample
- keep intersection samples deterministic across chunk boundaries when the same
  world point is queried more than once

## Main API

- `blendTerrainRouteJunctionIntoSample(...)`

## Model

- accepts one base terrain sample plus one set of route contributions that
  already came from world-space route sampling
- combines route weights with the same bounded overlap rule used elsewhere in
  the terrain splat helpers
- merges repeated route layer IDs so one route material family appears once in
  the final sample instead of stacking duplicate mesh-like entries

## Output

- one `combinedRouteWeight` describing the total junction influence
- one `routeLayerWeights` map keyed by route layer ID
- one normalized final terrain splat sample ready for later shader or worker
  stages
