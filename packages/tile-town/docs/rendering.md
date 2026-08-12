# Tile Town Rendering

The full-detail town tile now also exposes a progressive build path so the
renderer can spread more of the town landmark work across multiple frames.

Town wall and roof surfaces now also reuse neutral painted pattern textures per
Three host and per pattern variant. Regional variation comes from material
tinting instead of repainting separate full-color wall and roof textures for
every palette, which keeps the same town silhouettes while reducing avoidable
texture ownership.

Current progressive phases:

- `buildings-primary`
- `buildings-secondary`
- `buildings-tertiary`
- `sign`
- `banners`
- `night-lights`

Full-detail town tiles now use the `building-body` `InstancedMesh` as the tile
root and attach the roof, door, window, sign, banner, and night-light content
beneath it. That removes one static wrapper `Group` from each visible full-
detail town tile while preserving the same world-space building layout.

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.
