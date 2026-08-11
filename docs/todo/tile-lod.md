# Tile LOD and Consolidation Optimization

This is also partially due to performance issues which can be seen here, and addressed while working on LOD optimization: [Performance Snapshot Follow-Up](performance-snapshot-follow-up.md)

## LOD Recovery

- [x] Prefer the last valid cached LOD before using a fallback box.
- [ ] Try a lower LOD when the requested LOD exceeds its budget.
- [x] Walk down the LOD chain until a valid model is found.
- [x] Use a box only when no cached or lower LOD can render.
- [x] Keep the old model visible while a new LOD is being built.
- [x] Swap LODs only after the replacement model is ready.
- [x] Cache the last successful LOD for each visible tile.
- [x] Track why each requested LOD failed to build.
- [ ] Keep lower LODs cached after higher LODs are requested.
- [ ] Cancel stale LOD work when the player moves away.
- [x] Prefer cached LODs over new high-detail generation.
- [x] Reserve fallback boxes for hard generation failures.
- [x] Log every fallback box with its tile and failure reason.

## Stable LOD Dimensions

- [ ] Keep the same footprint across every LOD for a model.
- [ ] Keep the same base elevation across every LOD.
- [ ] Define canonical model bounds before generating LODs.
- [ ] Validate every LOD against its canonical bounds.
- [ ] Reject LODs that change width or depth too much.
- [ ] Limit height changes between adjacent LOD levels.
- [ ] Keep every LOD anchored to the same pivot point.
- [ ] Keep every LOD anchored to the same ground point.
- [ ] Scale details inside bounds, not the whole model.
- [ ] Keep collision bounds stable across visual LOD changes.
- [ ] Keep interaction points stable across LOD changes.
- [ ] Crossfade LODs when geometry changes would cause popping.
- [ ] Use dither fades when full crossfades cost too much.
- [ ] Add hysteresis around every LOD distance threshold.
- [ ] Delay upgrades until the player remains nearby.
- [ ] Downgrade LODs sooner when the scheduler is overloaded.
- [ ] Fallback box should be the dimensions of the bounding boxes if any are specified that obstruct movement.

## Footprint Definitions

- [ ] Define supported footprint shapes per tile generator.
- [ ] Support 1x2, 2x1, 2x2, 3x3, and larger footprints.
- [ ] Represent irregular footprints as local tile offsets.
- [ ] Give every footprint shape a stable shape ID.
- [ ] Allow 90-degree footprint rotation where supported.
- [ ] Allow footprint mirroring only when explicitly supported.
- [ ] Store footprint width and depth for quick rejection.
- [ ] Store each footprint's required occupied tile offsets.
- [ ] Store optional empty gaps inside irregular footprints.
- [ ] Larger, more detailed items should be limited to larger footprints

## Finding Groups

- [ ] Detect adjacent compatible tiles before model generation.
- [ ] Group only tiles that explicitly allow consolidation.
- [ ] Require grouped tiles to share compatible terrain.
- [ ] Require grouped tiles to share compatible world state.
- [ ] Avoid grouping across blocked roads or rivers.
- [ ] Avoid grouping across incompatible elevation changes.
- [ ] Prefer the largest valid footprint that fits a cluster.
- [ ] Score all valid footprint candidates before selection.
- [ ] Use deterministic tie breaking for equal group scores.
- [ ] Prevent one tile from joining multiple groups.
- [ ] Rebuild groups when nearby tile membership changes.
- [ ] Keep grouping deterministic for the same world seed.

## Group Identity

- [ ] Assign one owner tile to every consolidated group.
- [ ] Store all member tile IDs in the group record.
- [ ] Store the chosen footprint shape in the group record.
- [ ] Store footprint rotation in the group record.
- [ ] Build stable cache keys from group identity data.
- [ ] Keep group identity stable across normal LOD changes.

## Shared Resource Budgets

- [ ] Sum member tile budgets into one group model budget.
- [ ] Share triangle budgets across all member tiles.
- [ ] Share draw-call budgets across all member tiles.
- [ ] Share material budgets across all member tiles.
- [ ] Share light budgets across all member tiles.
- [ ] Share animation budgets across all member tiles.
- [ ] Reserve some budget for LOD transition overlap.
- [ ] Cap total group complexity with a hard upper limit.
- [ ] Reduce detail when the group exceeds its soft budget.
- [ ] Scale group detail using the same distance rules as tiles.

## Consolidated LODs

- [ ] Generate LODs for each supported footprint size.
- [ ] Generate cheap group LODs before expensive group LODs.
- [ ] Cache group models by seed, shape, rotation, and LOD.
- [ ] Reuse cached group models before generating new ones.
- [ ] Keep solo tile models cached after grouping.
- [ ] Use solo models while a group model is still building.
- [ ] Fall back to a lower group LOD before splitting a group.
- [ ] Fall back to member tile models if group LODs fail.
- [ ] Use fallback boxes only after all group recovery fails.

## Settlement Scaling

- [ ] Let settlement detail increase with footprint size.
- [ ] Use 1x1 layouts for small villages or outposts.
- [ ] Use 2x2 layouts for larger towns.
- [ ] Use 3x3 layouts for city-scale settlements.
- [ ] Allow larger footprints for capitals and castles.
- [ ] Let irregular groups fill coastlines and terrain gaps.
- [ ] Preserve roads through larger settlement footprints.
- [ ] Preserve entrances when creating larger settlements.
- [ ] Preserve important POIs inside consolidated groups.
- [ ] Preserve quest anchors inside consolidated groups.

## Irregular Shapes

- [ ] Support L, T, S, Z, and other irregular footprints.
- [ ] Allow custom footprint masks from tile plugins.
- [ ] Rotate irregular masks when space permits.
- [ ] Reject masks that overlap incompatible tiles.
- [ ] Reject masks that leave required access blocked.
- [ ] Prefer shapes that reduce isolated leftover tiles.
- [ ] Prefer shapes that match roads and terrain edges.
- [ ] Keep irregular group bounds accurate for culling.

## Coordinates and Interaction

- [ ] Map member tile positions into group-local positions.
- [ ] Map group-local positions back to member tiles.
- [ ] Route clicks on group models to the correct tile.
- [ ] Route interactions to the correct member tile state.
- [ ] Keep tile IDs available after visual consolidation.
- [ ] Keep gameplay state independent from visual grouping.
- [ ] Do not change state when groups merge or split.

## Collision and Navigation

- [ ] Keep collision generation separate from visual grouping.
- [ ] Keep navigation valid while group models rebuild.
- [ ] Update navigation only when collision data changes.
- [ ] Preserve walkable entrances in grouped settlements.
- [ ] Preserve roads through consolidated footprints.
- [ ] Prevent group models from blocking valid tile exits.
- [ ] Keep interaction zones stable across LOD changes.

## Culling

- [ ] Use group-level frustum culling when safe.
- [ ] Allow member-level culling inside very large groups.
- [ ] Keep group bounds correct for irregular shapes.
- [ ] Keep LOD bounds separate from visible detail bounds.
- [ ] Avoid rebuilding groups that are fully out of view.

## Scheduler Integration

- [ ] Give cached model swaps very high scheduler priority.
- [ ] Give lower LOD recovery priority over LOD upgrades.
- [ ] Budget group generation across multiple frames.
- [ ] Yield during expensive consolidated model generation.
- [ ] Stop group generation when the request becomes stale.
- [ ] Avoid generating two LODs for one group at once.
- [ ] Deduplicate identical pending LOD requests.
- [ ] Track pending work by tile or group cache key.
- [ ] Lower requested LOD when frame time exceeds budget.

## Cache Management

- [ ] Cache recent solo models and consolidated models.
- [ ] Keep the current and previous LOD cached nearby.
- [ ] Pin visible fallback models against cache eviction.
- [ ] Evict distant high-detail LODs before low-detail LODs.
- [ ] Invalidate groups when member state truly changes.
- [ ] Avoid invalidating groups for visual-only changes.
- [ ] Track cache hits and misses by LOD level.
- [ ] Track cache memory used by solo and group models.

## Visual Transition Quality

- [ ] Never replace a valid model with a box during upgrades.
- [ ] Keep silhouettes similar between neighboring LODs.
- [ ] Preserve major landmarks at every LOD.
- [ ] Introduce small details only at higher LODs.
- [ ] Avoid changing whole-building scale between LODs.
- [ ] Fade temporary construction gaps when rebuilding.
- [ ] Avoid rapid merge and split changes near the player.

## Debug Views

- [ ] Show current LOD level above each debug tile.
- [x] Show requested and rendered LOD separately.
- [x] Show cached LOD levels for the selected tile.
- [x] Show the last LOD failure reason.
- [x] Show fallback reason when a box is rendered.
- [ ] Show consolidated footprint outlines.
- [ ] Show the owner tile for each consolidated group.
- [ ] Show member tiles for each consolidated group.
- [ ] Show group shape IDs and rotations.
- [ ] Show tile and group resource budgets.
- [ ] Show actual triangles and draw calls per group.
- [ ] Add a toggle to disable consolidation.
- [x] Add a toggle to freeze LOD selection.
- [ ] Add a toggle to show canonical bounds.
- [ ] Add a toggle to show cached model availability.

## Metrics

- [ ] Measure generation time for every LOD.
- [ ] Measure generation time for consolidated groups.
- [ ] Measure triangles produced by each LOD.
- [ ] Measure draw calls produced by each LOD.
- [ ] Measure materials produced by each LOD.
- [ ] Measure Object3D counts produced by each LOD.
- [x] Count successful lower LOD recoveries.
- [x] Count fallback box appearances.
- [ ] Count group creation and group split events.
- [ ] Count group cache hits and misses.

## Tests

- [x] Test failed high LOD uses the cached lower LOD.
- [x] Test failed high LOD tries lower LODs before a box.
- [x] Test a box appears only after all LODs fail.
- [ ] Test LOD swaps preserve canonical model bounds.
- [ ] Test LOD swaps preserve pivot and ground alignment.
- [ ] Test LOD hysteresis prevents rapid switching.
- [ ] Test compatible 2x2 tiles form one stable group.
- [ ] Test irregular footprint rotation and placement.
- [ ] Test incompatible tiles never consolidate.
- [ ] Test one tile cannot belong to two groups.
- [ ] Test group budgets equal combined member budgets.
- [ ] Test failed groups fall back to member models.
- [ ] Test group caches survive normal LOD changes.
- [ ] Test grouping stays stable for the same seed.
- [ ] Test save state is unchanged by visual grouping.
- [ ] Test navigation remains valid after group changes.
- [ ] Test roads remain connected through grouped tiles.
- [ ] Test POIs survive consolidation and splitting.

## Performance Tests

- [ ] Benchmark solo tiles against equivalent grouped tiles.
- [ ] Benchmark 2x2, 3x3, and 4x4 group generation.
- [ ] Benchmark irregular footprint generation.
- [ ] Benchmark worst-case consolidation near the player.
- [ ] Benchmark repeated LOD upgrades and downgrades.
- [ ] Benchmark cache recovery after high LOD failure.
- [ ] Fail tests when LOD fallback behavior regresses.
- [ ] Fail tests when grouped models exceed hard budgets.
