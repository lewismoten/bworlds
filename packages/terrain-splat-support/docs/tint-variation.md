# Terrain Splat Tint Variation

`@bworlds/terrain-splat-support` now includes renderer-free tint-variation
support for terrain layers. This keeps small color drift tied to shared layer
metadata instead of requiring duplicate textures or per-chunk material clones.

Current responsibilities:

- let each layer define one optional `tintVariation` strength within `0..1`
- let each layer optionally quantize tint variation into larger
  `tintVariationCellSize` regions
- resolve one stable tint transform from `seed`, world position, layer ID, and
  terrain kind
- preserve the normalized `defaultTint` alongside the resolved tint so renderer
  code can compare the base color against the varied color later
- keep tint variation deterministic for the same seed and coordinates
- keep nearby samples inside one tint-variation cell on the same resolved color
  field when broader terrain color drift is desired
- keep tint variation scoped to metadata so compatible chunks can still share
  one material and apply color drift through uniforms, attributes, or shader
  inputs later

Current limits:

- tint variation is one brightness-style multiplier around the default tint,
  not a full hue/saturation transform
- broad tint fields use square world-space cells rather than a continuous noise
  function
- the package does not apply tint variation in shaders yet; it only resolves
  deterministic metadata for later renderer integration
