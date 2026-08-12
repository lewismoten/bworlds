## Terrain Surface Selection

`render3d` now centralizes terrain-surface selection in
`src/terrain-surface-mode.ts`.

Current behavior:

- flat `road` tiles now render with `activeMode: 'shared-splat'`
- those roads use the renderer-owned shared floor batching path instead of the
  route ribbon mesh
- `bridge` and `dock` remain ineligible because their route plan still
  requires real geometry
- non-route terrain remains on the legacy path until a renderer-owned shared
  terrain surface exists

Why this exists before full live splat rendering:

- the renderer needs one tested decision point before it can selectively
  replace plugin road meshes with shared terrain rendering
- route eligibility should reuse the existing
  `@bworlds/terrain-splat-support/route-render-plan` logic instead of
  re-encoding bridge, dock, and overlay decisions inside `render3d`
- the current road path is still an interim flat shared surface, not the final
  packed terrain-splat shader/material path for general terrain blending
