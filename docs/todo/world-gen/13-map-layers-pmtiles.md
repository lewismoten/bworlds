# Map Layers and PMTiles

## Feature Model

- [x] Define canonical point, line, and polygon records.
- [x] Keep map features independent from projection.
- [x] Keep map feature IDs stable from world object IDs.
- [x] Add zoom visibility ranges to map features.

Current support:

- `@bworlds/map-support` now exposes canonical
  `MapFeaturePointRecord`, `MapFeatureLineRecord`, and
  `MapFeaturePolygonRecord` creation helpers so future map products and
  PMTiles export paths can normalize feature geometry once before any
  projection-specific work begins.
- Those canonical feature records keep geometry in shared `worldX/worldY`
  coordinates, which keeps map features projection-agnostic instead of
  storing view-specific projected coordinates on the records themselves.
- `createStableMapFeatureId(...)` now gives map layers one deterministic id
  path from `layerId`, `sourceWorldObjectId`, and optional `featureKey`, so
  later export and UI code can track features without inventing ad hoc ids.
- Each canonical feature record now carries a `zoomRange`, and
  `isMapFeatureVisibleAtZoom(...)` gives later tiling or viewer code one
  shared zoom predicate for coarse-versus-fine feature visibility.

## PMTiles

- [x] Create a PMTiles export plugin.
- [x] Generate vector features from world data on demand.
- [x] Use coarse features at low zoom levels.
- [x] Reveal finer features as zoom increases.
- [x] Simplify lines and polygons by zoom level.
- [ ] Keep major rivers visible at low zoom.
- [ ] Reveal local roads and small rivers at higher zoom.
- [ ] Cache generated tiles by world revision.

- `@bworlds/map-support` now exposes a shared `PmtilesExportPlugin`
  contract plus `createPmtilesExportPlugin(...)`, so later map export work
  can normalize plugin ids and per-tile vector feature requests before
  adding any storage- or renderer-specific PMTiles logic.
- `createPmtilesExportRequest(...)` and `createPmtilesTileCoordinate(...)`
  now give that export path one validated request shape around
  `worldRevision`, `zoom/x/y`, and optional `layerIds`, so later on-demand
  feature generation and tile caching can build on one deterministic
  request model.
- `createMapFeatureGeneratorPlugin(...)` and
  `generatePmtilesTileFeatures(...)` now give that PMTiles path one shared
  layer-scoped, on-demand feature generation model, so tile export can ask
  only the relevant generators for a requested `zoom/x/y` tile instead of
  materializing whole-world feature sets first.
- `selectPmtilesTileFeaturesForZoom(...)`,
  `simplifyPmtilesFeatureGeometry(...)`, and
  `generatePmtilesTileFeaturesAtZoomDetail(...)` now give that PMTiles path
  one shared zoom-detail pass for coarse low-zoom geometry, finer high-zoom
  geometry, and zoom-dependent line/polygon simplification without changing
  the underlying canonical world-space feature records.

## Physical Layers

- [ ] Add topographic, relief, and physical map plugins.
- [ ] Add elevation, slope, and geology map plugins.

## Climate Layers

- [ ] Add climate and temperature zone plugins.
- [ ] Add humidity, pressure, weather, and wind plugins.
- [ ] Add ocean current and river flow plugins.

## Human Layers

- [ ] Add political, road, and rail map plugins.
- [ ] Add population heat map and choropleth plugins.
- [ ] Add dot distribution, vector, and isoline plugins.

## 2D and 3D Parity

- [ ] Derive 2D terrain from the same world data as 3D.
- [ ] Derive roads and rivers from the same graphs as 3D.
- [ ] Derive settlements and borders from shared records.
- [ ] Keep 2D tile symbols representative of 3D state.
- [ ] Avoid separate hand-authored map-only world state.
