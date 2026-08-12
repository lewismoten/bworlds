# Terrain Splat Variant Pools

`@bworlds/terrain-splat-support/variant-pool` provides one bounded,
deterministic way to reuse a small family of terrain material layers.

Main responsibilities:

- define shared terrain material families such as grass, soil, or rock
- keep each family limited to a small number of layer variants
- validate that family variants reference known terrain layers
- select one variant deterministically from seed and world coordinates

Current API:

- `validateTerrainMaterialFamilyDefinition(...)`
- `createTerrainMaterialFamilyCatalog(...)`
- `resolveTerrainMaterialFamilyVariant(...)`

Why this exists:

- terrain plugins can share one small variant pool instead of inventing new
  material instances per chunk
- deterministic selection keeps the same world coordinates visually stable for
  the same seed
- bounded pools support later material and texture-array reuse work

Current limits:

- default maximum family size is `4` variants
- duplicate layer IDs inside one family are rejected
- unknown layer IDs are rejected before the family enters a shared catalog
