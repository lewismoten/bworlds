# Dungeons

Base dungeon framework plus composable dungeon-type plugins, with inheritance/augmentation hooks so a plugin can override one tiny piece or replace the whole generator.

## Core Dungeon Plugin Contract

- [ ] Create a common `DungeonPlugin` interface.
- [ ] Make every dungeon plugin a POI plugin subtype.
- [ ] Give each dungeon type a unique stable identifier.
- [ ] Give each dungeon type a display name.
- [ ] Give each dungeon type a description.
- [ ] Allow plugins to declare parent/base dungeon plugins.
- [ ] Allow plugins to inherit behavior from another dungeon plugin.
- [ ] Allow plugins to override only selected generation methods.
- [ ] Allow plugins to extend parent-generated results.
- [ ] Allow plugins to replace parent-generated results completely.
- [ ] Allow several compatible add-on plugins to augment one dungeon type.
- [ ] Define deterministic plugin ordering for inherited/augmented behavior.
- [ ] Detect inheritance cycles.
- [ ] Support plugin capability detection through `supports()`.
- [ ] Keep older dungeon plugins functional when capabilities are added.
- [ ] Provide generic fallbacks for unsupported features.
- [ ] Allow plugins to advertise supported layout algorithms.
- [ ] Allow plugins to advertise supported renderer modes.
- [ ] Allow plugins to advertise supported room features.
- [ ] Allow plugins to advertise supported traversal mechanics.
- [ ] Allow plugins to advertise supported encounter mechanics.
- [ ] Allow plugins to advertise supported puzzle mechanics.

# Base Dungeon Plugin

- [ ] Create a generic base dungeon implementation.
- [ ] Provide generic room generation.
- [ ] Provide generic corridor generation.
- [ ] Provide generic walls.
- [ ] Provide generic floors.
- [ ] Provide generic ceilings.
- [ ] Provide generic doors.
- [ ] Provide generic stairs.
- [ ] Provide generic entrances/exits.
- [ ] Provide generic collision geometry.
- [ ] Provide generic pathfinding/navigation data.
- [ ] Provide generic 2D tile rendering.
- [ ] Provide generic 3D tile/model rendering.
- [ ] Provide generic text-mode representation.
- [ ] Provide generic lighting hooks.
- [ ] Provide generic encounter-placement hooks.
- [ ] Provide generic decoration hooks.
- [ ] Provide generic hidden-passage hooks.
- [ ] Provide generic key/gate progression.
- [ ] Provide generic dungeon validation.
- [ ] Allow all base components to be overridden independently.

# Plugin Inheritance and Composition

- [ ] Allow a dungeon plugin to inherit the base dungeon implementation.
- [ ] Allow a dungeon plugin to inherit another specialized dungeon.
- [ ] Allow a plugin to override only exterior appearance.
- [ ] Allow a plugin to override only room appearance.
- [ ] Allow a plugin to override only wall construction.
- [ ] Allow a plugin to override only floor construction.
- [ ] Allow a plugin to override only ceiling construction.
- [ ] Allow a plugin to override only layout generation.
- [ ] Allow a plugin to override only enemy placement.
- [ ] Allow a plugin to override only puzzles.
- [ ] Allow a plugin to override only lighting.
- [ ] Allow a plugin to override only decorations.
- [ ] Allow a plugin to override only encounters.
- [ ] Allow an add-on plugin to inject special rooms.
- [ ] Allow an add-on plugin to inject additional enemies.
- [ ] Allow an add-on plugin to inject hazards.
- [ ] Allow an add-on plugin to change visual materials.
- [ ] Allow an add-on plugin to add alternate exits.
- [ ] Allow an add-on plugin to alter difficulty curves.
- [ ] Resolve conflicts between competing plugin overrides predictably.

# Dungeon Generation Context

- [ ] Pass world seed into dungeon generation.
- [ ] Pass dungeon-specific deterministic seed.
- [ ] Pass overworld coordinates.
- [ ] Pass overworld map level.
- [ ] Pass biome.
- [ ] Pass terrain type.
- [ ] Pass nearby POIs.
- [ ] Pass regional culture/faction information.
- [ ] Pass dungeon difficulty target.
- [ ] Pass available renderer capabilities.
- [ ] Pass active resource/performance budget.
- [ ] Pass requested LOD when rendering exterior models.
- [ ] Pass cancellation/yield context for incremental generation.
- [ ] Allow plugins to derive stable sub-seeds for individual features.

# Dungeon Difficulty

- [ ] Use a generic dungeon difficulty scale from 1–10.
- [ ] Keep difficulty independent of hard-coded character levels.
- [ ] Allow each floor/zone to specify its own difficulty.
- [ ] Allow difficulty to rise with dungeon depth.
- [ ] Allow difficulty to rise toward important objectives.
- [ ] Allow occasional easier recovery zones.
- [ ] Allow optional branches to exceed main-path difficulty.
- [ ] Allow bosses to exceed surrounding room difficulty.
- [ ] Allow plugins to define their own difficulty curves.
- [ ] Allow overworld map level to translate difficulty into monster strength.
- [ ] Let overworld rules determine actual enemy level/stat scaling.
- [ ] Allow dungeon difficulty to influence encounter group size.
- [ ] Allow dungeon difficulty to influence trap complexity.
- [ ] Allow dungeon difficulty to influence puzzle complexity.
- [ ] Allow dungeon difficulty to influence loot quality.
- [ ] Allow dungeon difficulty to influence environmental hazards.

# Dungeon Size and Levels

- [ ] Allow plugins to define minimum floor count.
- [ ] Allow plugins to define maximum floor count.
- [ ] Allow fixed floor counts.
- [ ] Allow seed-based variable floor counts.
- [ ] Allow one-level dungeons.
- [ ] Allow multi-level dungeons.
- [ ] Allow very deep dungeon types.
- [ ] Allow basement/sub-basement levels.
- [ ] Allow upper tower levels.
- [ ] Allow mixed above-ground/below-ground levels.
- [ ] Allow plugins to define minimum rooms per floor.
- [ ] Allow plugins to define maximum rooms per floor.
- [ ] Allow plugins to define floor dimensions.
- [ ] Allow dimensions to vary between floors.
- [ ] Allow deeper floors to become larger.
- [ ] Allow deeper floors to become smaller/tighter.
- [ ] Allow special floors with custom layouts.
- [ ] Allow final floors to use unique rules.

# Layout Algorithm Interface

- [ ] Create a common dungeon layout algorithm interface.
- [ ] Allow plugins to select one algorithm.
- [ ] Allow plugins to combine multiple algorithms.
- [ ] Allow layout algorithms to be seeded deterministically.
- [ ] Allow algorithms to generate a logical room graph first.
- [ ] Allow algorithms to generate directly from tile space.
- [ ] Allow plugins to post-process layouts.
- [ ] Allow plugins to validate and retry invalid layouts.
- [ ] Allow layout algorithms to expose configurable parameters.
- [ ] Allow layout algorithms to yield incrementally during long generation.
- [ ] Track layout-generation CPU time.
- [ ] Put a retry limit on failed procedural layouts.

# Supported Layout Algorithms

- [ ] Support BSP room subdivision.
- [ ] Support random-room plus corridor generation.
- [ ] Support graph-first room generation.
- [ ] Support cellular automata.
- [ ] Support drunkard/random-walk carving.
- [ ] Support maze generation.
- [ ] Support growing-tree maze generation.
- [ ] Support recursive backtracking.
- [ ] Support Prim-style maze generation.
- [ ] Support Kruskal-style maze generation.
- [ ] Support Voronoi-style regions.
- [ ] Support wave-function-collapse style composition.
- [ ] Support prefab room assembly.
- [ ] Support template-driven floor plans.
- [ ] Support hub-and-spoke layouts.
- [ ] Support ring/loop layouts.
- [ ] Support linear gauntlet layouts.
- [ ] Support branching-tree progression.
- [ ] Support interconnected network layouts.
- [ ] Support vertical shaft/tower layouts.
- [ ] Support organic cavern + constructed-room hybrids.
- [ ] Allow new layout algorithms to register independently.

# Purpose-Driven Room Graphs

- [ ] Generate functional room requirements before physical layout.
- [ ] Define mandatory room types by dungeon type.
- [ ] Define optional room types by dungeon type.
- [ ] Define forbidden room types by dungeon type.
- [ ] Define preferred room adjacencies.
- [ ] Define prohibited room adjacencies.
- [ ] Define room ordering requirements.
- [ ] Define minimum distance from entrance for special rooms.
- [ ] Define maximum distance from entrance for utility rooms.
- [ ] Allow room importance weighting.
- [ ] Allow security weighting.
- [ ] Allow privacy/access restrictions.
- [ ] Generate circulation routes based on room relationships.

# Room Types

- [ ] Support entrance rooms.
- [ ] Support exit rooms.
- [ ] Support hallways.
- [ ] Support junction rooms.
- [ ] Support large halls.
- [ ] Support guard rooms.
- [ ] Support barracks.
- [ ] Support storage rooms.
- [ ] Support armories.
- [ ] Support kitchens.
- [ ] Support dining halls.
- [ ] Support sleeping quarters.
- [ ] Support libraries.
- [ ] Support workshops.
- [ ] Support laboratories.
- [ ] Support ritual rooms.
- [ ] Support chapels.
- [ ] Support crypts.
- [ ] Support cells/prisons.
- [ ] Support treasure rooms.
- [ ] Support puzzle rooms.
- [ ] Support trap rooms.
- [ ] Support boss arenas.
- [ ] Support sub-boss rooms.
- [ ] Support safe/rest rooms.
- [ ] Support secret rooms.
- [ ] Support maintenance/service rooms.
- [ ] Support water/canal rooms.
- [ ] Support vertical shaft rooms.
- [ ] Allow plugins to define custom room types.

# Room Composition

- [ ] Define a room composition interface.
- [ ] Let plugins choose room dimensions.
- [ ] Let plugins choose room shapes.
- [ ] Support rectangular rooms.
- [ ] Support square rooms.
- [ ] Support circular rooms.
- [ ] Support polygonal rooms.
- [ ] Support irregular rooms.
- [ ] Support L-shaped rooms.
- [ ] Support cross-shaped rooms.
- [ ] Support multi-height rooms.
- [ ] Support balconies.
- [ ] Support mezzanines.
- [ ] Support pits.
- [ ] Support raised platforms.
- [ ] Support columns.
- [ ] Support internal partitions.
- [ ] Allow room templates with procedural variation.
- [ ] Allow full procedural room construction.

# Tile Composition Interface

- [ ] Define a logical dungeon tile structure.
- [ ] Separate walkability from visual representation.
- [ ] Separate floor properties from wall properties.
- [ ] Allow walls independently on north/east/south/west edges.
- [ ] Allow diagonal or irregular wall support where plugins need it.
- [ ] Allow one tile to contain multiple wall edges.
- [ ] Avoid requiring separate wall models for every orientation.
- [ ] Rotate reusable wall models according to edge.
- [ ] Allow floor and wall models to be selected separately.
- [ ] Allow ceiling model selection separately.
- [ ] Allow tile decorations separately from structural geometry.
- [ ] Allow tile hazards.
- [ ] Allow tile interactables.
- [ ] Allow tile lighting sources.
- [ ] Allow tile elevation.
- [ ] Allow tile water depth.
- [ ] Allow tile metadata for AI/navigation.
- [ ] Allow plugins to customize tile composition rules.

# Tile Selection Rules

- [ ] Choose tile variants from deterministic seeds.
- [ ] Consider room type when selecting tile appearance.
- [ ] Consider neighboring tiles.
- [ ] Consider wall connectivity.
- [ ] Consider corridor orientation.
- [ ] Consider floor material.
- [ ] Consider room age/damage.
- [ ] Consider moisture.
- [ ] Consider theme.
- [ ] Consider lighting.
- [ ] Consider local clutter density.
- [ ] Avoid obvious repeated tile variants.
- [ ] Keep critical gameplay geometry deterministic.
- [ ] Allow purely cosmetic details to vary by LOD.

# Wall Construction

- [ ] Support one reusable vertical wall model.
- [ ] Rotate the wall model for each tile edge.
- [ ] Support corner pieces when required.
- [ ] Support end caps.
- [ ] Support door openings.
- [ ] Support barred openings.
- [ ] Support windows.
- [ ] Support collapsed wall sections.
- [ ] Support secret-wall variants.
- [ ] Support damaged wall variants.
- [ ] Support decorative wall panels.
- [ ] Allow wall thickness by dungeon type.
- [ ] Allow walls spanning multiple tiles.
- [ ] Allow shared wall geometry between adjacent tiles.
- [ ] Avoid generating duplicate back-to-back walls.

# Floors and Ceilings

- [ ] Support generic floor models.
- [ ] Allow plugin-specific floor materials.
- [ ] Support floor height variation.
- [ ] Support ramps.
- [ ] Support stairs.
- [ ] Support cracked floors.
- [ ] Support broken floors.
- [ ] Support pits.
- [ ] Support grates.
- [ ] Support carpet/rugs.
- [ ] Support drainage channels.
- [ ] Support ceilings.
- [ ] Support vaulted ceilings.
- [ ] Support exposed beams.
- [ ] Support ceiling openings.
- [ ] Support collapsed ceilings.
- [ ] Support ceiling decorations.
- [ ] Allow ceiling height to vary by room.

# Doors, Gates, Keys, and Locks

- [ ] Support ordinary doors.
- [ ] Support locked doors.
- [ ] Support keyed doors.
- [ ] Support barred gates.
- [ ] Support portcullises.
- [ ] Support magical barriers.
- [ ] Support combination mechanisms.
- [ ] Support switch-controlled doors.
- [ ] Support timed gates.
- [ ] Support one-way doors.
- [ ] Support secret doors.
- [ ] Support destructible doors.
- [ ] Support skill-check locks.
- [ ] Allow multiple keys for one gate.
- [ ] Allow one key to open multiple doors.
- [ ] Allow keys to be consumed or reusable.
- [ ] Place keys before the gates that require them.
- [ ] Validate that required keys are reachable.
- [ ] Prevent procedural soft-locks.
- [ ] Allow optional locked treasure areas.
- [ ] Allow plugins to define custom gating mechanics.

# Progression Graph

- [ ] Build a progression graph independently from physical geometry.
- [ ] Identify entrance node.
- [ ] Identify primary objective node.
- [ ] Identify exit node.
- [ ] Place gates on progression edges.
- [ ] Place keys/switches/puzzles before gates.
- [ ] Allow optional branches outside main progression.
- [ ] Allow loops that reconnect later.
- [ ] Allow shortcuts back toward the entrance.
- [ ] Validate main objective reachability.
- [ ] Validate exit reachability.
- [ ] Validate all mandatory progression conditions.

# Hidden Passages and Secret Rooms

- [ ] Allow plugins to support hidden passages.
- [ ] Define secret-room probability.
- [ ] Define maximum secret-room count.
- [ ] Hide doors as walls.
- [ ] Hide passages behind movable objects.
- [ ] Hide passages behind bookshelves.
- [ ] Hide passages behind waterfalls.
- [ ] Hide passages beneath floors.
- [ ] Hide passages behind destructible walls.
- [ ] Use visual clues.
- [ ] Use sound clues.
- [ ] Use quest clues.
- [ ] Allow skill-based discovery.
- [ ] Allow switch-triggered discovery.
- [ ] Ensure secret content is optional unless specifically designed otherwise.

# Puzzle System

- [ ] Define a dungeon puzzle interface.
- [ ] Allow plugins to declare supported puzzle families.
- [ ] Generate puzzle difficulty based on dungeon difficulty.
- [ ] Support switches.
- [ ] Support pressure plates.
- [ ] Support lever sequences.
- [ ] Support symbol matching.
- [ ] Support pattern puzzles.
- [ ] Support light/reflection puzzles.
- [ ] Support movable-block puzzles.
- [ ] Support water-level puzzles.
- [ ] Support rotating-room puzzles.
- [ ] Support timing puzzles.
- [ ] Support music/sound puzzles.
- [ ] Support riddles.
- [ ] Support item-placement puzzles.
- [ ] Support multi-room puzzles.
- [ ] Support cooperative puzzles.
- [ ] Validate that generated puzzles are solvable.
- [ ] Generate puzzle hints.
- [ ] Avoid mandatory puzzles without sufficient clues.

# Boss and Sub-Boss Structure

- [ ] Allow dungeon types without bosses.
- [ ] Allow exactly one final boss.
- [ ] Allow multiple bosses.
- [ ] Allow sub-bosses.
- [ ] Define minimum boss depth.
- [ ] Define preferred boss-room dimensions.
- [ ] Define boss-room geometry rules.
- [ ] Provide staging space before boss rooms.
- [ ] Provide retreat/exit behavior where appropriate.
- [ ] Increase difficulty near bosses.
- [ ] Allow environmental boss mechanics.
- [ ] Allow boss-related puzzle mechanics.
- [ ] Allow boss doors requiring progression completion.
- [ ] Allow boss encounter groups rather than one creature.
- [ ] Prevent ordinary encounters from accidentally occupying boss arenas.

# Enemy Generation

- [ ] Allow dungeon plugins to recommend enemy families.
- [ ] Allow dungeon plugins to prohibit enemy families.
- [ ] Allow biome/region to influence enemies.
- [ ] Allow factions to influence enemies.
- [ ] Allow room function to influence enemy selection.
- [ ] Scale enemy challenge from dungeon difficulty 1–10.
- [ ] Let overworld level translate difficulty into actual enemy stats.
- [ ] Avoid hard-coding character levels into dungeon plugins.
- [ ] Allow deeper zones to recommend higher challenge.
- [ ] Allow weaker creatures near entrances.
- [ ] Allow elite enemies.
- [ ] Allow rare enemies.
- [ ] Allow environmental creatures.
- [ ] Allow neutral creatures.
- [ ] Allow competing enemy factions.

# Encounter Groups

- [ ] Support individual enemy placement.
- [ ] Support small groups.
- [ ] Support squads.
- [ ] Support mixed-role groups.
- [ ] Support ranged + melee compositions.
- [ ] Support healer/support enemies.
- [ ] Support guards at strategic locations.
- [ ] Support ambush groups.
- [ ] Support sleeping/resting groups.
- [ ] Support wandering groups.
- [ ] Support reinforcement groups.
- [ ] Support territorial groups.
- [ ] Avoid placing every enemy independently and randomly.
- [ ] Allow encounter templates by dungeon type.
- [ ] Scale group composition with difficulty.

# Enemy Positioning

- [ ] Favor guard placement near doors/gates.
- [ ] Favor ranged units at defensible distances.
- [ ] Favor ambushers around corners.
- [ ] Favor patrol guards along main routes.
- [ ] Favor monsters near nests/lairs.
- [ ] Favor workers near work areas.
- [ ] Favor leaders in protected spaces.
- [ ] Avoid placing enemies inside blocking geometry.
- [ ] Validate enemy navigation from spawn locations.
- [ ] Provide minimum spacing between spawn groups.

# Patrols and Movement Paths

- [ ] Generate patrol routes.
- [ ] Support looping patrol routes.
- [ ] Support back-and-forth patrols.
- [ ] Support room-to-room patrols.
- [ ] Support guard-post rotations.
- [ ] Support wandering areas.
- [ ] Avoid patrol paths through locked inaccessible areas.
- [ ] Allow patrol routes to change after alarms.
- [ ] Allow dungeon plugins to customize patrol behavior.
- [ ] Generate navigation paths after structural layout is validated.

# NPC Generation

- [ ] Allow friendly NPCs.
- [ ] Allow neutral NPCs.
- [ ] Allow prisoners.
- [ ] Allow merchants.
- [ ] Allow guides.
- [ ] Allow quest NPCs.
- [ ] Allow survivors.
- [ ] Allow researchers/explorers.
- [ ] Allow captured enemies.
- [ ] Allow faction-specific NPCs.
- [ ] Place NPCs according to logical room function.
- [ ] Avoid random NPC placement without context.

# Quest Integration

- [ ] Allow dungeon plugins to recommend quest types.
- [ ] Support rescue quests.
- [ ] Support recovery quests.
- [ ] Support boss-hunt quests.
- [ ] Support investigation quests.
- [ ] Support exploration quests.
- [ ] Support puzzle quests.
- [ ] Support sabotage quests.
- [ ] Support escort quests.
- [ ] Support resource-gathering quests.
- [ ] Support hidden-object quests.
- [ ] Allow generated rooms to expose quest hooks.
- [ ] Allow quest requirements to influence layout.
- [ ] Ensure quest-critical rooms remain reachable.

# Water and Canal Systems

- [ ] Allow plugins to support water.
- [ ] Support shallow water.
- [ ] Support deep water.
- [ ] Support canals.
- [ ] Support drainage channels.
- [ ] Support underground rivers.
- [ ] Support flooded rooms.
- [ ] Support waterfalls.
- [ ] Support cisterns.
- [ ] Support sewage channels.
- [ ] Support locks/gates controlling water.
- [ ] Support bridges.
- [ ] Support stepping stones.
- [ ] Support boats where appropriate.
- [ ] Support swimming sections.
- [ ] Support underwater passages.
- [ ] Use water flow direction consistently.
- [ ] Ensure water elevation relationships make sense.
- [ ] Allow water to participate in puzzles.

# Vertical Traversal

- [ ] Support stairs up.
- [ ] Support stairs down.
- [ ] Support ladders.
- [ ] Support ramps.
- [ ] Support elevators.
- [ ] Support lifts.
- [ ] Support rope descents.
- [ ] Support vertical shafts.
- [ ] Support pits.
- [ ] Support balconies.
- [ ] Support bridges between elevations.
- [ ] Support one-way drops.
- [ ] Validate vertical connectivity between floors.
- [ ] Allow vertical shortcuts between nonadjacent floors.

# Lighting

- [ ] Let each dungeon plugin define default darkness.
- [ ] Allow naturally dark dungeons.
- [ ] Support torches.
- [ ] Support lamps.
- [ ] Support candles.
- [ ] Support braziers.
- [ ] Support glowing crystals.
- [ ] Support magical lights.
- [ ] Support sunlight through openings.
- [ ] Support skylights.
- [ ] Support windows.
- [ ] Support emergency/colored lighting.
- [ ] Place lights according to inhabited areas.
- [ ] Leave abandoned areas darker.
- [ ] Allow lights to be extinguished.
- [ ] Allow broken/nonfunctional lights.
- [ ] Use lighting as navigation.
- [ ] Use lighting to highlight important rooms.
- [ ] Limit dynamic and shadow-casting lights by performance budget.

# Sound and Music

- [ ] Allow plugins to define ambient audio profiles.
- [ ] Allow dungeons with no music.
- [ ] Allow sparse occasional music.
- [ ] Allow continuous dungeon music.
- [ ] Allow boss music.
- [ ] Allow zone-specific musical changes.
- [ ] Add room-dependent reverberation.
- [ ] Add footsteps appropriate to floor materials.
- [ ] Add door/gate sounds.
- [ ] Add water ambience.
- [ ] Add machinery ambience.
- [ ] Add creature sounds.
- [ ] Add distant patrol sounds.
- [ ] Add environmental clue sounds.
- [ ] Let sound travel through connected spaces.
- [ ] Apply occlusion through walls.

# Hazards

- [ ] Support spike traps.
- [ ] Support falling-rock traps.
- [ ] Support dart traps.
- [ ] Support fire traps.
- [ ] Support poison traps.
- [ ] Support collapsing floors.
- [ ] Support swinging hazards.
- [ ] Support magical traps.
- [ ] Support alarm traps.
- [ ] Support environmental hazards.
- [ ] Support lava.
- [ ] Support toxic gas.
- [ ] Support unstable structures.
- [ ] Scale hazard frequency with dungeon type.
- [ ] Scale hazard severity with difficulty.
- [ ] Telegraph hazards sufficiently for fair gameplay.

# Decorations and Environmental Storytelling

- [ ] Allow plugin-specific decoration sets.
- [ ] Place decorations according to room purpose.
- [ ] Generate furniture.
- [ ] Generate storage containers.
- [ ] Generate tools.
- [ ] Generate banners.
- [ ] Generate statues.
- [ ] Generate bones/remains.
- [ ] Generate rubble.
- [ ] Generate graffiti/carvings.
- [ ] Generate books/documents.
- [ ] Generate discarded equipment.
- [ ] Generate camps.
- [ ] Generate food/cooking areas.
- [ ] Generate signs.
- [ ] Generate faction symbols.
- [ ] Generate signs of battles.
- [ ] Generate decay appropriate to dungeon history.
- [ ] Avoid uniform random prop scattering.

# Dungeon Themes

- [ ] Support fortress dungeons.
- [ ] Support castle dungeons.
- [ ] Support prison dungeons.
- [ ] Support crypts.
- [ ] Support tombs.
- [ ] Support temples.
- [ ] Support monasteries.
- [ ] Support wizard towers.
- [ ] Support magical laboratories.
- [ ] Support sewers.
- [ ] Support mines.
- [ ] Support abandoned cities.
- [ ] Support palaces.
- [ ] Support military bunkers.
- [ ] Support bandit strongholds.
- [ ] Support monster lairs.
- [ ] Support ancient ruins.
- [ ] Support partially collapsed dungeons.
- [ ] Support flooded dungeons.
- [ ] Support mixed natural/constructed dungeons.
- [ ] Allow custom themes from plugins.

# Dungeon History and State

- [ ] Generate original dungeon purpose.
- [ ] Generate approximate age.
- [ ] Generate original builders.
- [ ] Generate current occupants.
- [ ] Generate abandonment reason.
- [ ] Generate damage state.
- [ ] Generate renovation/reuse history.
- [ ] Allow several construction eras.
- [ ] Generate collapsed sections.
- [ ] Generate repaired sections.
- [ ] Generate repurposed rooms.
- [ ] Generate faction occupation changes.
- [ ] Let history influence visual style and contents.

# Exterior POI Representation

- [ ] Require dungeon plugins to provide an overworld POI representation.
- [ ] Support text-mode POI representation.
- [ ] Support 2D overworld tile/sprite representation.
- [ ] Support 3D overworld model representation.
- [ ] Allow exterior model LODs.
- [ ] Allow entrance orientation based on terrain.
- [ ] Align dungeon entrance with actual overworld access.
- [ ] Allow exterior signs of dungeon type.
- [ ] Allow exterior decorations.
- [ ] Allow ruined or hidden entrances.
- [ ] Allow plugin inheritance to override only exterior appearance.

# 2D Dungeon Rendering

- [ ] Provide generic floor tiles.
- [ ] Provide generic wall edges.
- [ ] Provide generic doors.
- [ ] Provide stairs.
- [ ] Provide gates.
- [ ] Provide water.
- [ ] Provide traps.
- [ ] Provide decorations.
- [ ] Provide light overlays.
- [ ] Provide secret-state visuals where discovered.
- [ ] Allow dungeon plugins to override any tile renderer.
- [ ] Allow inherited plugins to replace individual tile parts.

# 3D Dungeon Rendering

- [ ] Provide reusable wall models.
- [ ] Provide reusable floor models.
- [ ] Provide reusable ceiling models.
- [ ] Provide reusable door models.
- [ ] Provide reusable stair models.
- [ ] Provide reusable column models.
- [ ] Provide reusable gate models.
- [ ] Allow rotation/reuse of wall pieces.
- [ ] Support instancing repeated structural pieces.
- [ ] Share materials where possible.
- [ ] Avoid unique geometry for identical building blocks.
- [ ] Allow plugin-specific model replacement.
- [ ] Allow room-specific model replacement.
- [ ] Allow individual feature replacement.
- [ ] Support LOD models.
- [ ] Respect plugin render budgets.
- [ ] Cull rooms not visible through connected portals.

# Dungeon Visibility Optimization

- [ ] Divide dungeons into visibility sectors.
- [ ] Treat rooms as culling units.
- [ ] Treat corridors as culling units.
- [ ] Use doors/openings as visibility portals.
- [ ] Avoid rendering rooms behind solid walls.
- [ ] Avoid rendering other floors when invisible.
- [ ] Cull distant dungeon sections.
- [ ] Use darkness/fog to hide distant detail naturally.
- [ ] Disable invisible room animations.
- [ ] Disable invisible room particles.
- [ ] Disable inaudible room audio.

# Navigation Validation

- [ ] Verify entrance-to-objective path exists.
- [ ] Verify objective-to-exit path exists.
- [ ] Verify stairs connect valid floors.
- [ ] Verify doors align with passable spaces.
- [ ] Verify gates do not permanently block progression.
- [ ] Verify required keys are reachable.
- [ ] Verify puzzles have solutions.
- [ ] Verify NPC spawn points are reachable.
- [ ] Verify boss rooms are reachable.
- [ ] Verify secret paths do not accidentally become mandatory.
- [ ] Verify room collision matches logical walkability.
- [ ] Validate navigation after decoration placement.

# Post-Generation Validation

- [ ] Validate room count.
- [ ] Validate floor count.
- [ ] Validate dungeon bounds.
- [ ] Validate required room types.
- [ ] Validate progression graph.
- [ ] Validate difficulty progression.
- [ ] Validate enemy placement.
- [ ] Validate key/door relationships.
- [ ] Validate puzzle solvability.
- [ ] Validate hidden-room accessibility.
- [ ] Validate water connectivity.
- [ ] Validate vertical connectivity.
- [ ] Validate render/model budgets.
- [ ] Reject or repair invalid layouts.
- [ ] Limit regeneration attempts.

# Procedural Performance

- [ ] Generate logical dungeon data before renderer-specific models.
- [ ] Keep generation deterministic.
- [ ] Cache expensive repeatable results.
- [ ] Use generators to yield during long loops.
- [ ] Make dungeon generation cancellable.
- [ ] Generate rooms incrementally.
- [ ] Generate nearest/needed floors first.
- [ ] Defer decorations until structural layout is ready.
- [ ] Defer high-detail 3D models until visible.
- [ ] Use workers for expensive layout calculations where beneficial.
- [ ] Enforce per-plugin CPU budgets.
- [ ] Enforce model/render resource budgets.

# Dungeon Generation Debug Page

- [ ] Create a dungeon-generator preview page.
- [ ] Select dungeon plugin.
- [ ] Select seed.
- [ ] Randomize seed.
- [ ] Select target difficulty 1–10.
- [ ] Select floor count.
- [ ] Select layout algorithm.
- [ ] Show logical room graph.
- [ ] Show progression graph.
- [ ] Show room types.
- [ ] Show difficulty by room.
- [ ] Show enemy groups.
- [ ] Show patrol paths.
- [ ] Show keys and gates.
- [ ] Show puzzle dependencies.
- [ ] Show secret rooms.
- [ ] Show water flow.
- [ ] Show vertical links.
- [ ] Preview text representation.
- [ ] Preview 2D representation.
- [ ] Preview 3D representation.
- [ ] Toggle collision.
- [ ] Toggle navigation.
- [ ] Toggle room IDs.
- [ ] Toggle visibility sectors.
- [ ] Display generation time.
- [ ] Display room count.
- [ ] Display tile count.
- [ ] Display model count.
- [ ] Display triangles/draw calls/materials.
- [ ] Display validation warnings.
- [ ] Generate many seeds in a batch for quality testing.

# Automated Dungeon Tests

- [ ] Verify identical seeds produce identical logical dungeons.
- [ ] Verify different seeds produce meaningful variation.
- [ ] Verify all mandatory rooms exist.
- [ ] Verify entrance and exit connectivity.
- [ ] Verify progression gates are solvable.
- [ ] Verify bosses appear only when requested.
- [ ] Verify sub-boss counts stay within plugin rules.
- [ ] Verify keys precede required locks.
- [ ] Verify puzzles are solvable.
- [ ] Verify hidden rooms remain optional unless explicitly mandatory.
- [ ] Verify difficulty generally increases where configured.
- [ ] Verify enemy groups fit their rooms.
- [ ] Verify patrol paths remain navigable.
- [ ] Verify dungeon models remain within render budgets.
- [ ] Verify generation stays within CPU/time budgets.
- [ ] Test thousands of deterministic seeds for generation failures.

A useful architecture could ultimately look like:

```ts
interface DungeonPlugin {
  id: string;
  extends?: string;

  supports(feature: DungeonFeature): boolean;

  createDefinition?(context: DungeonGenerationContext): DungeonDefinition;

  generateLayout?(
    context: DungeonGenerationContext,
    definition: DungeonDefinition
  ): Generator<DungeonGenerationStep, DungeonLayout>;

  composeTile?(context: DungeonTileContext): DungeonTileComposition;

  createOverworld2D?(context: DungeonExteriorContext): Dungeon2DModel;

  createOverworld3D?(context: DungeonExteriorContext): Dungeon3DModel;
}
```

Then inheritance can work conceptually like:

```text
Base Dungeon
    │
    ├── Fortress
    │      └── Haunted Fortress
    │             + ghosts
    │             + darkness
    │             + sealed crypt
    │
    ├── Temple
    │      └── Sun Temple
    │             + light puzzles
    │
    └── Mine
           └── Dwarven Mine
                  + rails
                  + machinery
                  + dwarven architecture
```

The key design choice I'd preserve is that a plugin describes **intent and rules**, while the base framework supplies reusable mechanics. A `HauntedFortressPlugin` should be able to say, essentially, “use the fortress layout, replace these materials, inject crypt rooms, change encounter rules, and add spectral lighting” instead of reimplementing walls, stairs, tile composition, path validation, doors, LOD, 2D rendering, and 3D rendering from scratch. That should make it practical to create many genuinely different dungeon types without making each one a new engine.
