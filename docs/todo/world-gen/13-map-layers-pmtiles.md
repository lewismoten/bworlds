# Map Layers and PMTiles

## Feature Model

- [ ] Define canonical point, line, and polygon records.
- [ ] Keep map features independent from projection.
- [ ] Keep map feature IDs stable from world object IDs.
- [ ] Add zoom visibility ranges to map features.

## PMTiles

- [ ] Create a PMTiles export plugin.
- [ ] Generate vector features from world data on demand.
- [ ] Use coarse features at low zoom levels.
- [ ] Reveal finer features as zoom increases.
- [ ] Simplify lines and polygons by zoom level.
- [ ] Keep major rivers visible at low zoom.
- [ ] Reveal local roads and small rivers at higher zoom.
- [ ] Cache generated tiles by world revision.

## Physical Layers

- [ ] Add topographic, relief, and physical map plugins.
- [ ] Add elevation, slope, and geology map plugins.

## Climate Layers

- [ ] Add climate and temperature zone plugins.
- [ ] Add humidity, pressure, weather, and wind plugins.
- [ ] Add ocean current and river flow plugins.

## Human Layers

- [ ] Add political, road, and rail map plugins.
- [ ] Add population heat map and choropleth plugins.
- [ ] Add dot distribution, vector, and isoline plugins.

## 2D and 3D Parity

- [ ] Derive 2D terrain from the same world data as 3D.
- [ ] Derive roads and rivers from the same graphs as 3D.
- [ ] Derive settlements and borders from shared records.
- [ ] Keep 2D tile symbols representative of 3D state.
- [ ] Avoid separate hand-authored map-only world state.
