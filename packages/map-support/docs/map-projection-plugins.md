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

Current built-in support:

- `createMercatorMapProjectionPlugin()`
- `createMillerCylindricalMapProjectionPlugin()`

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

## Mercator

`createMercatorMapProjectionPlugin()` provides the first concrete projection
implementation on top of the shared contract.

It currently:

- uses `id: 'mercator'`
- declares `distortion: 'conformal'`
- wraps world X but not world Y
- clamps latitude to `±85.0511287798066`
- supports inverse projection back to `worldX/worldY`

The projected range is normalized to:

- `mapX` within `-1..1` for `worldX` within `-180..180`
- `mapY` within roughly `-1..1` for clamped Mercator latitude

This gives later map UIs one stable starting projection before the rest of the
projection catalog is implemented.

## Miller Cylindrical

`createMillerCylindricalMapProjectionPlugin()` provides a second built-in
projection with gentler polar stretching than Mercator.

It currently:

- uses `id: 'miller-cylindrical'`
- declares `distortion: 'compromise'`
- wraps world X but not world Y
- supports the full `±90` latitude range
- supports inverse projection back to `worldX/worldY`

The projected range is normalized to:

- `mapX` within `-1..1` for `worldX` within `-180..180`
- `mapY` within `-1..1` for `worldY` within `-90..90`

This gives later map UIs one less pole-distorted cylindrical option while the
rest of the projection catalog is still being built.
