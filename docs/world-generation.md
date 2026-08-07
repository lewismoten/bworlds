# World Generation

## Overworld

The overworld is sampled directly from world coordinates. It is not stored as one gigantic array.

- Continental shape comes from low-frequency octave noise.
- Elevation and moisture refine the biome.
- Rivers and roads come from ridged noise fields.
- Points of interest are placed from deterministic hash thresholds.

Because generation depends only on the seed and coordinates, the world can feel effectively infinite while still being stable between sessions.

## GPS coordinates

The UI exposes a latitude and longitude derived from tile coordinates. The current bootstrap uses:

- `250` meters per tile
- Earth circumference approximation for longitude wrapping
- Latitude clamped to `-90` to `90`

This gives us a practical mental model for a planet-scale world without trying to hold an Earth-sized grid in memory.

## Interior maps

- Towns generate roads, a plaza, building entrances, and a gate back to the overworld.
- Buildings generate small floorplans for interior navigation.
- Caves and dungeons generate depth maps with stairs up and down.

Every map type uses the same tile vocabulary so 2D and 3D renderers stay aligned.
