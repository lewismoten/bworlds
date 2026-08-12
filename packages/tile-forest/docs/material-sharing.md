# Forest Material Sharing

`packages/tile-forest/src/index.ts` now splits forest materials into two tiers:

- family-scoped structural materials for trunk bark and canopy foliage
- host-scoped shared accessory materials for landmarks, wildlife, floor detail,
  and trail props

The structural tree materials now also share one host-scoped neutral bark
texture and one host-scoped neutral foliage texture. Family distinction comes
from `MeshStandardMaterial.color` tinting instead of painting separate bark and
leaf textures for broadleaf versus conifer trees.

Oak and birch now stay on that same shared broadleaf material bundle, but the
instanced trunk, branch, and foliage meshes apply per-instance color shifts.
That keeps nearby broadleaf species visually distinct without paying another
pair of broadleaf bark/foliage materials.

## Why

Broadleaf and conifer trees still need distinct bark and foliage materials so
their structure reads correctly at a glance.

They do not need distinct painted textures for that distinction. Geometry plus
material tint is enough to keep the families legible while avoiding more unique
texture ownership.

The surrounding accessories did not justify the same duplication. Stone rings,
mushroom rings, owl bodies, spiders, meadow grass, breadcrumbs, and bird
silhouettes were previously rebuilt once per tree family even though the visual
difference was minor and the extra unique materials added pressure to mixed
forest scenes.

## Current rule

For one Three host:

- bark and foliage stay cached per tree family
- oak and birch distinction comes from per-instance tint on the shared
  broadleaf instanced meshes instead of another species-scoped material pair
- bark and foliage texture maps stay shared across those families
- low-detail tree instances reuse those same family bark and foliage materials
  instead of creating a separate low-detail-only pair, while still carrying
  species tint through instance colors
- accessory materials are cached once and reused across every forest tile

That keeps the structural tree silhouette readable while reducing material
pressure from `tile-forest` in scenes that mix broadleaf and pine tiles.
