# Terrain Splat UV Transforms

`@bworlds/terrain-splat-support` now includes renderer-free UV transform support
for terrain layers. This keeps rotation and mirroring decisions in the shared
terrain catalog instead of duplicating textures or letting each terrain plugin
invent its own transform rules.

Current responsibilities:

- allow each layer to advertise supported `uvRotationQuarterTurns`
- allow each layer to opt into deterministic `U` and `V` mirroring
- resolve one stable UV transform from `seed`, world position, and layer ID
- keep `textureScale` attached to the resolved transform so shader and mesh
  code can use one shared shape later
- project deterministic world-space UV samples from shared layer metadata
- keep repeated world-space spans aligned so chunk edges can reuse the same UV
  sampling rules
- validate that configured quarter turns stay within `0..3` and do not repeat

Current limits:

- rotation is limited to `0`, `90`, `180`, and `270` degree turns
- mirroring is a boolean per axis rather than an arbitrary transform matrix
- the package does not apply UV transforms in shaders yet; it resolves
  deterministic metadata and world-space sample coordinates for later renderer
  integration
