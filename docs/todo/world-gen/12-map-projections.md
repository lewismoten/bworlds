# Map Projection Plugins

## Shared API

- [x] Define a map projection plugin interface.
- [x] Accept canonical world coordinates.
- [x] Return projected map coordinates.
- [x] Support inverse projection where practical.
- [x] Expose bounds, wrapping, and distortion metadata.

## Projection Plugins

- [x] Add a Mercator projection plugin.
- [ ] Add a Transverse Mercator plugin.
- [x] Add a Miller cylindrical plugin.
- [ ] Add a generic conic projection plugin.
- [ ] Add an Albers equal-area conic plugin.
- [ ] Add an azimuthal projection plugin.
- [ ] Add an azimuthal equidistant plugin.
- [ ] Add a stereographic projection plugin.
- [ ] Add an orthographic projection plugin.
- [ ] Add a sinusoidal projection plugin.
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
- The projection contract uses canonical `worldX/worldY` inputs and
  `mapX/mapY` outputs so map code can keep world-space and projected-space
  coordinates explicit instead of overloading generic `x` and `y` labels.
- Forward-only and invertible projection modes now share one normalized API,
  which keeps clipped perspective or globe-style views compatible with the
  same contract even when a full inverse mapping is not practical.
- See `packages/map-support/docs/map-projection-plugins.md` for the current
  contract shape and validation rules.
