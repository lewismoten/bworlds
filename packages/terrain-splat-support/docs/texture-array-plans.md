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

Why this exists separately from the renderer:

- terrain layer indices must stay aligned across all arrays before shaders can
  safely sample by packed layer index
- chunk generation and validation should be able to fail fast on mismatched
  source assets without requiring a browser or WebGL context
- memory estimates are useful for budget tooling long before upload code exists

Current rules:

- array depth follows the shared terrain layer catalog order
- each plan requires one texture descriptor per participating layer
- width and height must match across every layer in one plan
- format must match across every layer in one plan
- bytes per pixel must match across every layer in one plan
- optional maps such as metalness and ambient occlusion must be complete for
  the layers included in that plan; partial participation is rejected

This closes the planning and validation part of the texture-array checklist,
but not the renderer work. WebGL2 upload, fallback materials, and shader
sampling are still separate follow-up tasks.
