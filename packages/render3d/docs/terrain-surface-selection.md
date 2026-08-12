## Terrain Surface Selection

`render3d` now centralizes terrain-surface selection in
`src/terrain-surface-mode.ts`.

Current behavior:

- every tile still renders with `activeMode: 'legacy-mesh'`
- flat `road` tiles are marked `sharedSplatEligible: true`
- `bridge` and `dock` remain ineligible because their route plan still
  requires real geometry
- non-route terrain remains on the legacy path until a renderer-owned shared
  terrain surface exists

Why this exists before live splat rendering:

- the renderer needs one tested decision point before it can selectively
  replace plugin road meshes with shared terrain rendering
- route eligibility should reuse the existing
  `@bworlds/terrain-splat-support/route-render-plan` logic instead of
  re-encoding bridge, dock, and overlay decisions inside `render3d`
- this keeps current visuals unchanged while making the later renderer switch a
  small targeted change instead of another cross-package rewrite
