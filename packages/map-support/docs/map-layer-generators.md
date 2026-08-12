`@bworlds/map-support` now exposes one small shared layer-generator surface
for physical map products built on canonical map features:

- `createTopographicMapFeatureGeneratorPlugin(...)`
- `createReliefMapFeatureGeneratorPlugin(...)`
- `createPhysicalMapFeatureGeneratorPlugin(...)`
- `createElevationMapFeatureGeneratorPlugin(...)`
- `createSlopeMapFeatureGeneratorPlugin(...)`
- `createGeologyMapFeatureGeneratorPlugin(...)`
- `createClimateMapFeatureGeneratorPlugin(...)`
- `createTemperatureZoneMapFeatureGeneratorPlugin(...)`
- `createHumidityMapFeatureGeneratorPlugin(...)`
- `createPressureMapFeatureGeneratorPlugin(...)`
- `createWeatherMapFeatureGeneratorPlugin(...)`
- `createWindMapFeatureGeneratorPlugin(...)`

## Purpose

The PMTiles helpers define how later code requests per-tile feature data. The
layer-generator helpers define conventional plugin wrappers for common
physical-map layer families.

This keeps:

- conventional physical layer ids shared across callers
- topographic contour generation separate from relief polygon generation
- physical feature export paths aligned on the same PMTiles generator contract

## Conventional Layer IDs

The helpers currently reserve these layer ids:

- `topographic`
- `relief`
- `physical`
- `elevation`
- `slope`
- `geology`
- `climate`
- `temperature-zone`
- `humidity`
- `pressure`
- `weather`
- `wind`

That gives later PMTiles export, map styling, and viewer code one stable layer
vocabulary instead of forcing each feature generator to invent its own names.

## Topographic Layers

`createTopographicMapFeatureGeneratorPlugin(...)` wraps a
`getContours(request)` callback and normalizes the generator as:

- `layerId: 'topographic'`
- default `id: 'topographic-map-layer'`
- default `label: 'Topographic Layer'`

The callback returns canonical `MapFeatureLineRecord` values so later contour
generation can stay focused on elevation logic instead of PMTiles plugin
plumbing.

## Relief Layers

`createReliefMapFeatureGeneratorPlugin(...)` wraps a
`getReliefFeatures(request)` callback and normalizes the generator as:

- `layerId: 'relief'`
- default `id: 'relief-map-layer'`
- default `label: 'Relief Layer'`

The callback returns canonical `MapFeaturePolygonRecord` values so later shaded
or classified relief areas can share one polygon-oriented export surface.

## Physical Layers

`createPhysicalMapFeatureGeneratorPlugin(...)` wraps a
`getPhysicalFeatures(request)` callback and normalizes the generator as:

- `layerId: 'physical'`
- default `id: 'physical-map-layer'`
- default `label: 'Physical Layer'`

The callback accepts any canonical `MapFeatureRecord`, which leaves room for
mixed physical features such as landmarks, coastlines, or hybrid layer content
without creating another ad hoc PMTiles wrapper.

## Elevation, Slope, And Geology Layers

`createElevationMapFeatureGeneratorPlugin(...)`,
`createSlopeMapFeatureGeneratorPlugin(...)`, and
`createGeologyMapFeatureGeneratorPlugin(...)` follow the same PMTiles generator
contract with conventional layer ids:

- `layerId: 'elevation'`
- `layerId: 'slope'`
- `layerId: 'geology'`

They default to:

- `id: 'elevation-map-layer'`
- `id: 'slope-map-layer'`
- `id: 'geology-map-layer'`

and:

- `label: 'Elevation Layer'`
- `label: 'Slope Layer'`
- `label: 'Geology Layer'`

These wrappers intentionally accept canonical `MapFeatureRecord` values so
later terrain analysis or geology products can choose point, line, or polygon
features without changing the shared layer-generator contract.

## Climate And Temperature Zone Layers

`createClimateMapFeatureGeneratorPlugin(...)` and
`createTemperatureZoneMapFeatureGeneratorPlugin(...)` follow the same PMTiles
generator contract with conventional layer ids:

- `layerId: 'climate'`
- `layerId: 'temperature-zone'`

They default to:

- `id: 'climate-map-layer'`
- `id: 'temperature-zone-map-layer'`

and:

- `label: 'Climate Layer'`
- `label: 'Temperature Zone Layer'`

These wrappers intentionally accept canonical `MapFeatureRecord` values so
later biome-band, Koppen-style, or temperature-region products can share one
layer contract before the concrete climate analysis logic exists.

## Humidity, Pressure, Weather, And Wind Layers

`createHumidityMapFeatureGeneratorPlugin(...)`,
`createPressureMapFeatureGeneratorPlugin(...)`,
`createWeatherMapFeatureGeneratorPlugin(...)`, and
`createWindMapFeatureGeneratorPlugin(...)` follow the same PMTiles generator
contract with conventional layer ids:

- `layerId: 'humidity'`
- `layerId: 'pressure'`
- `layerId: 'weather'`
- `layerId: 'wind'`

They default to:

- `id: 'humidity-map-layer'`
- `id: 'pressure-map-layer'`
- `id: 'weather-map-layer'`
- `id: 'wind-map-layer'`

and:

- `label: 'Humidity Layer'`
- `label: 'Pressure Layer'`
- `label: 'Weather Layer'`
- `label: 'Wind Layer'`

These wrappers intentionally accept canonical `MapFeatureRecord` values so
later moisture fields, isobars, forecast overlays, and flow-vector products
can share one layer contract before the climate simulation details land.
