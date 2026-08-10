- [x] Allow two or more cave entrances along the same mountain pass within a certain distance of eachother to act as a tunnel between each other, leading to the same cave system.
- [x] Generate a tileable cave system for caves with stalagtights, stalagmites, glowing mushrooms, pools of water, occasional obstacles, rope bridges, etc.

# Development Checklist

Treat the system as a combination of **world placement, topology, geology, traversal, hazards, decoration, lighting, audio, theming, and special-purpose variants like mines**. The key is making the cave feel like a place that formed naturally instead of a rectangular dungeon with rock textures.

## Cave Placement and World Entrances

- [ ] Place cave entrances primarily along mountain edges, cliffs, rocky hillsides, ravines, and exposed stone faces.
- [ ] Allow occasional cave entrances in forests, riverbanks, sinkholes, deserts, ruins, and other appropriate terrain.
- [ ] Bias cave generation toward geologically plausible areas instead of distributing entrances uniformly.
- [ ] Prevent cave entrances from appearing on terrain where they would look physically impossible.
- [ ] Generate cave entrances as openings into separate interior maps.
- [ ] Associate every cave interior with the exact overworld entrance used to reach it.
- [ ] Allow caves to have one or multiple entrances depending on cave type.
- [ ] Make ordinary natural caves more likely than multi-entrance cave systems.
- [ ] Make mine shafts normally generate with a single primary entrance.
- [ ] Allow abandoned mines to occasionally have collapsed secondary exits.
- [ ] Check for nearby cave entrances before generating isolated interiors.
- [ ] Allow nearby cave entrances to connect into the same underground cave system.
- [ ] Generate underground passages between nearby caves when geology and distance make sense.
- [ ] Avoid connecting every nearby cave automatically.
- [ ] Use probability, depth, elevation, and rock type to determine whether neighboring caves connect.
- [ ] Allow hidden exits from caves to emerge somewhere unexpected on the overworld.
- [ ] Allow cave systems to cross underneath roads, rivers, mountains, or settlements without necessarily connecting to them.
- [ ] Track approximate underground coordinates so cave relationships remain spatially believable.
- [ ] Prevent impossible underground connections that would pass above ground or through unrelated map areas.
- [ ] Allow very large cave networks to contain several overworld entrances spread across a mountain range.
- [ ] Mark entrances as discovered independently even when they connect to an already-known cave system.

## Cave Entrance Appearance

- [ ] Generate different entrance sizes.
- [ ] Generate narrow cracks that require squeezing through.
- [ ] Generate large cavern mouths.
- [ ] Generate vertical sinkhole entrances.
- [ ] Generate entrances beneath rock overhangs.
- [ ] Generate partially collapsed entrances.
- [ ] Generate entrances obscured by vegetation.
- [ ] Generate entrances hidden behind waterfalls.
- [ ] Generate entrances concealed by loose rocks.
- [ ] Generate entrances beneath ruins or abandoned structures.
- [ ] Generate mine entrances with timber framing.
- [ ] Generate sealed or boarded mine entrances.
- [ ] Add debris around abandoned mine entrances.
- [ ] Add warning signs, old notices, or symbols around some artificial entrances.
- [ ] Add animal tracks near inhabited caves.
- [ ] Add cold mist, warm air, water runoff, or unusual smells as cave-entry clues.
- [ ] Make the exterior geometry align visually with the interior entrance.
- [ ] Match entrance dimensions between text, 2D, and 3D representations.

# Cave Identity and Seed

- [ ] Generate a persistent cave seed.
- [ ] Store cave topology separately from visual decoration.
- [ ] Generate a cave theme before generating individual rooms and passages.
- [ ] Generate geological properties for each cave.
- [ ] Generate cave age.
- [ ] Generate moisture level.
- [ ] Generate cave depth.
- [ ] Generate temperature.
- [ ] Generate mineral composition.
- [ ] Generate structural stability.
- [ ] Generate biological activity.
- [ ] Generate evidence of past humanoid occupation.
- [ ] Generate evidence of current occupation.
- [ ] Generate danger level.
- [ ] Generate accessibility difficulty.
- [ ] Preserve the same cave layout when revisiting it.
- [ ] Allow dynamic cave conditions to change without regenerating the base cave.

# Cave Themes

- [ ] Support ordinary limestone caves.
- [ ] Support dry rocky caves.
- [ ] Support wet caves.
- [ ] Support underground river caves.
- [ ] Support crystal caves.
- [ ] Support volcanic caves.
- [ ] Support lava tubes.
- [ ] Support ice caves.
- [ ] Support mushroom caves.
- [ ] Support glow-worm caves.
- [ ] Support mineral-rich caves.
- [ ] Support sulfurous caves.
- [ ] Support ancient burial caves.
- [ ] Support monster dens.
- [ ] Support animal dens.
- [ ] Support bandit hideouts.
- [ ] Support forgotten temples hidden inside natural caves.
- [ ] Support ancient ruins swallowed by cave growth.
- [ ] Support abandoned mines.
- [ ] Support active mines where appropriate.
- [ ] Support partially flooded caves.
- [ ] Support subterranean forests or unusual underground ecosystems.
- [ ] Support magically altered caves.
- [ ] Support corrupted caves.
- [ ] Support caves containing ancient technology or machinery where setting-appropriate.
- [ ] Allow caves to transition between themes at great depth.
- [ ] Allow natural caves to contain localized human-made sections without making the whole cave a mine.

# Cave Topology

- [ ] Generate irregular passage networks rather than rectangular corridors.
- [ ] Generate passages with varying widths.
- [ ] Generate passages with varying heights.
- [ ] Generate passages that curve naturally.
- [ ] Generate passages that fork.
- [ ] Generate loops.
- [ ] Generate dead ends.
- [ ] Generate narrow connectors between larger chambers.
- [ ] Generate large caverns.
- [ ] Generate small chambers.
- [ ] Generate long winding tunnels.
- [ ] Generate vertical shafts.
- [ ] Generate steep slopes.
- [ ] Generate natural stair-step formations.
- [ ] Generate ledges.
- [ ] Generate multi-level cave layouts.
- [ ] Allow passages to cross at different elevations without connecting.
- [ ] Generate hidden passages.
- [ ] Generate collapsed passages.
- [ ] Generate crawlspaces.
- [ ] Generate squeeze-through passages.
- [ ] Generate passages requiring climbing.
- [ ] Generate pits that require another route around.
- [ ] Generate chambers reachable only through water.
- [ ] Generate alternate paths through large cave systems.
- [ ] Prevent every route from being equally wide and convenient.
- [ ] Ensure there is at least one valid navigable route between required objectives.
- [ ] Validate that procedural obstructions do not accidentally make the cave impossible to complete.
- [ ] Allow optional inaccessible areas that can later be reached with better equipment or abilities.

# Organic Shape Generation

- [ ] Avoid straight parallel walls except in artificial mine sections.
- [ ] Avoid perfectly square cave rooms.
- [ ] Distort wall boundaries using noise.
- [ ] Distort floor boundaries using noise.
- [ ] Use cellular automata where appropriate for rough cave silhouettes.
- [ ] Use erosion-style smoothing after initial generation.
- [ ] Use spline-based tunnels for major passage connections.
- [ ] Vary tunnel diameter along its length.
- [ ] Generate bulges and constrictions.
- [ ] Generate alcoves.
- [ ] Generate irregular wall recesses.
- [ ] Generate uneven ceiling outlines.
- [ ] Generate asymmetrical chambers.
- [ ] Allow natural rock pillars to divide large chambers.
- [ ] Avoid obvious repeating generation patterns.
- [ ] Use multiple noise frequencies so surfaces contain both large and small irregularities.
- [ ] Maintain navigable widths despite visual distortion.
- [ ] Make artificial areas visibly more geometric than natural cave areas.

# Text Representation

- [ ] Define text tiles for cave floor.
- [ ] Define text tiles for cave wall.
- [ ] Define text tiles for solid rock.
- [ ] Define text tiles for rubble.
- [ ] Define text tiles for water.
- [ ] Define text tiles for deep water.
- [ ] Define text tiles for chasms.
- [ ] Define text tiles for bridges.
- [ ] Define text tiles for rails.
- [ ] Define text tiles for mine carts.
- [ ] Define text tiles for ladders.
- [ ] Define text tiles for stalagmites.
- [ ] Define text tiles for stalactite hazards where useful.
- [ ] Define text tiles for crystals.
- [ ] Define text tiles for mushrooms and glow growth.
- [ ] Define text tiles for debris.
- [ ] Define text tiles for artificial support structures.
- [ ] Define text tiles for doors and gates.
- [ ] Define text tiles for entrances and exits.
- [ ] Ensure text-mode tiles communicate blocking versus walkable spaces clearly.
- [ ] Keep procedural topology identical between text, 2D, and 3D modes.

# 2D Cave Rendering

- [ ] Render irregular wall edges instead of a rigid tile-grid appearance.
- [ ] Use multiple cave-floor tile variants.
- [ ] Rotate and mirror decorative tile variants.
- [ ] Blend floor materials between damp and dry areas.
- [ ] Render rock cracks.
- [ ] Render loose stones.
- [ ] Render small stalagmites.
- [ ] Render puddles.
- [ ] Render moss or cave growth.
- [ ] Render crystal deposits.
- [ ] Render shadows beneath overhead formations.
- [ ] Darken unexplored cave areas.
- [ ] Make light sources visibly affect nearby tiles.
- [ ] Add subtle animated water.
- [ ] Add subtle glow effects to luminescent organisms.
- [ ] Distinguish artificial mine flooring from natural cave flooring.
- [ ] Render rail tracks clearly where present.
- [ ] Make chasm edges visually obvious.
- [ ] Keep navigation readable despite decorative noise.

# 3D Cave Geometry

- [ ] Replace simple vertical wall blocks with irregular rock wall models.
- [ ] Use modular rock formations that can blend together.
- [ ] Generate uneven cave floors.
- [ ] Generate uneven cave ceilings.
- [ ] Vary ceiling height substantially.
- [ ] Generate sloped cave walls.
- [ ] Generate rock overhangs.
- [ ] Generate natural arches.
- [ ] Generate rock columns.
- [ ] Generate collapsed rock piles.
- [ ] Generate ledges.
- [ ] Generate cliffs inside large chambers.
- [ ] Generate vertical shafts.
- [ ] Generate irregular cave mouths between chambers.
- [ ] Hide tile-grid boundaries using overlapping rock models.
- [ ] Randomly rotate and scale rock models within controlled ranges.
- [ ] Avoid obvious duplication of the same rock model.
- [ ] Use larger formations to establish structure and smaller rocks for detail.
- [ ] Use LOD or simplified geometry for distant cave models.
- [ ] Avoid generating invisible geometry behind inaccessible walls when unnecessary.
- [ ] Cull cave sections that cannot currently be seen.
- [ ] Keep collision geometry simpler than visible rock geometry.

# Stalactites and Stalagmites

- [ ] Generate stalactites from suitable ceiling areas.
- [ ] Generate stalagmites beneath suitable floor areas.
- [ ] Correlate stalactite and stalagmite formation where appropriate.
- [ ] Generate columns where formations have joined.
- [ ] Vary their height.
- [ ] Vary their thickness.
- [ ] Vary their shape.
- [ ] Cluster formations rather than distributing them uniformly.
- [ ] Avoid placing large stalagmites in mandatory navigation paths.
- [ ] Allow some formations to create natural obstacles.
- [ ] Allow formations to create narrow passageways.
- [ ] Generate wet reflective formations in high-moisture areas.
- [ ] Generate mineral coloration.
- [ ] Allow broken formations.
- [ ] Add dripping-water sources to selected stalactites.
- [ ] Use large stalactite silhouettes to make ceilings feel dangerous and irregular.
- [ ] Cast sharp shadows from stalagmites and stalactites.

# Rock and Mineral Details

- [ ] Generate loose rocks.
- [ ] Generate boulders.
- [ ] Generate rock piles.
- [ ] Generate gravel.
- [ ] Generate cracked walls.
- [ ] Generate fractured rock.
- [ ] Generate mineral veins.
- [ ] Generate ore veins.
- [ ] Generate quartz deposits.
- [ ] Generate crystal clusters.
- [ ] Generate salt formations.
- [ ] Generate unusual mineral discoloration.
- [ ] Generate embedded fossils.
- [ ] Generate geological strata.
- [ ] Generate erosion channels.
- [ ] Generate calcite flowstone.
- [ ] Generate cave curtains or draperies.
- [ ] Generate rimstone formations.
- [ ] Generate mineral-covered pools.
- [ ] Allow geological details to suggest useful resources.

# Cave Obstructions

- [ ] Generate large boulders blocking part of a passage.
- [ ] Generate collapsed rock piles.
- [ ] Generate unstable rubble.
- [ ] Generate fallen stone slabs.
- [ ] Generate narrow squeezes.
- [ ] Generate low ceilings requiring crouching.
- [ ] Generate steep climbs.
- [ ] Generate slick slopes.
- [ ] Generate pits.
- [ ] Generate chasms.
- [ ] Generate deep shafts.
- [ ] Generate broken floors.
- [ ] Generate underground streams.
- [ ] Generate deep-water crossings.
- [ ] Generate waterfalls blocking or obscuring paths.
- [ ] Generate thorny or fungal growth.
- [ ] Generate giant roots breaking through cave walls.
- [ ] Generate webs.
- [ ] Generate bone piles.
- [ ] Generate abandoned barricades.
- [ ] Generate locked gates in artificial sections.
- [ ] Generate collapsed mine supports.
- [ ] Generate broken mine carts blocking rails.
- [ ] Generate fallen timber.
- [ ] Generate old rope bridges.
- [ ] Generate partially broken rope bridges.
- [ ] Generate narrow natural stone bridges.
- [ ] Generate movable obstacles where gameplay supports it.
- [ ] Allow some obstacles to have alternate ways around them.
- [ ] Allow some obstacles to require tools, abilities, or cooperation.

# Chasms and Vertical Space

- [ ] Generate chasms of varying width.
- [ ] Generate chasms of varying visible depth.
- [ ] Use darkness or fog to hide the bottom of very deep chasms.
- [ ] Add falling-rock audio cues.
- [ ] Generate natural bridges over chasms.
- [ ] Generate rope bridges.
- [ ] Generate mine bridges.
- [ ] Generate broken bridges.
- [ ] Generate ledges along chasm walls.
- [ ] Generate ladders.
- [ ] Generate ropes.
- [ ] Generate climbable rock faces.
- [ ] Generate platforms or beams over mine shafts.
- [ ] Allow alternate routes around particularly dangerous crossings.
- [ ] Add visual depth cues so players understand that a drop is dangerous.
- [ ] Let objects thrown into deep chasms produce delayed impact sounds where appropriate.

# Water

- [ ] Generate puddles.
- [ ] Generate shallow pools.
- [ ] Generate deep pools.
- [ ] Generate underground streams.
- [ ] Generate underground rivers.
- [ ] Generate waterfalls.
- [ ] Generate dripping ceilings.
- [ ] Generate wet cave walls.
- [ ] Generate water runoff channels.
- [ ] Generate flooded passages.
- [ ] Generate submerged passages.
- [ ] Allow some pools to provide drinkable water.
- [ ] Determine whether water is safe based on cave conditions.
- [ ] Allow contaminated water in caves with decay, minerals, or pollution.
- [ ] Reflect nearby light sources on cave water.
- [ ] Add ripples when players enter water.
- [ ] Add echoes and stronger ambient dripping near water-heavy chambers.
- [ ] Use flowing water as a navigational clue.
- [ ] Allow underground water to connect logically to overworld streams or springs.
- [ ] Generate mineral formations around long-standing pools.

# Cave Lighting

- [ ] Make caves naturally dark by default.
- [ ] Require the player to provide light in most unlit caves.
- [ ] Support torches.
- [ ] Support lanterns.
- [ ] Support magical lights.
- [ ] Support glowing equipment.
- [ ] Support carried light sources.
- [ ] Support dropped or stationary light sources.
- [ ] Allow torches to be placed on cave walls where appropriate.
- [ ] Generate occasional abandoned torches.
- [ ] Generate currently burning torches only where a plausible inhabitant maintains them.
- [ ] Generate glow worms.
- [ ] Generate glowing fungi.
- [ ] Generate glowing crystals.
- [ ] Generate luminescent pools or minerals in unusual caves.
- [ ] Give different light sources distinct color temperatures.
- [ ] Keep ambient cave illumination extremely low.
- [ ] Use sharp shadows from nearby light sources.
- [ ] Let stalagmites cast long shadows.
- [ ] Let large rock formations strongly block light.
- [ ] Allow moving light sources to create moving shadows.
- [ ] Prevent light from passing unrealistically through cave walls.
- [ ] Reduce visibility rapidly with distance from the light source.
- [ ] Let distant light sources serve as navigation clues.
- [ ] Use light sparingly so naturally illuminated areas feel special.

# Darkness Gameplay

- [ ] Limit visibility when the player lacks a light source.
- [ ] Allow nearby silhouettes to remain barely visible where appropriate.
- [ ] Make navigation dangerous without illumination.
- [ ] Allow some creatures to see better in darkness.
- [ ] Allow character abilities or equipment to modify dark vision.
- [ ] Make bright light potentially reveal the player's location to cave inhabitants.
- [ ] Allow players to extinguish lights intentionally.
- [ ] Make sudden light loss meaningful.
- [ ] Allow wind, water, or attacks to extinguish vulnerable flames.
- [ ] Track remaining fuel for appropriate light sources if survival mechanics support it.
- [ ] Avoid making total darkness frustrating by providing sensible audiovisual clues.

# Shadows

- [ ] Use sharper shadows than typical outdoor environments.
- [ ] Increase shadow contrast close to small point light sources.
- [ ] Cast shadows from stalactites.
- [ ] Cast shadows from stalagmites.
- [ ] Cast shadows from wooden supports.
- [ ] Cast shadows from rail carts and tools.
- [ ] Cast character shadows onto nearby cave surfaces.
- [ ] Allow moving flames to subtly move shadows.
- [ ] Prevent excessive shadow resolution from overwhelming GPU performance.
- [ ] Prioritize high-quality shadows near the player.
- [ ] Reduce shadow complexity for distant cave sections.

# Cave Audio

- [ ] Make caves quieter than outdoor environments.
- [ ] Allow long periods with little or no ambient sound.
- [ ] Generate isolated dripping-water sounds.
- [ ] Position individual drips spatially.
- [ ] Add subtle cave echo to dripping water.
- [ ] Generate occasional distant rock falls.
- [ ] Generate occasional small stones shifting.
- [ ] Generate underground water sounds.
- [ ] Generate distant wind from open shafts or cave entrances.
- [ ] Generate subtle low-frequency cave rumbles.
- [ ] Generate animal or creature sounds where appropriate.
- [ ] Use distant sounds as hints of unexplored chambers.
- [ ] Avoid filling the cave with constant noise.
- [ ] Vary echo according to chamber size.
- [ ] Make narrow tunnels acoustically different from large caverns.
- [ ] Increase reverberation in large chambers.
- [ ] Shorten reverb in cramped passages.
- [ ] Occlude sounds around bends and through rock walls.
- [ ] Allow sounds to travel unusually far through connected tunnels.
- [ ] Allow loud events to produce multiple delayed reflections.
- [ ] Make waterfalls or underground rivers mask quieter sounds nearby.

# Player Sounds Inside Caves

- [ ] Make footsteps especially noticeable because of low ambient noise.
- [ ] Change footstep sound according to cave floor material.
- [ ] Add cave reverberation to footsteps.
- [ ] Change reverb dynamically as the player enters larger chambers.
- [ ] Generate splashes while walking through water.
- [ ] Generate gravel displacement.
- [ ] Generate loose-stone sounds on rocky slopes.
- [ ] Generate wooden footfalls on bridges and mine structures.
- [ ] Generate metallic footsteps on rails or metal platforms.
- [ ] Let armor and equipment echoes become more noticeable underground.
- [ ] Let combat impacts reverberate through large caverns.
- [ ] Let player-generated noise attract nearby creatures where appropriate.

# Cave Music

- [ ] Allow caves to have no music at all.
- [ ] Favor environmental sound over continuous music.
- [ ] Play occasional subdued musical passages.
- [ ] Keep cave music quieter than exploration music outside.
- [ ] Use sparse instrumentation.
- [ ] Use long rests.
- [ ] Avoid constant rhythmic percussion in ordinary caves.
- [ ] Use low drones sparingly.
- [ ] Use distant melodic fragments.
- [ ] Use unusual reverberation to make cave music feel spatial.
- [ ] Allow music to disappear completely for long periods.
- [ ] Introduce music when entering exceptional chambers.
- [ ] Introduce subtle music before major discoveries.
- [ ] Introduce danger motifs when something significant is nearby.
- [ ] Fade music away rather than abruptly stopping it.
- [ ] Give special cave themes unique musical identities without eliminating cave ambience.

# Cave Decoration

- [ ] Generate scattered pebbles.
- [ ] Generate large boulders.
- [ ] Generate broken stalactites.
- [ ] Generate broken stalagmites.
- [ ] Generate mud deposits.
- [ ] Generate moss.
- [ ] Generate cave algae.
- [ ] Generate mushrooms.
- [ ] Generate fungi.
- [ ] Generate glowing fungi.
- [ ] Generate glow worms.
- [ ] Generate roots entering through ceilings.
- [ ] Generate roots growing through walls.
- [ ] Generate dead vegetation near entrances.
- [ ] Generate mineral stains.
- [ ] Generate bones.
- [ ] Generate skeletons.
- [ ] Generate animal remains.
- [ ] Generate abandoned campfires.
- [ ] Generate old campsites.
- [ ] Generate discarded containers.
- [ ] Generate pottery fragments.
- [ ] Generate old ropes.
- [ ] Generate torn cloth.
- [ ] Generate abandoned tools.
- [ ] Generate old torches.
- [ ] Generate crude signs.
- [ ] Generate carvings.
- [ ] Generate graffiti.
- [ ] Generate ancient markings.
- [ ] Generate ritual symbols.
- [ ] Generate abandoned supplies.
- [ ] Generate sacks.
- [ ] Generate barrels.
- [ ] Generate crates.
- [ ] Generate benches.
- [ ] Generate tables in inhabited caves.
- [ ] Generate improvised bedding.
- [ ] Generate cages.
- [ ] Generate traps.
- [ ] Generate hanging chains.
- [ ] Generate old ladders.
- [ ] Generate rope coils.
- [ ] Generate buckets.
- [ ] Generate broken equipment.
- [ ] Keep decoration consistent with the history and theme of each cave.

# Mine Shaft Generation

## Mine Identity

- [ ] Generate mines as a distinct cave subtype.
- [ ] Give mines a strong single primary entrance bias.
- [ ] Allow mines to extend into naturally occurring caves.
- [ ] Allow natural cave systems to have been enlarged by miners.
- [ ] Generate an ore or resource that originally motivated construction of the mine.
- [ ] Generate mine age.
- [ ] Generate active, abandoned, collapsed, or exhausted mine states.
- [ ] Generate evidence explaining why a mine was abandoned.
- [ ] Allow mines to contain newer repairs over older structures.
- [ ] Allow multiple eras of mining inside particularly old mines.

## Mine Layout

- [ ] Make mine tunnels noticeably straighter than natural cave passages.
- [ ] Generate branching excavation tunnels.
- [ ] Generate main haulage tunnels.
- [ ] Generate side shafts.
- [ ] Generate dead-end prospecting tunnels.
- [ ] Generate vertical mine shafts.
- [ ] Generate ramps.
- [ ] Generate ladder shafts.
- [ ] Generate mining chambers.
- [ ] Generate ore extraction rooms.
- [ ] Generate equipment storage areas.
- [ ] Generate worker rest areas.
- [ ] Generate loading areas.
- [ ] Generate collapsed tunnel sections.
- [ ] Allow abandoned mines to reconnect with natural cave systems.

# Mine Rails

- [ ] Generate rail tracks along major mine routes.
- [ ] Generate straight rail sections.
- [ ] Generate curved rail sections.
- [ ] Generate rail junctions.
- [ ] Generate dead-end rails.
- [ ] Generate broken rails.
- [ ] Generate missing rail segments.
- [ ] Generate switches.
- [ ] Generate track stops.
- [ ] Generate rail bridges.
- [ ] Generate tracks running beside chasms.
- [ ] Generate partially buried tracks.
- [ ] Generate overturned mine carts.
- [ ] Generate abandoned loaded mine carts.
- [ ] Generate empty mine carts.
- [ ] Allow operational carts to be ridden.
- [ ] Allow carts to roll downhill.
- [ ] Allow carts to follow procedural rail paths.
- [ ] Allow switches to change cart routes.
- [ ] Generate cart brakes or stopping mechanisms.
- [ ] Generate rail-based shortcuts.
- [ ] Make cart rides risky in damaged mines.
- [ ] Generate rail sound appropriate to speed and track condition.

# Mine Timber Structures

- [ ] Generate wooden support beams.
- [ ] Generate vertical posts.
- [ ] Generate horizontal crossbeams.
- [ ] Generate diagonal braces.
- [ ] Generate reinforced tunnel entrances.
- [ ] Generate support structures according to tunnel width.
- [ ] Avoid placing supports uniformly.
- [ ] Generate older crooked supports.
- [ ] Generate cracked supports.
- [ ] Generate broken supports.
- [ ] Generate missing supports in unstable areas.
- [ ] Generate timber retaining walls.
- [ ] Generate wooden walkways.
- [ ] Generate platforms.
- [ ] Generate scaffolding.
- [ ] Generate ladders.
- [ ] Generate rope hoists.
- [ ] Generate pulleys.
- [ ] Generate elevators or cages in deep mines.
- [ ] Generate timber debris around collapses.
- [ ] Allow damaged supports to indicate dangerous areas.

# Mining Props

- [ ] Generate pickaxes.
- [ ] Generate shovels.
- [ ] Generate hammers.
- [ ] Generate wedges.
- [ ] Generate lanterns.
- [ ] Generate helmets.
- [ ] Generate rope coils.
- [ ] Generate buckets.
- [ ] Generate ore sacks.
- [ ] Generate ore piles.
- [ ] Generate hand carts.
- [ ] Generate wheelbarrows.
- [ ] Generate mine carts.
- [ ] Generate rails.
- [ ] Generate spare track pieces.
- [ ] Generate timber stacks.
- [ ] Generate workbenches.
- [ ] Generate tool racks.
- [ ] Generate broken tools.
- [ ] Generate crates of supplies.
- [ ] Generate food containers.
- [ ] Generate water barrels.
- [ ] Generate dynamite-like mining supplies only if appropriate to the game's technological era.
- [ ] Generate abandoned maps.
- [ ] Generate work records.
- [ ] Generate warning signs.
- [ ] Generate claim markings.
- [ ] Generate numbered tunnel markers.

# Rope Bridges and Constructed Crossings

- [ ] Generate rope bridges across suitable chasms.
- [ ] Vary bridge width.
- [ ] Vary bridge length.
- [ ] Generate missing planks.
- [ ] Generate broken ropes.
- [ ] Generate sagging bridges.
- [ ] Generate partially collapsed bridges.
- [ ] Make bridges sway visually in 3D.
- [ ] Generate creaking audio while crossing.
- [ ] Let bridge condition affect movement speed.
- [ ] Allow damaged bridges to fail under specific conditions if appropriate.
- [ ] Generate repaired bridges.
- [ ] Generate simple plank bridges.
- [ ] Generate mine-cart rail bridges.
- [ ] Generate stone bridges in ancient cave complexes.
- [ ] Keep every mandatory route traversable unless the cave is intentionally gated.

# Cave Creatures and Ecology

- [ ] Generate bats near suitable ceilings.
- [ ] Generate insects.
- [ ] Generate cave fish.
- [ ] Generate amphibians.
- [ ] Generate spiders.
- [ ] Generate cave-adapted creatures.
- [ ] Generate predators based on available prey.
- [ ] Generate nesting areas.
- [ ] Generate feeding areas.
- [ ] Generate sleeping areas.
- [ ] Generate droppings and biological evidence.
- [ ] Generate tracks.
- [ ] Generate webs.
- [ ] Generate eggs.
- [ ] Generate abandoned nests.
- [ ] Avoid distributing creatures uniformly.
- [ ] Let creatures favor areas with water, food, darkness, or shelter.
- [ ] Let creature sounds travel through tunnels before creatures are visible.
- [ ] Allow player-generated noise and light to disturb wildlife.

# Human and Monster Occupation

- [ ] Generate camps.
- [ ] Generate guard positions.
- [ ] Generate storage areas.
- [ ] Generate sleeping areas.
- [ ] Generate cooking areas.
- [ ] Generate defensive barricades.
- [ ] Generate traps around inhabited cave sections.
- [ ] Generate crude furniture.
- [ ] Generate discarded belongings.
- [ ] Generate waste areas.
- [ ] Generate evidence of previous inhabitants.
- [ ] Allow newer occupants to reuse older cave structures.
- [ ] Create territory boundaries between different creature groups.
- [ ] Generate signs of conflict between cave occupants.
- [ ] Allow cave inhabitants to modify natural pathways.

# Discoveries and Secrets

- [ ] Generate hidden chambers.
- [ ] Generate concealed passages behind loose rock.
- [ ] Generate passages behind waterfalls.
- [ ] Generate small openings visible only from certain angles.
- [ ] Generate hidden climbing routes.
- [ ] Generate buried doors in ancient cave sections.
- [ ] Generate forgotten mine side passages.
- [ ] Generate abandoned caches.
- [ ] Generate treasure behind dangerous crossings.
- [ ] Generate archaeological discoveries.
- [ ] Generate unusual geological discoveries.
- [ ] Generate rare minerals.
- [ ] Generate fossils.
- [ ] Generate ancient carvings.
- [ ] Generate abandoned journals or maps.
- [ ] Generate shortcuts that connect previously explored regions.
- [ ] Reward careful exploration rather than simply following the main tunnel.

# Cave Hazards

- [ ] Generate unstable rock.
- [ ] Generate falling-rock hazards.
- [ ] Generate unstable floors.
- [ ] Generate deep pits.
- [ ] Generate dangerous chasms.
- [ ] Generate slippery slopes.
- [ ] Generate dangerous water currents.
- [ ] Generate deep water.
- [ ] Generate toxic water where appropriate.
- [ ] Generate poisonous fungi.
- [ ] Generate spores.
- [ ] Generate hazardous gases.
- [ ] Generate extreme heat.
- [ ] Generate extreme cold.
- [ ] Generate lava in volcanic caves.
- [ ] Generate weak mine supports.
- [ ] Generate damaged rope bridges.
- [ ] Generate mine-cart hazards.
- [ ] Generate creature ambush locations.
- [ ] Telegraph hazards visually or audibly before they become unfair.
- [ ] Allow equipment or abilities to reduce certain cave hazards.

# Cave Navigation

- [ ] Avoid making every cave a simple linear path.
- [ ] Keep enough landmarks that players can orient themselves.
- [ ] Generate visually distinctive chambers.
- [ ] Use water flow as a navigation clue.
- [ ] Use rails as navigation clues in mines.
- [ ] Use airflow as a clue toward possible exits.
- [ ] Use distant light as a clue.
- [ ] Use sound as a clue.
- [ ] Generate occasional recognizable formations.
- [ ] Allow player maps to record explored passages.
- [ ] Keep undiscovered passages hidden on maps.
- [ ] Allow cave maps to show elevation changes.
- [ ] Distinguish explored dead ends from unexplored forks.
- [ ] Avoid an excessive number of indistinguishable branching corridors.
- [ ] Make large caves complex without becoming frustrating mazes.

# Cave Progression

- [ ] Increase cave complexity with depth.
- [ ] Increase darkness with distance from entrances.
- [ ] Reduce natural outside sounds with depth.
- [ ] Increase unusual geology deeper underground.
- [ ] Increase traversal difficulty with depth.
- [ ] Increase likelihood of rare resources with depth.
- [ ] Increase likelihood of dangerous creatures with depth where appropriate.
- [ ] Introduce larger caverns after narrow passages for dramatic contrast.
- [ ] Create occasional safe or quiet chambers.
- [ ] Generate memorable destination chambers.
- [ ] Make deep cave regions feel distinctly removed from the surface.

# Procedural Cave Events

- [ ] Generate occasional small rock falls.
- [ ] Generate distant collapses.
- [ ] Generate bats suddenly leaving a chamber.
- [ ] Generate torch extinguishing events.
- [ ] Generate water-level changes where appropriate.
- [ ] Generate loose rocks falling into nearby chasms.
- [ ] Generate mine carts unexpectedly rolling on sloped tracks.
- [ ] Generate creature calls from unseen passages.
- [ ] Generate distant footsteps where inhabitants exist.
- [ ] Generate temporary cave echoes after loud events.
- [ ] Keep random cave events infrequent enough to remain meaningful.

# Rendering Performance

- [ ] Divide caves into chunks or sectors.
- [ ] Render only nearby cave sectors.
- [ ] Cull sectors hidden behind cave walls.
- [ ] Use portal or room-based visibility where helpful.
- [ ] Use low-poly distant formations.
- [ ] Instance repeated rocks.
- [ ] Instance stalagmites and stalactites where possible.
- [ ] Instance mine supports.
- [ ] Instance rails.
- [ ] Reuse cave materials.
- [ ] Limit dynamic lights.
- [ ] Limit shadow-casting lights.
- [ ] Make the player's primary light source the highest-priority shadow light.
- [ ] Disable shadows for distant decorative objects.
- [ ] Use simplified collision geometry.
- [ ] Avoid generating inaccessible geometry unnecessarily.
- [ ] Cache generated cave chunks.
- [ ] Keep cave generation deterministic so chunks can be recreated instead of permanently stored when appropriate.

# Cave System Architecture

One approach I think would work particularly well is to make the **logical cave independent of the renderer**:

```ts
interface Cave {
  seed: number;
  theme: CaveTheme;
  geology: CaveGeology;
  regions: CaveRegion[];
  connections: CaveConnection[];
  entrances: CaveEntrance[];
}
```

Then regions can describe something like:

```ts
interface CaveRegion {
  type: 'tunnel' | 'cavern' | 'shaft' | 'chasm' | 'mine' | 'water' | 'ruin';

  moisture: number;
  elevation: number;
  light: number;
  danger: number;

  obstacles: CaveObstacle[];
  decorations: CaveDecoration[];
}
```

That logical representation could then feed all three renderers:

```text
                    Cave Seed
                        ↓
                 Cave Generator
                        ↓
                Logical Cave Map
                  /      |       \
                 /       |        \
              Text      2D        3D
               ↓         ↓         ↓
            symbols    sprites   models
```

The other architectural distinction I'd preserve is between **geometry and dressing**:

```text
Topology
   ↓
floor / tunnels / chambers / exits
   ↓
Traversal validation
   ↓
Geology
   ↓
water / chasms / formations
   ↓
Theme
   ↓
mine / crystal / fungal / ancient
   ↓
Structures
   ↓
bridges / supports / rails
   ↓
Decoration
   ↓
rocks / tools / bones / moss
   ↓
Lighting + audio + inhabitants
```

That ordering is important. You don't want a randomly generated stalagmite, mine cart, pool, or decorative boulder to invalidate the only viable path through the cave.

And for making it feel **organic**, I'd enforce one overarching rule: natural cave geometry should come from geological structure first, while artificial structures should look like someone tried to impose order on that structure. A mine tunnel can be straight, supported by evenly spaced timber, and covered with rails—but then break through into a giant irregular cavern where the rails bend around boulders, supports become sparse, water drips from a 30-foot ceiling, and everything suddenly feels natural again. That contrast would make both environments much more convincing.
