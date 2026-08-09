# View Mode

Every map tile is generated on demand from the world seed, zoom level, and tile coordinates.

The core idea becomes:

```text
world seed + zoom + tile x + tile y
              ↓
     procedural generators
              ↓
       map tile contents
```

Nothing has to be permanently stored.

## View Mode Architecture

* [ ] Define a shared `ViewMode` interface.
* [ ] Give each view mode a stable unique ID.
* [ ] Give each view mode a display name.
* [ ] Give each view mode a short icon.
* [ ] Let view modes declare whether they use Three.js.
* [ ] Let view modes declare supported camera features.
* [ ] Let view modes declare supported debug features.
* [ ] Allow view modes to register through plugins.
* [ ] Keep world state independent from the active view mode.
* [ ] Preserve player position when changing view modes.
* [ ] Preserve player facing when changing view modes.
* [ ] Avoid regenerating persistent game state on view changes.
* [ ] Cache only temporary render data where useful.

## View Mode Buttons

* [ ] Add small square buttons for each view mode.
* [ ] Add a Text mode button.
* [ ] Add a 2D mode button.
* [ ] Add a Map mode button.
* [ ] Add an Orthographic mode button.
* [ ] Add a Blobber mode button.
* [ ] Add a 3D mode button.
* [ ] Highlight the active view button.
* [ ] Add tooltips to view buttons.
* [ ] Add keyboard shortcuts for view modes.
* [ ] Allow cycling forward through view modes.
* [ ] Allow cycling backward through view modes.

## Shared Three.js Features

* [ ] Mark which views use the Three.js renderer.
* [ ] Share one Three.js scene where practical.
* [ ] Share model caches between Three.js view modes.
* [ ] Share materials between Three.js view modes.
* [ ] Avoid rebuilding models for camera-only changes.
* [ ] Keep LOD rules compatible with all 3D-backed views.

## Wireframe and Texture Controls

* [ ] Add a wireframe toggle for all Three.js views.
* [ ] Add a texture toggle for all Three.js views.
* [ ] Show these controls only in Three.js-backed modes.
* [ ] Preserve wireframe state when switching views.
* [ ] Preserve texture state when switching views.
* [ ] Avoid cloning materials just for wireframe mode.
* [ ] Use plain material colors when textures are disabled.

# Orthographic View

* [ ] Add an orthographic Three.js camera.
* [ ] Switch between perspective and orthographic cameras.
* [ ] Preserve world position during camera switches.
* [ ] Preserve facing direction during camera switches.
* [ ] Add mouse-wheel orthographic zoom.
* [ ] Add orthographic camera rotation.
* [ ] Add orthographic camera panning.
* [ ] Tune LOD thresholds for orthographic viewing.
* [ ] Cull objects using orthographic camera bounds.
* [ ] Keep POI models readable from above.

# Blobber View

* [ ] Add a grid-based first-person view.
* [ ] Render Blobber mode using Three.js.
* [ ] Lock movement to tile steps.
* [ ] Lock turning to fixed increments.
* [ ] Support 90-degree turns by default.
* [ ] Move one tile forward per input.
* [ ] Move one tile backward per input.
* [ ] Add optional side-step movement.
* [ ] Block movement through closed tile edges.
* [ ] Check doors before entering tiles.
* [ ] Trigger tile events after each step.
* [ ] Trigger encounters after each step.
* [ ] Animate movement between tile centers.
* [ ] Animate turns between facing directions.
* [ ] Cull geometry behind the player aggressively.
* [ ] Use dungeon wall-edge data directly in Blobber view.
* [ ] Keep party state valid when leaving Blobber mode.

# Zoomable 2D Map View

* [ ] Create a new zoomable procedural 2D map view.
* [ ] Keep the existing close-range 2D mode.
* [ ] Support mouse-wheel zoom.
* [ ] Support touch pinch zoom.
* [ ] Support map panning.
* [ ] Let the map follow the player.
* [ ] Let the player unlock map following.
* [ ] Show player position.
* [ ] Show player facing.
* [ ] Support heading-up map rotation.
* [ ] Support north-up map rotation.
* [ ] Preserve map zoom between view changes.

# Map Tilt

* [ ] Keep distant world views fully overhead.
* [ ] Increase tilt while zooming inward.
* [ ] Cap map tilt at 60 degrees.
* [ ] Interpolate tilt smoothly with zoom.
* [ ] Keep the player visible while tilting.
* [ ] Keep POI sprites facing the camera.
* [ ] Keep map labels readable while tilted.
* [ ] Prevent gaps between tilted tiles.

# Procedural Zoom Pyramid

* [ ] Define procedural map zoom levels.
* [ ] Define tile coordinates at every zoom level.
* [ ] Derive each tile from zoom/x/y and world seed.
* [ ] Generate tiles only when requested.
* [ ] Generate only features visible at the current zoom.
* [ ] Avoid generating local terrain for distant map views.
* [ ] Generate visible tiles before preload tiles.
* [ ] Add a small preload ring around the viewport.
* [ ] Cancel generation for tiles no longer needed.
* [ ] Cache generated tiles temporarily in memory.
* [ ] Bound the temporary map tile cache.
* [ ] Evict old cached tiles by LRU.
* [ ] Regenerate evicted tiles deterministically when needed.
* [ ] Never require permanent tile storage.

# Map Tile Request API

* [ ] Create a `MapTileRequest` structure.
* [ ] Include world seed in tile requests.
* [ ] Include zoom level.
* [ ] Include tile x coordinate.
* [ ] Include tile y coordinate.
* [ ] Include visible feature classes.
* [ ] Include quality/performance budget.
* [ ] Include cancellation support.
* [ ] Include generator yield support.
* [ ] Return logical map features, not saved tile files.

# Procedural Map Plugin Interface

* [ ] Let world plugins contribute map features.
* [ ] Let plugins declare supported zoom ranges.
* [ ] Let plugins declare feature importance.
* [ ] Let plugins declare minimum visible zoom.
* [ ] Let plugins generate features from zoom/x/y.
* [ ] Let plugins generate simplified distant features.
* [ ] Let plugins refine features at closer zooms.
* [ ] Let plugins yield during expensive generation.
* [ ] Let plugins cancel generation when tiles leave view.
* [ ] Keep plugin generation deterministic.

# Feature Visibility by Zoom

* [ ] Show continents at the furthest zoom.
* [ ] Show major oceans at the furthest zoom.
* [ ] Show major mountain ranges at distant zoom.
* [ ] Show major rivers at distant zoom.
* [ ] Show major cities at distant zoom.
* [ ] Show regions at medium zoom.
* [ ] Show secondary rivers at medium zoom.
* [ ] Show primary roads at medium zoom.
* [ ] Show towns at medium zoom.
* [ ] Show villages at closer zoom.
* [ ] Show secondary roads at closer zoom.
* [ ] Show trails at local zoom.
* [ ] Show small POIs only at local zoom.
* [ ] Show individual 3x3m tiles only at maximum zoom.

# Continent Generator

* [ ] Create a continent-level procedural generator.
* [ ] Generate continents from world seed.
* [ ] Generate continents from global coordinates.
* [ ] Support huge continuous land masses.
* [ ] Represent distant continents as coarse polygons.
* [ ] Support large islands.
* [ ] Support inland seas.
* [ ] Support major bays.
* [ ] Support continental shelves if useful.
* [ ] Give each continent a stable procedural ID.
* [ ] Keep continent generation independent of local tiles.

# Fast Land/Ocean Query

* [ ] Add a fast `isLand(x, y)` world query.
* [ ] Add a fast `getContinent(x, y)` query.
* [ ] Avoid detailed terrain generation for these queries.
* [ ] Use broad continent data first.
* [ ] Refine only near coastline boundaries.
* [ ] Cache local land/ocean results temporarily.
* [ ] Keep land/ocean queries deterministic.

# Coastline Refinement

* [ ] Refine continent edges at closer zoom levels.
* [ ] Add bays during coastline refinement.
* [ ] Add peninsulas during coastline refinement.
* [ ] Add islands during coastline refinement.
* [ ] Add estuaries during coastline refinement.
* [ ] Add river deltas during coastline refinement.
* [ ] Add beaches only at closer zoom levels.
* [ ] Add cliffs only at closer zoom levels.
* [ ] Preserve the parent continent silhouette.
* [ ] Keep coastlines continuous across map tiles.

# Hierarchical World Refinement

* [ ] Generate broad geography before fine geography.
* [ ] Derive regions from continent-scale geography.
* [ ] Derive local terrain from regional geography.
* [ ] Preserve parent features while adding detail.
* [ ] Keep mountains inside parent mountain systems.
* [ ] Keep rivers attached to parent river systems.
* [ ] Keep settlements in their parent regions.
* [ ] Keep roads connected to parent transport networks.
* [ ] Avoid changing geography as zoom increases.

# Major Rivers

* [ ] Generate major rivers at coarse scales.
* [ ] Give major rivers stable procedural IDs.
* [ ] Keep river paths consistent across zoom levels.
* [ ] Simplify river paths at distant zoom.
* [ ] Refine river curves at closer zoom.
* [ ] Add tributaries only at closer zoom.
* [ ] Add streams only at local zoom.
* [ ] Keep rivers continuous across procedural tiles.

# Mountains

* [ ] Generate mountain systems at continent scale.
* [ ] Generate mountain ranges at regional scale.
* [ ] Generate individual peaks at closer zoom.
* [ ] Generate mountain passes at local zoom.
* [ ] Show elevation summaries at distant zoom.
* [ ] Avoid generating individual mountain tiles when distant.

# Biomes and Forests

* [ ] Generate broad biome zones at distant zoom.
* [ ] Refine biome boundaries at closer zoom.
* [ ] Show major forests at regional zoom.
* [ ] Refine forest boundaries at closer zoom.
* [ ] Hide individual trees until local rendering.
* [ ] Preserve biome continuity across tile boundaries.

# Roads

* [ ] Generate major routes at regional scales.
* [ ] Show only major roads when zoomed far out.
* [ ] Add primary roads at medium zoom.
* [ ] Add secondary roads at closer zoom.
* [ ] Add trails only at local zoom.
* [ ] Give roads stable procedural IDs.
* [ ] Keep roads connected across zoom levels.
* [ ] Keep roads connected across tile boundaries.

# Town and POI Visibility

* [ ] Give each POI a map importance score.
* [ ] Let POI population influence map importance.
* [ ] Let POI level influence map importance.
* [ ] Let POI size influence map importance.
* [ ] Let POI plugins define minimum visible zoom.
* [ ] Show major cities at distant zoom.
* [ ] Show ordinary towns at medium zoom.
* [ ] Show villages at closer zoom.
* [ ] Show hamlets at local zoom.
* [ ] Show minor POIs only when zoomed in.
* [ ] Let quest POIs override normal visibility rules.
* [ ] Keep undiscovered POIs hidden when required.

# Procedural POI Markers

* [ ] Let POI plugins provide map icons.
* [ ] Let POI plugins provide map sprites.
* [ ] Select marker detail by zoom.
* [ ] Keep markers camera-facing while map tilts.
* [ ] Fade markers in when they become relevant.
* [ ] Fade markers out when they become irrelevant.
* [ ] Cluster nearby markers at distant zoom.
* [ ] Expand clusters while zooming inward.

# Map Labels

* [ ] Generate continent labels procedurally.
* [ ] Generate ocean labels procedurally.
* [ ] Generate region labels procedurally.
* [ ] Generate city labels procedurally.
* [ ] Generate river labels procedurally.
* [ ] Generate mountain range labels procedurally.
* [ ] Select label visibility by zoom.
* [ ] Scale labels by feature importance.
* [ ] Prevent excessive label overlap.
* [ ] Keep labels upright while map rotates.

# Geographic Hierarchy

* [ ] Generate stable continent IDs.
* [ ] Generate stable region IDs.
* [ ] Generate stable state/province IDs if used.
* [ ] Generate stable district IDs if used.
* [ ] Generate stable settlement IDs.
* [ ] Query the continent containing a coordinate.
* [ ] Query the region containing a coordinate.
* [ ] Query the nearest major settlement.
* [ ] Derive hierarchy without saving generated map data.

# Planet Coordinate System

* [ ] Define planet radius.
* [ ] Define planet circumference.
* [ ] Define the equator.
* [ ] Define a prime meridian.
* [ ] Convert world x/y to latitude/longitude.
* [ ] Convert latitude/longitude back to world x/y.
* [ ] Normalize longitude wrapping.
* [ ] Handle coordinates at the poles.
* [ ] Keep conversions deterministic.
* [ ] Preserve local 3x3m tile interpretation.

# Base Tile Scale

* [ ] Define an exact base tile size near 3x3 meters.
* [ ] Store base tile size in world constants.
* [ ] Derive map scales from base tile size.
* [ ] Expose meters per tile at each zoom.
* [ ] Expose meters per map pixel where useful.

# Curved Planet Tile Layout

* [ ] Reduce east-west tile width toward the poles.
* [ ] Reduce horizontal tile count toward the poles.
* [ ] Keep maximum tile density at the equator.
* [ ] Keep north-south distance approximately consistent.
* [ ] Avoid an infinite flat-world x axis.
* [ ] Wrap east/west movement around the planet.
* [ ] Handle transitions between latitude bands.
* [ ] Keep physical tile size near 3m where practical.

# Latitude Bands

* [ ] Divide world addressing into latitude bands.
* [ ] Assign horizontal resolution per latitude band.
* [ ] Reduce horizontal resolution toward each pole.
* [ ] Define tile neighbors across band boundaries.
* [ ] Support one-to-many neighbors between bands.
* [ ] Support many-to-one neighbors between bands.
* [ ] Keep roads continuous across latitude bands.
* [ ] Keep rivers continuous across latitude bands.

# Polar Handling

* [ ] Add special addressing rules near the north pole.
* [ ] Add special addressing rules near the south pole.
* [ ] Eliminate redundant horizontal pole tiles.
* [ ] Prevent coordinate singularities at exact poles.
* [ ] Keep polar traversal possible.
* [ ] Keep polar map rendering understandable.
* [ ] Support polar biome generation.
* [ ] Support polar weather generation.

# Planet-Aware Neighbor Queries

* [ ] Create a planet-aware tile-neighbor API.
* [ ] Resolve east/west neighbors across longitude wrap.
* [ ] Resolve north/south neighbors across latitude bands.
* [ ] Resolve diagonal neighbors.
* [ ] Avoid assuming all tiles share identical width.
* [ ] Cache expensive neighbor mappings temporarily.

# Planet-Aware Distances

* [ ] Use local flat distance for nearby gameplay.
* [ ] Use spherical distance for long map distances.
* [ ] Avoid spherical math in local movement loops.
* [ ] Add geographic bearing calculations.
* [ ] Add great-circle distance for world map queries.

# Procedural World Map

* [ ] Render a world map directly from generators.
* [ ] Generate ocean background first.
* [ ] Query continent generators for visible land.
* [ ] Query major river generators.
* [ ] Query mountain generators.
* [ ] Query major settlement generators.
* [ ] Query map label generators.
* [ ] Avoid generating maximum-detail terrain.
* [ ] Regenerate world maps from seed when needed.

# Map Tile Composition

* [ ] Compose each map tile from procedural feature layers.
* [ ] Query only plugins relevant to the current zoom.
* [ ] Give each feature a display priority.
* [ ] Give each feature a minimum zoom.
* [ ] Give each feature an optional maximum zoom.
* [ ] Resolve overlapping features by priority.
* [ ] Keep composition deterministic.
* [ ] Skip features that cannot be visible.

# Procedural Zoom Transitions

* [ ] Request child tiles before zooming inward.
* [ ] Request parent tiles before zooming outward.
* [ ] Crossfade generated parent and child tiles.
* [ ] Keep coastline positions stable during zoom.
* [ ] Keep river positions stable during zoom.
* [ ] Keep road positions stable during zoom.
* [ ] Keep POI positions stable during zoom.
* [ ] Cancel stale tile generation during fast zooming.

# Runtime Map Caching

* [ ] Cache recently generated map tiles in memory.
* [ ] Key cache by seed/zoom/x/y.
* [ ] Set a maximum cached tile count.
* [ ] Set a maximum cached tile memory size.
* [ ] Evict least-recently-used tiles.
* [ ] Drop renderer assets before logical tile data if useful.
* [ ] Regenerate evicted tiles instead of persisting them.
* [ ] Clear cache when world seed changes.

# Procedural Feature Caching

* [ ] Cache continent queries separately from map tiles.
* [ ] Cache major river paths temporarily.
* [ ] Cache major mountain systems temporarily.
* [ ] Cache nearby region definitions temporarily.
* [ ] Avoid caching every local feature forever.
* [ ] Bound every procedural feature cache.
* [ ] Use deterministic regeneration after eviction.

# Map Generation Scheduling

* [ ] Run map generation through the central scheduler.
* [ ] Let map generators use JavaScript generators.
* [ ] Yield long loops before frame budget expires.
* [ ] Prioritize tiles beneath the viewport center.
* [ ] Prioritize current player surroundings.
* [ ] Generate parent/coarse tiles before fine tiles.
* [ ] Cancel queued work after zoom changes.
* [ ] Limit map generation CPU time per frame.

# Web Worker Support

* [ ] Allow map feature generation in Web Workers.
* [ ] Send seed/zoom/x/y to workers.
* [ ] Return compact feature data from workers.
* [ ] Avoid sending Three.js objects between workers.
* [ ] Cancel obsolete worker jobs.
* [ ] Reuse worker pools.
* [ ] Bound pending worker requests.

# Procedural Map Performance

* [ ] Avoid generating per-tree data at map scales.
* [ ] Avoid generating per-building data at world scales.
* [ ] Avoid generating minor roads when zoomed out.
* [ ] Avoid generating hidden POIs.
* [ ] Avoid generating detailed coastlines when distant.
* [ ] Use coarse geometry at coarse zoom levels.
* [ ] Limit feature count per generated map tile.
* [ ] Limit labels per generated map tile.
* [ ] Track map generation time by plugin.

# Determinism

* [ ] Make all map generation depend on stable numeric seeds.
* [ ] Keep results independent from request order.
* [ ] Keep results independent from cache state.
* [ ] Keep results independent from view mode.
* [ ] Add golden tests for selected map coordinates.
* [ ] Test the same tile before and after cache eviction.

# Map Discovery

* [ ] Track discovery separately from generated geography.
* [ ] Generate undiscovered geography normally.
* [ ] Hide undiscovered information at render time.
* [ ] Reveal local areas through player travel.
* [ ] Reveal distant areas from maps or landmarks.
* [ ] Let towers reveal nearby terrain.
* [ ] Let lighthouses reveal nearby coastline.
* [ ] Keep hidden POIs hidden until discovered.

# Fog of War

* [ ] Keep fog-of-war state separate from world generation.
* [ ] Track explored geographic areas.
* [ ] Track currently visible geographic areas.
* [ ] Preserve explored geography.
* [ ] Hide undiscovered POI markers.
* [ ] Render unexplored areas cheaply.
* [ ] Aggregate discovery state at distant zoom levels.

# Map Interactions

* [ ] Allow selecting generated map locations.
* [ ] Allow selecting generated POIs.
* [ ] Show selected POI details.
* [ ] Allow placing waypoints.
* [ ] Allow clearing waypoints.
* [ ] Show waypoint direction in other views.
* [ ] Show distance to selected locations.
* [ ] Show latitude/longitude for selected locations.

# Map Controls

* [ ] Add a return-to-player button.
* [ ] Add a reset-rotation button.
* [ ] Add a reset-tilt button.
* [ ] Add zoom-in and zoom-out buttons.
* [ ] Keep wheel zoom centered near the cursor.
* [ ] Add keyboard map navigation.
* [ ] Add touch map navigation.

# Debug Map Panel

* [ ] Show active map zoom.
* [ ] Show map tile x/y.
* [ ] Show world coordinates under cursor.
* [ ] Show latitude/longitude under cursor.
* [ ] Show meters represented per tile.
* [ ] Show active generated tile count.
* [ ] Show queued tile generation jobs.
* [ ] Show map cache hits and misses.
* [ ] Show map generation CPU time.
* [ ] Show feature counts by plugin.

# Debug Map Overlays

* [ ] Toggle procedural tile boundaries.
* [ ] Toggle continent boundaries.
* [ ] Toggle coastline refinement levels.
* [ ] Toggle region boundaries.
* [ ] Toggle major river paths.
* [ ] Toggle road networks.
* [ ] Toggle POI visibility thresholds.
* [ ] Toggle latitude bands.
* [ ] Toggle longitude wrapping.
* [ ] Show current feature zoom thresholds.

# Generator Debug Page

* [ ] Create a procedural map generator debug page.
* [ ] Enter a world seed.
* [ ] Enter map zoom.
* [ ] Enter map tile x/y.
* [ ] Generate only the requested map tile.
* [ ] Preview its generated parent tile.
* [ ] Preview its generated child tiles.
* [ ] Show which plugins contributed features.
* [ ] Show which features were omitted by zoom.
* [ ] Show generation time.
* [ ] Show cache usage.
* [ ] Regenerate after clearing caches.

# Automated Procedural Map Tests

* [ ] Verify identical requests generate identical results.
* [ ] Verify results survive cache eviction/regeneration.
* [ ] Verify child geography refines parent geography.
* [ ] Verify coastlines align across neighboring tiles.
* [ ] Verify rivers align across neighboring tiles.
* [ ] Verify roads align across neighboring tiles.
* [ ] Verify POI visibility follows zoom rules.
* [ ] Verify world-seed changes alter generated geography.

# Coordinate Tests

* [ ] Test equator coordinate conversion.
* [ ] Test north-pole conversion.
* [ ] Test south-pole conversion.
* [ ] Test longitude wrapping east.
* [ ] Test longitude wrapping west.
* [ ] Test latitude-band neighbor changes.
* [ ] Test x/y to latitude/longitude round trips.
* [ ] Test latitude/longitude to x/y round trips.

# View Switching Tests

* [ ] Test Text to 2D switching.
* [ ] Test 2D to Map switching.
* [ ] Test Map to Orthographic switching.
* [ ] Test Orthographic to Blobber switching.
* [ ] Test Blobber to 3D switching.
* [ ] Test 3D back to Text switching.
* [ ] Verify player position survives switches.
* [ ] Verify player facing survives switches.
* [ ] Verify generator caches remain valid.
* [ ] Verify Three.js resources do not leak.

The key distinction is that the zoom pyramid is only an **addressing and
level-of-detail system**. It does not own geography.

Each request is effectively:

```text
generateMapTile({
  seed,
  zoom,
  x,
  y
})
```

and that request fans out to the existing procedural plugins:

```text
                  Map Tile Request
                         │
          seed + zoom + x + y
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   Continent         Terrain          River
   generator         generator        generator
        │                │                │
        └────────────────┼────────────────┘
                         ↓
                      Roads
                         ↓
                      POIs
                         ↓
                 Render map tile
```

So at world zoom, the continent generator might answer almost everything. At a
regional zoom, rivers, mountains, regions, and major settlements participate.
At maximum zoom, existing tile/POI generators can supply the actual
3x3-meter world detail.

That keeps the map as another **view into the same deterministic world**, rather
than creating a second stored map database alongside the game world.
