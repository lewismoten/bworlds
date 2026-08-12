`@bworlds/map-support` now exposes one small shared layer-generator surface
for physical map products built on canonical map features:

- `createTopographicMapFeatureGeneratorPlugin(...)`
- `createReliefMapFeatureGeneratorPlugin(...)`
- `createPhysicalMapFeatureGeneratorPlugin(...)`

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
