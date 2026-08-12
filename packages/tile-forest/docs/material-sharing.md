# Forest Material Sharing

`packages/tile-forest/src/index.ts` now splits forest materials into two tiers:

- family-scoped structural materials for trunk bark and canopy foliage
- host-scoped shared accessory materials for landmarks, wildlife, floor detail,
  and trail props

## Why

Broadleaf and conifer trees still need distinct bark and foliage materials so
their structure reads correctly at a glance.

The surrounding accessories did not justify the same duplication. Stone rings,
mushroom rings, owl bodies, spiders, meadow grass, breadcrumbs, and bird
silhouettes were previously rebuilt once per tree family even though the visual
difference was minor and the extra unique materials added pressure to mixed
forest scenes.

## Current rule

For one Three host:

- bark and foliage stay cached per tree family
- accessory materials are cached once and reused across every forest tile

That keeps the structural tree silhouette readable while reducing material
pressure from `tile-forest` in scenes that mix broadleaf and pine tiles.
