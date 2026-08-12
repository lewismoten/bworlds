# Terrain Splat Tint Variation

`@bworlds/terrain-splat-support` now includes renderer-free tint-variation
support for terrain layers. This keeps small color drift tied to shared layer
metadata instead of requiring duplicate textures or per-chunk material clones.

Current responsibilities:

- let each layer define one optional `tintVariation` strength within `0..1`
- resolve one stable tint transform from `seed`, world position, layer ID, and
  terrain kind
- preserve the normalized `defaultTint` alongside the resolved tint so renderer
  code can compare the base color against the varied color later
- keep tint variation deterministic for the same seed and coordinates
- keep tint variation scoped to metadata so compatible chunks can still share
  one material and apply color drift through uniforms, attributes, or shader
  inputs later

Current limits:

- tint variation is one brightness-style multiplier around the default tint,
  not a full hue/saturation transform
- the package does not apply tint variation in shaders yet; it only resolves
  deterministic metadata for later renderer integration
