# High Priority

Always run tests to make sure all tests pass

- [ ] Downloading MIDI works, but Download Export ZIP fails

music-debug-midi-file.ts:36 Uncaught Error: Cannot export MIDI: Intro harmony drifted at measure 1 (G#-F# vs B-D#-G#; notes G#6). Section A harmony drifted at measure 9 (G#-F# vs B-D#-G#; notes G#6). Section A harmony drifted at measures 14-15 (G#-B vs G#-C#-F#; notes G#5). Return harmony drifted at measure 57 (G#-F# vs B-D#-G#; notes G#6). Return harmony drifted at measures 62-63 (G#-B vs G#-C#-F#; notes G#5). Return harmony drifted at measure 71 (F#-B vs B-D#-G#; notes B5, F#6). Outro harmony drifted at measure 73 (G#-F# vs B-D#-G#; notes G#6). Intro bass roots drifted at measure 2 (B vs G#; notes B2). Intro bass roots drifted at measure 6 (B vs G#; notes B2). Intro bass roots drifted at measure 8 (G# vs B; notes G#2). Section A bass roots drifted at measure 10 (B vs G#; notes B2). Section A bass roots drifted at measures 12-13 (G# vs B; notes G#2). Section A bass roots drifted at measures 14-15 (B vs G#; notes B2). Section A bass roots drifted at measure 18 (B vs G#; notes B2). Section A bass roots drifted at measures 20-21 (G# vs B; notes G#2). Section A bass roots drifted at measure 22 (B vs G#; notes B2). Return bass roots drifted at measure 58 (B vs G#; notes B2). Return bass roots drifted at measures 60-61 (G# vs B; notes G#2). Return bass roots drifted at measures 62-63 (B vs G#; notes B2). Return bass roots drifted at measure 66 (B vs G#; notes B2). Return bass roots drifted at measures 68-69 (G# vs B; notes G#2). Return bass roots drifted at measure 70 (B vs G#; notes B2). Outro bass roots drifted at measure 74 (B vs G#; notes B2). Outro bass roots drifted at measures 76-77 (G# vs B; notes G#2). Outro bass roots drifted at measures 78-79 (B vs G#; notes B2). Section A question cadence at measure 16 missed its target tones (lead C#6, bass C#3). Section B question cadence at measure 32 missed its target tones (lead C#6, bass C#3). Section A' question cadence at measure 48 missed its target tones (lead C#6, bass C#3). Return question cadence at measure 64 missed its target tones (lead C#6, bass C#3). Return question cadence at measure 64 drifted outside the active harmony (G#; lead C#6, bass C#3). Return loop cadence at measure 72 missed its target tones (lead C#6, bass C#3). Return loop cadence at measure 72 drifted outside the active harmony (B; lead C#6, bass C#3). Outro answer cadence at measure 80 drifted outside the active harmony (G#; lead B4, bass B1). Lead contour ending at measure 12 on C#6 resolved to scale degree 12 instead of tonic.
at createMusicDebugMidiFile (music-debug-midi-file.ts:36:11
at createMeasuredMusicDebugExportBundle (music-debug-export-bundle.ts:69:20
at downloadMusicDebugExportBundle (music-debug-export-bundle.ts:117:31
at HTMLButtonElement.<anonymous> (music-debug-page.ts:612:19
(anonymous) @ music-debug-midi-file.ts:36
(anonymous) @ music-debug-export-bundle.ts:69
(anonymous) @ music-debug-export-bundle.ts:117
(anonymous) @ music-debug-page.ts:612

# Next Highest

- [ ] Eliminate the remaining 500 ms and 150 ms frame stalls.
  - [ ] Convert long plugin loops to generators that yield work to the scheduler.
  - [ ] Resume unfinished generators on later frames.
  - [ ] Let generators yield progress without creating final Three.js objects yet.
  - [ ] Keep simple/cheap plugin methods synchronous where generators add no value.
- [ ] Reduce unique materials and shader program variants.
- [ ] Reduce Object3D count and unnecessary scene hierarchy depth.
      Progress: `tile-quarry` now collapses its six repeated rubble stones into
      one `InstancedMesh`, its repeated cart wheels into one `InstancedMesh`,
      and `tile-rail` now collapses its two repeated rails and four repeated
      sleepers into instanced sets, and full-detail cave mouths now collapse
      their repeated entrance boulders into one `InstancedMesh`, and full-detail
      dungeons now collapse their repeated tower bodies and caps into two
      `InstancedMesh` nodes, and `tile-ruins` now collapses its repeated rubble
      fragments into one `InstancedMesh`, and `tile-lighthouse` now collapses its repeated
      lantern-room frame posts, balcony rail posts, and four lantern-room
      panes into instanced sets, and full-detail forest stone-ring landmarks
      now collapse their repeated stones into one `InstancedMesh`, which
      removes small clusters of redundant static child nodes from each visible
      landmark or track tile.
- [ ] Instance repeated trees, foliage, rocks, and other static props.
      Progress: forest low-detail trees and several forest detail sets were
      already instanced, quarry landmarks now instance their repeated rubble
      stones and cart wheels, rail tiles now instance their repeated rails and
      sleepers, and full-detail cave mouths now instance their repeated
      entrance boulders, and full-detail dungeons now instance their repeated
      tower bodies and caps instead of emitting one mesh per repeated prop,
      lighthouse lantern-room panes now instance their repeated decorative
      glass planes instead of emitting one mesh per pane, and full-detail
      forest stone-ring landmarks now instance their repeated stones instead of
      emitting one mesh per rock.

- [ ] Consolidate river and route calculations.
      The trace still shows `getCachedRiverCurvePoints()`, `getCachedRiverForkPath()`, `getDistanceToLineSegment()`, route connectivity checks, rail-network resolution, and terrain classification in the generation path. Resolve those once per relevant region/tile and share the result instead of having multiple plugins rediscover them.

- [ ] Move deterministic world-generation computation into workers.
      The CPU profile is dominated by cache/hashing/world-generation code that does not need access to WebGL. Move terrain signals, hashes, anchors, river paths, tree descriptors, cave descriptors, etc. into workers and send compact numeric results back to the rendering thread.
