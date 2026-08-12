# Terrain Splat Height Fields

`@bworlds/terrain-splat-support/height-field` builds one shared height field and
one geometry plan for splat terrain chunks without coupling height to splat
weight generation.

## Goals

- use one shared world-space height field for splat geometry
- keep splat weights independent from terrain height selection
- keep neighboring chunk border heights identical by sampling the same world
  corner coordinates

## Main API

- `createTerrainHeightField(...)`
- `getTerrainHeightFieldSample(...)`
- `createTerrainSplatHeightGeometryPlan(...)`

## Height model

- the height field samples one value per chunk corner
- a compatible splat grid uses the same bounds and step as the height field
- geometry plans emit positions, seam-safe normals, uvs, and indices from the
  height field without mutating splat sample weights
- geometry plans can raise `lodStepMultiplier` to sample every nth corner for
  distant terrain and reduce vertex/triangle density while preserving bounds

## Current normal behavior

- normals are derived from the same shared corner samples that drive positions
- `normalSampleRing` can request one or more extra world-space sample rings so
  border normals can compare against the same neighboring heights on both sides
  of a chunk seam
- chunk borders therefore agree on both planar and curved seams when callers
  provide the extra ring their normal sampling needs

## Current limits

- this module does not yet attach the geometry plan to a live renderer mesh
- callers still decide how the shared world height resolver is sourced
