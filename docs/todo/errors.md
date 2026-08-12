# High Priority

Always run tests to make sure all tests pass

- [ ] complete [World Gen Master Roadmap](./world-gen/00-master-roadmap.md)

# Next Highest

- [ ] Complete [Performance Snapshot Follow-Up](performance-snapshot-follow-up.md)
      Progress: low-detail `tile-dungeon` recovery now instances its repeated
      corner towers and tower caps and drops the separate low-detail beacon
      `PointLight`, so `full -> low` visible LOD recovery has fewer meshes and
      no low-detail light budget pressure on that landmark path.
      Progress: runtime issue reporting now suppresses bare wrapped
      `visible lod recovery failed after full -> low` summaries when they do
      not carry any specific nested failure reason, which prevents stale
      unactionable LOD recovery reports from keeping
      `runtime-performance-issue-latest.test.ts` red after the underlying
      pressure issue has already been handled elsewhere.
- [ ] Complete audio-priority2.md

- [ ] Eliminate the remaining 500 ms and 150 ms frame stalls.
  - [ ] Convert long plugin loops to generators that yield work to the scheduler.
  - [ ] Resume unfinished generators on later frames.
  - [ ] Let generators yield progress without creating final Three.js objects yet.
  - [ ] Keep simple/cheap plugin methods synchronous where generators add no value.
        Progress: `tile-rail` now exposes `create3DModelProgressive(...)` so the
        renderer can yield after laying the two rails and before placing the four
        sleepers, while the synchronous wrapper still exhausts the same generator
        for parity, and `tile-forest` now exposes `create3DModelProgressive(...)`
        for its full-detail path so the renderer can resume after tree trunks and
        canopies, hollows and bark markings, ground clutter, and close firefly
        effects without forcing the whole forest tile to finish in one frame, and
        its remaining close-detail pass now yields once for
        `understory-and-wildlife` and again for `landmarks-and-floor` so meadow
        flowers, birds, spiders, trail props, and floor clutter no longer share
        one large scheduler step, and
        `tile-mountain` now exposes `create3DModelProgressive(...)` so the
        renderer can resume between the base cone, upper peak, crown, and snowcap
        layers instead of building the full stack in one frame, and `tile-water`
        now exposes `create3DModelProgressive(...)` for river tiles so the
        renderer can resume after the center pool, water ribbons, and highlight
        ribbons instead of building the whole river mesh set in one frame, and
        `tile-route` now exposes `create3DModelProgressive(...)` for dock tiles
        so the renderer can resume after the deck-and-pile pass, boat pass, and
        route-sign pass instead of building the full dock crossing in one frame,
        and `tile-town` now splits its full-detail building population into a
        third resumable batch so later structures no longer share one large
        follow-up population pass before town signage, banners, and night-light
        work runs, and `tile-dungeon` now yields separately for gate structure,
        the gate beacon, tower beacons, and banners so those later landmark
        passes no longer share one scheduler step after the tower pass.
- [ ] Reduce unique materials and shader program variants.
      Progress: `tile-forest` now scopes its tree-family style material cache
      per Three host instead of sharing one process-wide material/texture
      cache, so repeated forest builds on the same renderer still reuse bark,
      foliage, meadow, hollow, owl, spider, web, and carving materials, while
      separate hosts no longer leak or duplicate the wrong material instances
      across renderer boundaries.
- [ ] Reduce Object3D count and unnecessary scene hierarchy depth.
      Progress: `tile-quarry` now collapses its six repeated rubble stones into
      one `InstancedMesh`, its two mirrored derrick posts into one
      `InstancedMesh`, its repeated cart wheels into one `InstancedMesh`, and
      `tile-rail` now collapses its two repeated rails and four repeated
      sleepers into instanced sets, and full-detail cave mouths now collapse
      their repeated entrance boulders into one `InstancedMesh`, their
      mirrored cheek rocks into one `InstancedMesh`, and their mirrored inner
      pillars into one `InstancedMesh`, full-detail cave mouths now place
      their portal crown, arch, sill, tunnel, and lantern pieces directly
      under the tile root instead of a dedicated portal subgroup, and low-
      detail cave mouths now place their mouth and tunnel-back pieces
      directly under the tile root instead of a portal subgroup, and low-
      detail cave mouths now place their mound, mouth, and tunnel-back
      meshes directly under the tile root instead of a dedicated silhouette
      subgroup, and full-detail cave mouths now use their entrance-boulder
      `InstancedMesh` as the cave-mouth root and attach the cap, portal
      shell, arch, inner pillars, sill, and lantern pieces beneath it instead
      of returning a dedicated wrapper `Group`, and cave
      mushroom tiles now collapse their
      repeated stems and caps into two `InstancedMesh` nodes, cave dripstone
      tiles now collapse their repeated floor spires into one `InstancedMesh`,
      cave obstacle tiles now collapse their repeated fallen-rock boulders
      into one `InstancedMesh` and now return that instanced boulder mesh
      directly instead of wrapping it in a one-child group, and full-detail dungeons now collapse their
      repeated tower bodies, caps, gate posts, tower beacon braziers, banner
      poles, and banner crossbars into instanced sets, and full-detail
      dungeons now place their gate arch, portcullis, bars, darkness, and
      gate beacon pieces directly under the tile root instead of a dedicated
      gate subgroup, and low-detail dungeons now place their gate frame,
      opening, and beacon pieces directly under the tile root instead of a
      gate subgroup, and `tile-ruins` now
      collapses its repeated rubble fragments into one `InstancedMesh`, its
      repeated column ring into one `InstancedMesh`, and taller column caps
      into one `InstancedMesh`, tall ships now collapse their repeated masts,
      yards, and sails into instanced sets, and `tile-lighthouse` now
      collapses its two lantern-room frame rings, repeated lantern-room frame
      posts, balcony rail posts, four lantern-room panes, and four wall-glow
      boxes into instanced sets, and full-detail forest stone-ring landmarks
      now collapse their repeated stones into one `InstancedMesh`, and full-
      detail forest mushroom-ring landmarks now collapse their repeated stems
      and caps into two `InstancedMesh` nodes, and full-detail forest floor
      detail tiles now collapse their repeated stump and fallen-tree props
      into shared `InstancedMesh` sets, and full-detail forest hollows now
      collapse into one shared `InstancedMesh` per tile, and full-detail forest owls now
      collapse their repeated body and eye meshes into shared `InstancedMesh`
      sets, and
      full-detail historical forest trees now collapse their repeated marker
      stones into one shared `InstancedMesh` per landmark tree, and full-
      detail forest carvings now collapse their repeated notch meshes into
      one shared `InstancedMesh` per carving, and full-detail forest bark
      damage now collapses its repeated marker meshes into one shared
      `InstancedMesh` per damaged tree, and full-detail forest meadow grass
      patches now collapse into one shared `InstancedMesh` per tile, and
      full-detail quarry derricks now place their beam, pulley, cable,
      bucket, and lantern pieces directly under the tile root instead of a
      dedicated derrick subgroup, and
      full-detail forest beaver-cut trunks now collapse into shared
      `InstancedMesh` sets by severity, and `tile-town` now collapses its
      repeated full-detail building bodies, roofs, doors, windows, banner
      poles, and banner crossbars into shared `InstancedMesh` sets, full-
      detail town tiles now place their town-name sign pieces directly under
      the tile root instead of a dedicated sign subgroup, and dock tiles now
      collapse their repeated rails, support piles, and dock route sign stop
      placards into shared `InstancedMesh` sets, dock route signs now place
      their post, main board, and label planes directly under the dock root
      instead of a dedicated sign subgroup, and dock paddle boats now
      collapse their repeated side wheels into one shared `InstancedMesh`,
      full-detail roadside signs now place their lantern frame, glow, light,
      and cap directly under the tile root instead of a dedicated lantern
      subgroup, and low-detail roadside signs now place their post, brace,
      and placard directly under the tile root instead of a dedicated
      silhouette subgroup, and full-detail roadside signs now place their
      post meshes, placard boards, and label planes directly under the tile
      root instead of dedicated post and placard subgroups, and straight
      two-connection road tiles now use the road ribbon mesh itself as the
      tile root and attach the center patch plus optional full-detail shoulder
      ribbon beneath it instead of paying a wrapper group, and dock boats
      now place their hull, prow, cabin, sail, and ramp pieces directly
      under the dock root instead of a dedicated boat subgroup, and forest log
      bridges now collapse their repeated support posts into one shared
      `InstancedMesh`, isolated low-detail road tiles now return their single
      stub ribbon mesh directly instead of wrapping it in a one-child group,
      and standard bridge railings and covered bridge spans now collapse their repeated rails and posts into shared
      `InstancedMesh` sets, and stone bridges now collapse their repeated
      parapets into one shared `InstancedMesh`, and
      drawbridges now collapse their repeated tower frames into one shared
      `InstancedMesh`, and low-detail town tiles now collapse their repeated
      distant building bodies into one shared `InstancedMesh`, and full-
      detail sign tiles now collapse their repeated placard support bars,
      trim edge caps, and arrow heads into shared `InstancedMesh` sets,
      which removes small clusters of redundant static child nodes from each
      visible landmark or track tile.
- [ ] Instance repeated trees, foliage, rocks, and other static props.
      Progress: forest low-detail trees and several forest detail sets were
      already instanced, quarry landmarks now instance their repeated rubble
      stones, derrick posts, and cart wheels, rail tiles now instance their
      repeated rails and sleepers, cave mushroom tiles now instance their
      repeated stems and caps, cave dripstone tiles now instance their repeated
      floor spires, cave obstacle tiles now instance their repeated fallen-rock
      boulders, and full-detail cave mouths now instance their repeated
      entrance boulders, mirrored cheek rocks, and mirrored inner pillars, and
      full-detail dungeons now instance their repeated tower bodies, caps,
      gate posts, tower beacon braziers, banner poles, and banner crossbars
      instead of emitting one mesh per repeated prop, ruins landmarks now
      instance their repeated column ring and taller column caps, tall ships
      now instance their repeated rigging parts instead of emitting one mesh
      per mast, yard, or sail, lighthouse lantern-room frame rings, panes,
      and wall-glow boxes now instance their repeated decorative geometry
      instead of emitting one mesh per piece, and full-detail forest stone-
      ring landmarks now instance their repeated stones instead of emitting
      one mesh per rock, and full-detail forest mushroom-ring landmarks now
      instance their repeated stems and caps instead of emitting one mesh per
      mushroom piece, and full-detail forest floor-detail tiles now instance
      their repeated stump and fallen-tree props instead of emitting one mesh
      per floor-detail prop, and full-detail forest hollows now instance
      their repeated foliage meshes instead of emitting one mesh per hollow,
      and full-detail forest owls now instance their repeated body and eye
      meshes instead of emitting one mesh per owl body or eye, and full-
      detail historical forest trees now instance their repeated marker
      stones instead of emitting one mesh per landmark marker, and full-
      detail forest carvings now instance their repeated notch meshes instead
      of emitting one mesh per carving notch, and full-detail forest bark
      damage now instances its repeated marker meshes instead of emitting one
      mesh per damage marker, and full-detail forest meadow grass patches now
      instance their repeated foliage meshes instead of emitting one mesh per
      meadow, and full-detail forest beaver-cut trunks now instance their
      repeated leaning and felled trunk meshes instead of emitting one mesh
      per damaged trunk, and town
      tiles now instance their repeated full-detail building bodies, roofs,
      doors, windows, banner poles, and banner
      crossbars instead of emitting one mesh per building part, window pane,
      or banner hardware piece, and dock tiles now instance their repeated
      rails, support piles, and dock route sign stop placards instead of
      emitting one mesh per part, and dock paddle boats now instance their
      repeated side wheels instead of emitting one mesh per wheel, and forest
      log bridges now instance their repeated support posts instead of
      emitting one mesh per post, and standard bridges now instance their
      repeated railing rails and covered-span support posts instead of
      emitting one mesh per rail or post, and stone bridges now instance
      their repeated parapets instead of emitting one mesh per wall, and
      drawbridges now instance their repeated tower frames instead of
      emitting one mesh per frame, and low-detail town tiles now instance
      their repeated building bodies instead of emitting one mesh per distant
      building body, and full-detail sign tiles now instance their repeated
      placard support bars, trim edge caps, and arrow heads instead of
      emitting one mesh per placard hardware piece.

- [ ] Consolidate river and route calculations.
      The trace still shows `getCachedRiverCurvePoints()`, `getCachedRiverForkPath()`, `getDistanceToLineSegment()`, route connectivity checks, rail-network resolution, and terrain classification in the generation path. Resolve those once per relevant region/tile and share the result instead of having multiple plugins rediscover them.
      Progress: `overworld-support` now caches sampled main-channel river
      curve points per control cell and reuses them during terrain signal
      sampling instead of rematerializing bezier segments on each river-path
      probe, and `tile-route` now wraps `sampleTerrainSignals()` in a
      per-classification coordinate cache so dock, bridge, and neighboring
      route checks reuse repeated terrain reads within one route-classifier
      pass, and `tile-route` now reuses resolved dock-footprint scans across
      repeated nearby classifications that share the same raw terrain sampler
      and `poiAnchors` array instead of rediscovering the same coastal
      segments tile by tile, and `tile-route` now reuses connected-route
      resolvers across repeated nearby classifications that share the same
      `townAnchors` and `bridgeAnchors` arrays instead of rebuilding the
      point-query layer on every route classification, and
      `runtime-rail-network` now delegates directly to the shared
      `rail-support` region and train caches instead of adding a duplicate
      per-tile runtime cache layer, and `rail-support` now caches terrain
      reads for one `buildRailConnections()` pass so overlapping candidate
      rail paths stop re-sampling the same coordinates, and `tile-support`
      now caches both
      terrain signals and predicted route-presence lookups inside
      `createRoadsideRouteProfile()` so repeated local junction/span scans
      stop rediscovering the same nearby coordinates, and
      `tile-support` now caches reusable town-pair and town-bridge route
      segments with expanded bounds so repeated route-path checks can skip
      distant points before calling `distanceToLineSegment()`, and
      `overworld-support` now uses a packed bounded cache for default cell-
      anchor terrain evaluations so repeated anchor suitability and conflict
      checks stop rebuilding string keys in the hot generation path, and
      `runtime-overworld-anchors` now wraps each anchor-resolution pass in a
      per-call coordinate cache for `sampleTerrainSignals()` so overlapping
      mountain, forest, coastline, and summit-cluster checks stop re-sampling
      the same nearby coordinates within one deterministic anchor scan, and
      `tile-cave` now wraps each cave-linking classification pass in a
      per-call coordinate cache for `sampleTerrainSignals()` so overlapping
      mountain-pass probes between nearby cave entrances stop re-sampling the
      same terrain coordinates within one cave-system resolution, and
      `watercraft-support` now routes navigation and landing searches through
      the shared map tile cache instead of calling the uncached global
      overworld classifier directly, so repeated launch and exit checks stop
      re-running terrain/overworld classification for the same nearby tiles,
      and
      `overworld-support` now caches fully composed overworld tiles for
      repeated generation requests that share the same plugin registry, terrain
      sampler, world-state revision, seed, coordinates, and starting tile kind
      so the terrain/overworld classification and decoration pipeline does not
      rerun for the same tile, and
      `overworld-support` now caches one bounds object per river curve or
      fork path so distant terrain samples can skip segment-distance scans
      before walking the sampled path arrays.

- [ ] Move deterministic world-generation computation into workers.
      The CPU profile is dominated by cache/hashing/world-generation code that does not need access to WebGL. Move terrain signals, hashes, anchors, river paths, tree descriptors, cave descriptors, etc. into workers and send compact numeric results back to the rendering thread.
