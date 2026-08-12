# Terrain Chunk Height Sample Contract

`@bworlds/worldgen` now exposes the world-space height-sample coordinate
contract that terrain chunk builders are expected to use.

Key points:

- one terrain chunk covers `16x16` logical cells
- one terrain chunk uses a seam-safe `17x17` height-sample grid
- `getTerrainChunkHeightSampleCoordinate(chunkX, chunkY, sampleX, sampleY)`
  converts sample indices directly into world coordinates
- neighboring chunks share identical world coordinates along their touching
  sample border, so seam-safe height builders can sample one authoritative
  world-space height function instead of re-deriving edge values from local
  chunk noise

This keeps the seam contract explicit before the live chunk renderer lands:

- the east border of one chunk is the west border of its eastern neighbor
- the south border of one chunk is the north border of its southern neighbor
- out-of-range sample indices are rejected instead of silently wrapping or
  inventing local-only coordinates
