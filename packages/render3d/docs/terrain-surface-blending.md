## Terrain Surface Blending

`render3d` now includes one interim terrain-surface blending path for ground
tiles that still render through the existing floor mesh system.

Current behavior:

- shared floor batches and ordinary floor boxes can carry a compact cardinal
  `surfaceBlendSignature`
- that signature groups nearby-compatible tiles together so instancing still
  reuses one material when the visible neighborhood is the same
- when a signature is present, the renderer uses a generated painted material
  instead of the atlas-backed tile material
- the generated material paints the center terrain color first, then blends
  cardinal neighbor colors inward along the tile edges

Why this exists:

- it makes road shoulders and field-like/plains transitions visible in the live
  app before the full terrain-splat chunk shader is wired into `apps/web`
- it keeps material reuse bounded by a small neighborhood signature instead of
  creating one unique material per tile
- it preserves the existing shared-floor batching path, so this is a renderer
  step toward visible splatting rather than a separate plugin mesh system

Current limits:

- this is still a painted-material approximation, not the final packed
  texture-array terrain-splat shader
- only ground kinds that classify into the renderer's blend categories use this
  path
- river/ocean boundaries and other non-ground surfaces still use their existing
  atlas or water materials
