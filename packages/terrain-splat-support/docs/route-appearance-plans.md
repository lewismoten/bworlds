# Terrain Route Appearance Plans

`@bworlds/terrain-splat-support/route-appearance-plan` resolves one
renderer-free appearance profile for roads and trails from traffic and weather
signals.

## Goals

- keep route wear and weather decisions out of renderer-specific road mesh code
- let future splat shaders and mesh fallbacks consume one shared appearance
  contract
- make dirt-road ruts, worn trail centers, edge regrowth, mud, and snow cover
  deterministic from shared route metadata

## Main API

- `resolveTerrainRouteAppearanceProfile(...)`

## Model

- traffic intensity increases overall wear on roads and trails
- dirt-like roads can expose wheel-rut variation under heavier and wetter use
- trails bias toward worn centers under higher traffic and edge grass under
  lighter traffic
- rain and retained wetness darken routes and increase mud strength
- snow accumulation and active snow weather add bounded partial snow cover
  without forcing a unique route material identity

## Output

- normalized `wearStrength`, `wheelRutStrength`, `wornCenterStrength`, and
  `edgeGrassStrength`
- normalized `wetness`, `mudStrength`, and `snowCoverStrength`
- roughness and tint hints that later renderers can apply without cloning
  route materials
- one short reason string describing the dominant appearance driver
