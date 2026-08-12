# Terrain Texture Array Plans

`@bworlds/terrain-splat-support/texture-array-plan` adds the renderer-free
planning layer for the eventual WebGL2 terrain texture-array path.

The module does not upload textures or create GPU resources. It answers the
questions that need stable, testable rules before renderer integration:

- which layer index each terrain material layer occupies
- which texture ID each array slot should read for one map purpose
- whether all participating textures use the same dimensions
- whether all participating textures use the same format
- whether all participating textures use the same bytes-per-pixel budget
- how much memory one planned array would use before renderer upload
- which catalog layers are actively participating in the current plan set
- which catalog layers were skipped as unused for the current chunk or
  neighborhood layer subset

The current planner supports one plan per texture purpose:

- `baseColor`
- `normal`
- `roughness`
- `metalness`
- `ambientOcclusion`

The default multi-plan entry point builds the required PBR baseline:

- base color
- normal
- roughness

The module now also exposes a binding-plan entry point that can choose between:

- `texture-array` mode when WebGL2-style array sampling is available
- `per-layer-textures` fallback mode when texture arrays are unavailable

Capability-aware entry points:

- `assessTerrainTextureArrayCapabilities(...)`
- `createTerrainTextureBindingPlanSetFromCapabilities(...)`

Why this exists separately from the renderer:

- terrain layer indices must stay aligned across all arrays before shaders can
  safely sample by packed layer index
- chunk generation and validation should be able to fail fast on mismatched
  source assets without requiring a browser or WebGL context
- memory estimates are useful for budget tooling long before upload code exists

Current rules:

- array depth follows the shared terrain layer catalog order
- callers may provide an active layer subset so plans only include the layers
  needed for the current chunk or neighborhood
- each plan requires one texture descriptor per participating layer
- width and height must match across every layer in one plan
- format must match across every layer in one plan
- bytes per pixel must match across every layer in one plan
- optional maps such as metalness and ambient occlusion must be complete for
  the layers included in that plan; partial participation is rejected
- plan sets warn when catalog layers are skipped as unused
- plan sets warn when requested active layer IDs are missing from the catalog
- binding plans warn when they had to fall back away from texture arrays
- capability-aware binding plans can reject array mode when runtime limits such
  as `maxTextureSize`, `maxArrayTextureLayers`, or available texture units are
  too small for the current plan

Fallback behavior:

- fallback mode keeps the same stable layer IDs and layer indices
- fallback mode resolves one texture descriptor per active layer and purpose
- fallback mode does not require matching dimensions or formats across layers
- fallback mode still reports deterministic texture memory estimates
- fallback mode still fails when a required texture descriptor is missing

This now closes the planning, capability-gating, and validation part of the
texture-array checklist, but not the renderer upload work. Concrete WebGL2
upload and live material binding are still separate follow-up tasks.
