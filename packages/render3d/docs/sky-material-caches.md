# Sky Material Caches

`render3d` keeps long-lived sky-layer materials cached on the owning sky root
instead of recreating equivalent materials on every sync.

## Covered layers

- constellation connection lines
- constellation star sprites
- Milky Way belt fill mesh
- Milky Way belt center line
- aurora ribbons, crests, and ribs
- celestial event sprites and trail lines

## Cache policy

- cache keys use the effective render properties that affect the material
  identity, primarily color, opacity, and layer role
- caches are scoped per root `THREE.Group` so one renderer reuses materials
  across updates without leaking ownership across unrelated hosts
- the shared material cache hit/miss counters include these sky caches so
  runtime diagnostics can show whether sky updates are reusing materials

## Why this matters

Sky layers update frequently. Without root-level caches, repeated syncs create
fresh materials even when nothing about the effective render state changed,
which inflates material churn and muddies runtime performance diagnostics.
