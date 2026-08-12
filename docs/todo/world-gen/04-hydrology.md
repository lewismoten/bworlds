# Hydrology Generation

## Large Lakes

- [ ] Create a large lake placement plugin.
- [ ] Find broad drainage basins.
- [ ] Avoid placing large lakes on mountain peaks.
- [ ] Favor basins with plausible inflow and outflow.
- [ ] Make lake depth increase toward basin centers.
- [ ] Reserve deeper channels for larger boats.
- [ ] Reserve shallow shoreline areas for swimming.
- [ ] Store lake IDs, names, level, and depth metadata.

## Large Rivers

- [ ] Create a large river routing plugin.
- [ ] Start rivers in valid high drainage areas.
- [ ] Route rivers toward lower elevation and major water.
- [ ] Store flow direction on every river segment.
- [ ] Keep control points five to twenty tiles apart.
- [ ] Fit smooth Bezier curves between control points.
- [ ] Avoid one route point for every adjacent tile.
- [ ] Carve terrain from a river distance field.
- [ ] Make wide rivers carve more than narrow rivers.
- [ ] Keep river width and curves continuous across chunks.
- [ ] End rivers at oceans, lakes, or valid sinks.

## Tributaries

- [ ] Create a smaller river plugin.
- [ ] Use finer resolution than large rivers.
- [ ] Fork tributaries from valid drainage areas.
- [ ] Join tributaries into larger downstream rivers.
- [ ] Allow tributaries to be much more curved.
- [ ] Use sparse control points for tributaries too.
- [ ] Carve less terrain than large rivers.

## Water and Navigation

- [ ] Store river centerlines apart from render geometry.
- [ ] Store river width, depth, and velocity metadata.
- [ ] Create water surfaces from river corridor data.
- [ ] Mark navigable sections of large rivers.
- [ ] Reserve dock candidates near settlements.

## Debugging

- [ ] Show river control points in 2D and 3D.
- [ ] Show Bezier handles in 3D debug mode.
- [ ] Show river flow arrows.
- [ ] Show width and depth bands.
- [ ] Warn when control points are under five tiles apart.
- [ ] Warn when control points exceed twenty tiles apart.
