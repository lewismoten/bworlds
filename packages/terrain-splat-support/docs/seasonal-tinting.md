# Terrain Splat Seasonal Tinting

`@bworlds/terrain-splat-support` now includes
`resolveTerrainMaterialLayerSeasonalTintTransform(...)` for season-aware tint
metadata.

## Goals

- keep seasonal appearance changes separate from base textures
- layer seasonal tinting on top of the existing deterministic tint-variation
  path instead of creating a second color pipeline
- preserve one shared terrain layer identity while still exposing season-aware
  color drift for renderer code

## Behavior

- the resolver starts from `resolveTerrainMaterialLayerTintTransform(...)`
- it keeps `baseResolvedTint` so renderer code can inspect the non-seasonal tint
- it applies a small shared seasonal mix to produce the final `resolvedTint`
- the same seed, coordinates, layer, terrain kind, and season always resolve
  to the same tint metadata

## Current seasonal profiles

- `spring`: slightly greener
- `summer`: slightly warmer and brighter
- `autumn`: warmer and more earth-toned
- `winter`: cooler and more desaturated

## Current limits

- seasonal tinting is still metadata only; no shader integration exists yet
- seasonal shifts are shared profiles, not biome-specific curves
- transitions between seasons are discrete until later code introduces
  interpolation or season-progress inputs
