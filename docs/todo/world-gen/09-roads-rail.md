# Roads and Rail Generation

## Route Graph

- [ ] Create separate road and rail network plugins.
- [ ] Build route graphs from settlements and crossings.
- [ ] Require every route endpoint to have a purpose.
- [ ] Connect roads to towns, docks, bridges, and tunnels.
- [ ] Connect rails to rail bridges and rail tunnels.
- [ ] Allow rail to cross roads.
- [ ] Require bridges at river crossings.

## Sparse Curves

- [ ] Store route control points in world space.
- [ ] Keep control points five to twenty tiles apart.
- [ ] Avoid one control point per traversed tile.
- [ ] Fit smooth Bezier curves between control points.
- [ ] Use terrain to influence Bezier control handles.
- [ ] Preserve control points across chunk boundaries.
- [ ] Add simplification for old dense route data.

## Road Grades

- [ ] Target average road grades from four to six percent.
- [ ] Allow occasional road grades to fifteen percent.
- [ ] Prefer contour-following roads in hilly terrain.
- [ ] Use switchbacks where direct grades are too steep.
- [ ] Grade terrain modestly where it improves the route.

## Rail Grades

- [ ] Target normal rail grades from one to two percent.
- [ ] Allow rail grades up to three or four percent.
- [ ] Favor long gradual approaches over steep climbs.
- [ ] Use bridges between hills when grades require them.
- [ ] Use tunnels when mountain grades remain excessive.

## Intersections

- [ ] Allow four-way road intersections.
- [ ] Allow road forks and merges.
- [ ] Allow rail to cross roads at valid crossings.
- [ ] Add overpasses where crossing grades justify them.

## Surface and Rendering

- [ ] Derive road quality from nearby settlement population.
- [ ] Favor rougher surfaces in remote areas.
- [ ] Render broad normal roads as terrain splats.
- [ ] Render road shoulders as soft splat falloff.
- [ ] Render rail beds as splats or narrow geometry.
- [ ] Keep rails, bridges, and tunnels as geometry.

## Mountain Gaps

- [ ] Detect road crossings over mountain saddles.
- [ ] Mark suitable crossings as named gaps.
- [ ] Allow ferry names to influence gap names.
- [ ] Allow gap names to influence nearby town names.

## Debugging

- [ ] Show route graph nodes and edges.
- [ ] Show sparse control points.
- [ ] Show Bezier curves in 2D and 3D.
- [ ] Show grade percent along routes.
- [ ] Warn when control points are too close.
- [ ] Warn when road or rail grades exceed limits.
- [ ] Warn when a route ends without a purpose.
