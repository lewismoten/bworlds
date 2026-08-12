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

- `createAzimuthalEquidistantMapProjectionPlugin()`
- `createAzimuthalMapProjectionPlugin()`
- `createAlbersEqualAreaConicMapProjectionPlugin()`
- `createGenericConicMapProjectionPlugin()`
- `createEqualEarthMapProjectionPlugin()`
- `createGoodeHomolosineMapProjectionPlugin()`
- `createMercatorMapProjectionPlugin()`
- `createMillerCylindricalMapProjectionPlugin()`
- `createMollweideMapProjectionPlugin()`
- `createOrthographicMapProjectionPlugin()`
- `createRobinsonMapProjectionPlugin()`
- `createSinusoidalMapProjectionPlugin()`
- `createStereographicMapProjectionPlugin()`
- `createTransverseMercatorMapProjectionPlugin()`
- `createWinkelTripelMapProjectionPlugin()`

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

## Generic Conic

`createGenericConicMapProjectionPlugin()` provides a reusable equidistant
conic projection with configurable standard parallels, central meridian, and
latitude of origin.

It currently:

- uses `id: 'generic-conic'` by default
- declares `distortion: 'equidistant'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- defaults to standard parallels `20` and `60`
- defaults to central meridian `0` and latitude of origin `0`

The default normalized range is based on sampled projected extents across the
configured world bounds.

This gives later map UIs one reusable conic base that can be customized
without forcing every conic variant to reimplement the same spherical forward
and inverse plumbing.

## Albers Equal-Area Conic

`createAlbersEqualAreaConicMapProjectionPlugin()` provides a spherical
equal-area conic projection with configurable standard parallels, central
meridian, and latitude of origin.

It currently:

- uses `id: 'albers-equal-area-conic'` by default
- declares `distortion: 'equal-area'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- defaults to standard parallels `29.5` and `45.5`
- defaults to central meridian `-96` and latitude of origin `23`

The default normalized range is based on sampled projected extents across the
configured world bounds.

This gives later map UIs one equal-area conic option built directly on the
same normalized plugin contract instead of leaving Albers as a one-off
special case.

## Azimuthal

`createAzimuthalMapProjectionPlugin()` provides a centered spherical
azimuthal equal-area projection with configurable center longitude and
latitude.

It currently:

- uses `id: 'azimuthal'` by default
- declares `distortion: 'equal-area'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- defaults to a `0,0` center

The projected range is normalized to a circular disk with radius `2`, which
maps to `mapX/mapY` within `-1..1`.

This gives later map UIs one general-purpose azimuthal option while leaving
equidistant, stereographic, and orthographic azimuthal variants available as
separate focused implementations.

## Azimuthal Equidistant

`createAzimuthalEquidistantMapProjectionPlugin()` provides a centered
spherical azimuthal equidistant projection with configurable center longitude
and latitude.

It currently:

- uses `id: 'azimuthal-equidistant'` by default
- declares `distortion: 'equidistant'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- defaults to a `0,0` center

The projected range is normalized to a circular disk with radius `pi`, which
maps to `mapX/mapY` within `-1..1`.

This gives later map UIs one distance-preserving azimuthal option while
keeping the general azimuthal equal-area path and the later orthographic and
stereographic variants separate.

## Stereographic

`createStereographicMapProjectionPlugin()` provides a centered spherical
stereographic projection with configurable center longitude and latitude.

It currently:

- uses `id: 'stereographic'` by default
- declares `distortion: 'conformal'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- defaults to a `0,0` center
- clips the angular distance to `179` degrees to keep the normalized map
  bounds finite near the antipode

The projected range is normalized to a circular disk using the clipped
stereographic radius, which maps to `mapX/mapY` within `-1..1`.

This gives later map UIs one conformal azimuthal option that stays compatible
with the shared normalized plugin contract instead of leaving stereographic as
an unbounded special case.

## Orthographic

`createOrthographicMapProjectionPlugin()` provides a centered spherical
orthographic projection with configurable center longitude and latitude.

It currently:

- uses `id: 'orthographic'` by default
- declares `distortion: 'perspective'`
- does not wrap world X or world Y
- supports inverse projection for points inside the visible disk
- defaults to a `0,0` center
- clips hidden-hemisphere forward projection to the horizon so projected
  coordinates stay inside the normalized disk

The projected range is normalized to a circular disk with radius `1`, which
maps to `mapX/mapY` within `-1..1`.

This gives later map UIs one globe-like azimuthal option that preserves the
shared plugin contract while making the visible-hemisphere limit explicit.

## Sinusoidal

`createSinusoidalMapProjectionPlugin()` provides a global sinusoidal
equal-area projection with a straightforward inverse.

It currently:

- uses `id: 'sinusoidal'`
- declares `distortion: 'equal-area'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- supports the full `±180` longitude and `±90` latitude range

The projected range is normalized from raw sinusoidal coordinates:

- `mapX` within `-1..1` from `longitudeRadians * cos(latitudeRadians)`
- `mapY` within `-1..1` from latitude

This gives later map UIs one simple equal-area world projection that covers
the full globe without requiring sampled extents or clipped azimuthal bounds.

## Mollweide

`createMollweideMapProjectionPlugin()` provides a global elliptical
equal-area projection with a closed-form inverse and a small Newton solver in
the forward path.

It currently:

- uses `id: 'mollweide'`
- declares `distortion: 'equal-area'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- supports the full `±180` longitude and `±90` latitude range

The projected range is normalized from raw Mollweide coordinates:

- `mapX` within `-1..1` from the standard `2 * sqrt(2)` horizontal extent
- `mapY` within `-1..1` from the standard `sqrt(2)` vertical extent

This gives later map UIs one full-world equal-area option with an oval map
footprint while still fitting the same normalized projection plugin contract.

## Equal Earth

`createEqualEarthMapProjectionPlugin()` provides a global pseudocylindrical
equal-area projection using the standard Equal Earth polynomial constants.

It currently:

- uses `id: 'equal-earth'`
- declares `distortion: 'equal-area'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- supports the full `±180` longitude and `±90` latitude range

The projected range is normalized from the standard Equal Earth horizontal
and vertical extents derived from the published polynomial coefficients.

This gives later map UIs a modern full-world equal-area projection with a
less aggressively stretched appearance than Mollweide while still fitting the
shared normalized plugin contract.

## Goode Homolosine

`createGoodeHomolosineMapProjectionPlugin()` provides a global equal-area
composite projection that uses sinusoidal math near the equator and
Mollweide math toward the poles.

It currently:

- uses `id: 'goode-homolosine'`
- declares `distortion: 'equal-area'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- supports the full `±180` longitude and `±90` latitude range
- switches branches at `±40.733333333333334` degrees latitude

The projected range is normalized from the standard uninterrupted
homolosine extents, including the usual Mollweide Y offset outside the
equatorial branch.

This gives later map UIs a classic full-world equal-area composite
projection while still fitting the same normalized plugin contract.

## Robinson

`createRobinsonMapProjectionPlugin()` provides a global table-driven
compromise projection using the standard 5-degree Robinson coefficient
tables.

It currently:

- uses `id: 'robinson'`
- declares `distortion: 'compromise'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- supports the full `±180` longitude and `±90` latitude range

The projected range is normalized from the standard Robinson reference
extents, with forward interpolation between 5-degree latitude table rows and
numeric inversion of the Y lookup.

This gives later map UIs a classic world-atlas compromise projection while
still fitting the shared normalized plugin contract.

## Winkel Tripel

`createWinkelTripelMapProjectionPlugin()` provides a global compromise
projection built from the arithmetic mean of Aitoff and equirectangular
projection components.

It currently:

- uses `id: 'winkel-tripel'`
- declares `distortion: 'compromise'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- supports the full `±180` longitude and `±90` latitude range
- uses the standard parallel `50.467` degrees

The projected range is normalized from the standard global Winkel Tripel
extents, with forward projection computed directly and inverse projection
solved numerically.

This gives later map UIs a modern atlas-style compromise projection with
lower aggregate distortion than equirectangular while still fitting the
shared normalized plugin contract.

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

## Transverse Mercator

`createTransverseMercatorMapProjectionPlugin()` provides a conformal
projection centered on a vertical meridian instead of the equator.

It currently:

- uses `id: 'transverse-mercator'`
- declares `distortion: 'conformal'`
- does not wrap world X or world Y
- supports inverse projection back to `worldX/worldY`
- clamps longitude to `±80` around the central meridian to keep the
  normalized projected range finite

The projected range is normalized to:

- `mapX` within `-1..1` for `worldX` within `-80..80`
- `mapY` within `-1..1` for `worldY` within `-90..90`

This gives later map UIs one meridian-centered conformal option that is better
suited to tall regional extents than standard Mercator.
