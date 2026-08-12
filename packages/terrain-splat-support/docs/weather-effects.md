# Weather Effects

`applyTerrainSplatWeatherEffects(...)` applies transient weather state on top of
an already resolved terrain splat sample.

## Goals

- keep the base terrain sample deterministic and reusable
- keep weather state separate from the base texture and layer definitions
- reuse existing `mud` and `snow` layer IDs instead of introducing new
  material identities
- expose simple shader-facing metadata for wetness-driven roughness and tint
  adjustments

## Inputs

- a normalized base `TerrainSplatSample`
- current weather intensity, precipitation, kind, and temperature
- persistent state such as `sustainedWetness`, `snowAccumulation`, and optional
  `snowMelt`
- the shared `mudLayerId` and `snowLayerId`

## Outputs

The resolver returns:

- `baseSample`: the untouched base sample
- `sample`: the weather-adjusted sample
- `wetness`: normalized wetness signal for shading
- `roughnessMultiplier`: wet-terrain roughness reduction
- `tintDarkening`: wet-terrain darkening amount
- `snowWeight` and `mudWeight`: the normalized overlay weights that were
  actually applied

## Behavior

- rain increases `wetness` and can add a `mud` overlay
- snow weather and existing snow accumulation increase the `snow` overlay
- warm rain or explicit `snowMelt` reduces retained snow cover
- snow and mud overlays share a bounded part of the total sample so the result
  stays normalized and never creates a weather-specific material clone
