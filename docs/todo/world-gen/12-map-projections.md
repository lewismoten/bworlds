# Map Projection Plugins

## Shared API

- [x] Define a map projection plugin interface.
- [x] Accept canonical world coordinates.
- [x] Return projected map coordinates.
- [x] Support inverse projection where practical.
- [x] Expose bounds, wrapping, and distortion metadata.

## Projection Plugins

- [x] Add a Mercator projection plugin.
- [x] Add a Transverse Mercator plugin.
- [x] Add a Miller cylindrical plugin.
- [x] Add a generic conic projection plugin.
- [x] Add an Albers equal-area conic plugin.
- [x] Add an azimuthal projection plugin.
- [x] Add an azimuthal equidistant plugin.
- [x] Add a stereographic projection plugin.
- [x] Add an orthographic projection plugin.
- [x] Add a sinusoidal projection plugin.
- [ ] Add a Mollweide projection plugin.
- [ ] Add an Equal Earth projection plugin.
- [ ] Add a Goode homolosine projection plugin.
- [ ] Add a Robinson projection plugin.
- [ ] Add a Winkel Tripel projection plugin.
- [ ] Add a globe projection plugin.

## Interaction

- [ ] Add mouse pan and wheel zoom to 2D maps.
- [ ] Add touch pan and pinch zoom to 2D maps.
- [ ] Add mouse rotate, pan, and zoom to 3D maps.
- [ ] Preserve selected position across projection changes.

Current support:

- `@bworlds/map-support` now exposes one shared `MapProjectionPlugin`
  contract plus `createMapProjectionPlugin(...)`, so future map products can
  declare stable projection ids, explicit world-space bounds, projected
  map-space bounds, wrapping metadata, distortion families, and optional
  inverse projection support without repeating validation logic.
- `@bworlds/map-support` now also exposes
  `createMercatorMapProjectionPlugin()`, which gives the map stack one
  concrete conformal projection with longitude wrapping, latitude clamping,
  and inverse projection support.
- `@bworlds/map-support` now also exposes
  `createMillerCylindricalMapProjectionPlugin()`, which gives the map stack a
  less pole-stretched cylindrical option with full `±90` latitude support and
  inverse projection support.
- `@bworlds/map-support` now also exposes
  `createTransverseMercatorMapProjectionPlugin()`, which gives the map stack a
  meridian-centered conformal option with inverse projection support and an
  explicit `±80` supported longitude window.
- `@bworlds/map-support` now also exposes
  `createGenericConicMapProjectionPlugin()`, which gives the map stack a
  reusable equidistant conic base with configurable standard parallels,
  central meridian, latitude of origin, and inverse projection support.
- `@bworlds/map-support` now also exposes
  `createAlbersEqualAreaConicMapProjectionPlugin()`, which gives the map
  stack a configurable spherical equal-area conic option with inverse
  projection support and practical default parallels for regional maps.
- `@bworlds/map-support` now also exposes
  `createAzimuthalMapProjectionPlugin()`, which gives the map stack a
  centered spherical azimuthal equal-area option with inverse projection
  support and configurable center longitude and latitude.
- `@bworlds/map-support` now also exposes
  `createAzimuthalEquidistantMapProjectionPlugin()`, which gives the map
  stack a centered spherical azimuthal equidistant option with inverse
  projection support and configurable center longitude and latitude.
- `@bworlds/map-support` now also exposes
  `createStereographicMapProjectionPlugin()`, which gives the map stack a
  centered spherical conformal option with inverse projection support while
  clipping just short of the antipode to keep the normalized map bounds
  finite.
- `@bworlds/map-support` now also exposes
  `createOrthographicMapProjectionPlugin()`, which gives the map stack a
  centered spherical perspective option with inverse projection support for
  visible-disk coordinates and explicit horizon clipping for hidden
  hemisphere coordinates.
- `@bworlds/map-support` now also exposes
  `createSinusoidalMapProjectionPlugin()`, which gives the map stack a
  global equal-area option with full-world coverage and direct inverse
  projection support.
- The projection contract uses canonical `worldX/worldY` inputs and
  `mapX/mapY` outputs so map code can keep world-space and projected-space
  coordinates explicit instead of overloading generic `x` and `y` labels.
- Forward-only and invertible projection modes now share one normalized API,
  which keeps clipped perspective or globe-style views compatible with the
  same contract even when a full inverse mapping is not practical.
- See `packages/map-support/docs/map-projection-plugins.md` for the current
  contract shape and validation rules.
