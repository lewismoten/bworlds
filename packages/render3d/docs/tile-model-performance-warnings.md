# Tile Model Performance Warnings

`packages/render3d/src/tile-model-performance-warnings.ts` contains the
lightweight heuristics used to turn per-model resource stats into plugin-facing
warnings in the debug snapshot and runtime issue reporting.

## Low-detail geometry-group warnings

Low-detail models now need at least `4` geometry groups before the renderer
warns about low triangle density per group.

That floor is intentional. Small low-detail landmark or signage meshes often
use three material groups for legitimate structure such as:

- a base material
- an accent or trim material
- a highlight, decal, or emissive material

Those models can stay cheap even when their absolute triangle count is small,
so warning on `3` groups produced recurring false positives like
`maxGeometryGroupCount 3 for triangleCount 84`.

The warning still triggers once a low-detail model reaches `4+` groups and the
triangle density stays low, which keeps the diagnostic focused on models that
are more likely to benefit from collapsing material groups or merging tiny mesh
parts.
