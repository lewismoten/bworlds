# Terrain Route Overlay Material Plans

`@bworlds/terrain-splat-support/route-overlay-material-plan` resolves one
shared overlay-material signature from the selected route layer.

## Goals

- keep route overlay geometry separate from route overlay material identity
- let narrow trail and forced-overlay road chunks reuse one material key
- surface unique overlay-material fallbacks before renderer integration

## Main API

- `createTerrainRouteOverlayMaterialPlan(...)`
- `summarizeTerrainRouteOverlayMaterialReuse(...)`

## Material model

- only overlay routes produce a material plan; splat-only roads return `null`
- the material key is driven by the chosen terrain layer textures and defaults
- overlay width, shoulder width, and projected points stay out of the key so
  compatible chunks can share one material while geometry varies independently
