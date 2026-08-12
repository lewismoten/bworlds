`@bworlds/map-support` now exposes one small shared terrain-surface bridge for
2D and 3D map parity:

- `createMapTerrainSurfaceCellBounds(...)`
- `createMapTerrainSurfaceFeatureRecord(...)`
- `createTerrainSurfaceMapFeatureGeneratorPlugin(...)`

## Purpose

`@bworlds/worldgen` already exposes one authoritative terrain sampler for
surface height, sea depth, slope, and related terrain signals. The terrain
surface bridge lets later 2D map export reuse those shared terrain samples by
converting them into canonical map polygons.

This keeps:

- 2D terrain derivation anchored to the same sampled terrain state as 3D
- terrain cell geometry normalized before PMTiles export or map styling
- terrain metadata carried on canonical map features instead of map-only state

## Terrain Surface Records

`createMapTerrainSurfaceFeatureRecord(...)` turns one normalized terrain cell
sample into one canonical polygon feature in the conventional
`terrain-surface` layer.

The resulting feature properties currently carry:

- `surfaceHeight`
- `seaLevel`
- `depthBelowSeaLevel`
- `isBelowSeaLevel`
- optional `surfaceKind`
- optional `slopeGrade`

That gives later map rendering and export code one shared terrain vocabulary
instead of recomputing or reformatting terrain state for every 2D product.

## Terrain Surface Generators

`createTerrainSurfaceMapFeatureGeneratorPlugin(...)` wraps
`getTerrainSurfaceSamples(request)` and normalizes the generator as:

- `layerId: 'terrain-surface'`
- default `id: 'terrain-surface-map-layer'`
- default `label: 'Terrain Surface Layer'`

That gives later PMTiles export or map rendering code one shared bridge from
authoritative terrain samples to canonical terrain surface polygons, which is a
necessary step toward keeping 2D terrain derived from the same world data as 3D.
