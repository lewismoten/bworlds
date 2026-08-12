# Terrain Chunk Debug Page

The dedicated terrain chunk debug page lives at `/debug/terrain-chunks/`.

It exists to bridge the current gap between the renderer-free terrain chunk
support modules and the not-yet-finished live chunk renderer. The page does not
pretend that terrain chunks are already replacing the main world floor path.
Instead, it exposes the shared planning data directly so Phase 1 work in
`docs/todo/world-gen/01-terrain-chunks.md` can be inspected in the running app.

Current responsibilities:

- build one deterministic `17x17` splat sample grid for any logical chunk
- sample one matching height field from the shared worldgen terrain-height API
- derive one chunk wireframe view from the shared terrain geometry plan
- compare east and south neighbor chunk seams using the shared seam analyzer
  plus sampled height and border-normal deltas
- show the dominant splat layer grid before a live material/shader path exists
- compare the `16x16` logical tile mix against the shared terrain-preview
  interpretation so 2D-versus-3D parity drift can be inspected explicitly
- summarize whether the current chunk is passing the seam and parity checks
  that back the current Phase 1 inspection path

Current limits:

- the page does not attach the chunk geometry to the main Three.js world scene
- seam analysis currently checks shared splat weights and sampled heights, not
  final rendered pixels, though it now also surfaces border-normal continuity
- the height source still uses the interim preview terrain-height sampler rather
  than the future fully layered authoritative height pipeline
