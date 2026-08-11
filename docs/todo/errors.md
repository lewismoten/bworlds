# High Priority

Always run tests to make sure all tests pass

- [x] Complete client-error-snapshot.md
- [ ] Complete audio-priority2.md

# Next Highest

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
        `tile-mountain` now exposes `create3DModelProgressive(...)` so the
        renderer can resume between the base cone, upper peak, crown, and snowcap
        layers instead of building the full stack in one frame.
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
      subgroup, cave
      mushroom tiles now collapse their
      repeated stems and caps into two `InstancedMesh` nodes, cave dripstone
      tiles now collapse their repeated floor spires into one `InstancedMesh`,
      cave obstacle tiles now collapse their repeated fallen-rock boulders
      into one `InstancedMesh`, and full-detail dungeons now collapse their
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
      root instead of dedicated post and placard subgroups, and dock boats
      now place their hull, prow, cabin, sail, and ramp pieces directly
      under the dock root instead of a dedicated boat subgroup, and forest log
      bridges now collapse their repeated support posts into one shared
      `InstancedMesh`, and standard bridge railings and covered bridge spans now collapse their repeated rails and posts into shared
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
      pass, and `runtime-rail-network` now delegates directly to the shared
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
      `overworld-support` now caches one bounds object per river curve or
      fork path so distant terrain samples can skip segment-distance scans
      before walking the sampled path arrays.

- [ ] Move deterministic world-generation computation into workers.
      The CPU profile is dominated by cache/hashing/world-generation code that does not need access to WebGL. Move terrain signals, hashes, anchors, river paths, tree descriptors, cave descriptors, etc. into workers and send compact numeric results back to the rendering thread.
