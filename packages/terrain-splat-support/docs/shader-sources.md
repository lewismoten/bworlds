# Terrain Splat Shader Sources

`@bworlds/terrain-splat-support/shader-source` builds one bounded terrain splat
shader-source variant from the shared material and texture-binding plans.

## Goals

- sample terrain layers from shared texture-array or fallback bindings
- blend base color, normal, roughness, and optional maps from packed weights
- keep shader variants bounded by binding mode and feature set instead of chunk
  identity

## Main API

- `createTerrainSplatShaderSourcePlan(...)`

## Shader model

- vertex inputs use `terrainSplatLayerIndices` and `terrainSplatLayerWeights`
- fragment blending uses one fixed `for (int i = 0; i < 4; ++i)` loop
- tinting is applied after texture blending
- blended normals are normalized before the resolved output is exposed
- optional metalness and ambient occlusion paths only appear when their maps are
  present in the shared binding plan

## Current limits

- this module emits shader source and variant metadata only
- it does not compile or attach a live `ShaderMaterial` yet
- final renderer integration still needs to map the resolved outputs onto the
  engine material pipeline
