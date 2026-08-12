`@bworlds/map-support` now exposes one small shared contract for map
projection plugins:

- `MapProjectionPlugin`
- `MapProjectionWorldCoordinate`
- `MapProjectionMapCoordinate`
- `MapProjectionBounds`
- `MapProjectionWrapping`
- `MapProjectionDistortion`
- `createMapProjectionPlugin(...)`

The contract is intentionally narrow so later 2D and 3D map products can
share one projection vocabulary before concrete Mercator, conic, azimuthal,
or globe plugins land.

## Coordinate Contract

Projection plugins accept canonical world coordinates through:

- `worldX`
- `worldY`

Projection plugins return projected map coordinates through:

- `mapX`
- `mapY`

This keeps projection code explicit about the conversion boundary instead of
reusing generic `x` and `y` labels for two different spaces.

## Metadata

Each projection declares:

- `id`
- optional `label`
- `bounds`
- `wrapping`
- `distortion`

`bounds` exposes both world-space and projected map-space limits, while
`wrapping` declares whether world-space X or Y wraps across the projection
domain. `distortion` keeps broad projection families explicit for later UI,
debugging, and projection-picking logic.

## Forward And Inverse Projection

Every projection must implement:

- `project({ worldX, worldY })`

Projections may also implement:

- `invert({ mapX, mapY })`

`invert(...)` stays optional because some perspective or heavily clipped
projection modes are not practical to invert everywhere.

## Normalization

`createMapProjectionPlugin(...)` normalizes and validates:

- non-empty plugin ids
- finite world and map bounds
- ordered min/max bounds
- supported distortion labels
- finite projected coordinates
- finite inverted coordinates when inverse projection is provided

That keeps later projection implementations focused on math instead of
repeating declaration validation.
