# Lighthouse

Here’s a focused lighthouse checklist that covers the current visual bugs, day/night behavior, wildlife, audio, POI activity, and some gameplay hooks.

## Lighthouse Beam Fixes

* [X] Reverse the light cone so the wide end points away from the lighthouse.
* [X] Align the beam origin with the lantern room at the top of the tower.
* [X] Make the beam narrowest at the lighthouse lens.
* [X] Increase beam width gradually with distance.
* [X] Fade beam opacity toward zero with distance.
* [X] Fade beam intensity near the far end.
* [X] Prevent the beam mesh from casting shadows.
* [X] Prevent the beam mesh from receiving shadows if visually unnecessary.
* [X] Use an emissive material for the visible beam.
* [X] Keep the beam independent from the actual scene-light shadow system.
* [ ] Add bloom to the emissive beam.
* [ ] Make bloom visible from several tiles away.
* [ ] Reduce bloom intensity at close range if it overwhelms the scene.
* [ ] Add slight volumetric haze inside the beam.
* [ ] Fade the beam edges to avoid a hard cone boundary.
* [ ] Add subtle noise to break up a perfectly uniform cone.
* [ ] Avoid visible geometry seams where the beam starts.
* [ ] Clip or hide the beam inside the lighthouse structure.
* [ ] Prevent the beam from appearing through solid lighthouse walls.
* [X] Make beam color configurable by lighthouse type or region.

## Lighthouse Rotation

* [X] Rotate the beam continuously around the lighthouse.
* [X] Make rotation speed configurable.
* [X] Keep rotation speed stable regardless of frame rate.
* [X] Allow some lighthouse types to rotate in the opposite direction.
* [ ] Allow damaged lighthouses to rotate irregularly.
* [ ] Allow abandoned lighthouses to stop rotating.
* [ ] Allow manually operated lighthouses to require activation.
* [X] Avoid rebuilding beam geometry during rotation.
* [X] Rotate only the beam transform or light direction.
* [X] Keep distant beam animation inexpensive.

## Sunset and Sunrise Behavior

* [X] Turn the lighthouse beam on at sunset.
* [X] Turn the lighthouse beam off at sunrise.
* [X] Use the world timekeeper rather than fixed clock hours.
* [X] Respect seasonal changes in sunrise and sunset.
* [X] Fade the light in gradually after sunset.
* [X] Fade the light out gradually near sunrise.
* [X] Avoid abrupt beam popping at the day/night boundary.
* [ ] Allow storms or heavy fog to activate the light early.
* [ ] Allow darkness thresholds to override simple time rules.
* [ ] Keep abandoned lighthouses dark unless restored.
* [ ] Allow damaged lamps to flicker or fail.
* [ ] Persist lighthouse operational state.

## Actual Scene Lighting

* [ ] Use a real spotlight only where it improves nearby illumination.
* [ ] Keep spotlight range shorter than the visible beam mesh if needed.
* [ ] Avoid an enormous shadow-casting spotlight across many tiles.
* [ ] Disable spotlight shadows by default.
* [ ] Enable shadows only for nearby hero-quality lighthouse scenes.
* [ ] Limit shadow-map updates while the beam rotates.
* [ ] Use emissive beam visuals for distant lighthouse visibility.
* [ ] Use a simpler distant-light representation at lower LOD.
* [ ] Avoid one expensive dynamic light per distant lighthouse.

## Beam LOD

* [ ] Create a high-detail beam for nearby viewing.
* [ ] Create a simpler beam for medium distance.
* [ ] Use an emissive billboard or simplified cone at long distance.
* [ ] Disable volumetric noise at distant LODs.
* [ ] Reduce beam geometry segments with distance.
* [ ] Keep the rotating light visible farther than tower detail.
* [ ] Preserve lighthouse identity at extreme distance.
* [ ] Avoid generating full tower internals for distant lighthouses.

## Lens and Lantern Room

* [X] Add a bright emissive lens source.
* [X] Add a visible lantern-room glow at night.
* [X] Add glass around the lantern room.
* [X] Add metal framework around the glass.
* [ ] Add lens rotation if visually appropriate.
* [ ] Add subtle internal reflections.
* [ ] Add a warm glow on nearby tower surfaces.
* [ ] Add maintenance access around the lantern room.
* [ ] Add a balcony around the top where appropriate.
* [X] Let the lantern remain visible when the beam points away.

## Fog and Weather Interaction

* [ ] Increase beam visibility in fog.
* [ ] Reduce beam visibility in perfectly clear daytime conditions.
* [ ] Add stronger volumetric scattering in mist.
* [ ] Let rain slightly soften the beam.
* [ ] Let heavy storms reduce long-distance beam visibility.
* [ ] Increase lighthouse operational importance during storms.
* [ ] Add wind effects around the upper tower.
* [ ] Add rain sounds against windows and metalwork.
* [ ] Add occasional lightning illumination during storms.

## Seagull Spawning

* [ ] Spawn seagulls around coastal lighthouses.
* [ ] Allow seagulls during daylight.
* [ ] Reduce seagull activity at night.
* [ ] Increase gull activity near docks and fishing areas.
* [ ] Avoid spawning gulls around inland lighthouse variants.
* [ ] Give gull groups deterministic spawn seeds.
* [ ] Cap gull count by lighthouse and LOD.
* [ ] Avoid spawning all gulls at once.
* [ ] Spawn gulls from outside the visible area.
* [ ] Despawn gulls after they travel far enough away.

## Seagull Flight Behavior

* [ ] Let gulls circle the lighthouse.
* [ ] Let gulls fly toward the lighthouse.
* [ ] Let gulls fly away from the lighthouse.
* [ ] Let gulls cross the player's view occasionally.
* [ ] Let gulls perch on railings and roofs.
* [ ] Let gulls leave perches and resume flight.
* [ ] Give each gull a slightly different flight radius.
* [ ] Give gulls different flight heights.
* [ ] Add occasional gliding.
* [ ] Add occasional flapping.
* [ ] Avoid synchronized flight cycles.
* [ ] Use curved flight paths rather than straight lines.
* [ ] Let wind affect gull movement slightly.
* [ ] Let gulls avoid flying through the tower.

## Seagull Fade and LOD

* [ ] Fade gulls in before entering normal visibility range.
* [ ] Fade gulls out as they fly beyond visibility range.
* [ ] Avoid sudden gull spawning in front of the player.
* [ ] Reduce gull animation detail at distance.
* [ ] Use lower-poly gull models at medium distance.
* [ ] Use sprites or tiny silhouettes at long distance.
* [ ] Disable individual gull shadows at distance.
* [ ] Stop detailed gull AI when far away.
* [ ] Remove gull audio when beyond audible range.

## Seagull Audio

* [ ] Add positional seagull calls.
* [ ] Give gulls multiple call variations.
* [ ] Randomize call timing.
* [ ] Avoid every gull calling continuously.
* [ ] Reduce call volume with distance.
* [ ] Increase gull ambience near colonies.
* [ ] Add wing-flap sounds only when close enough.
* [ ] Add landing and takeoff sounds where useful.
* [ ] Aggregate distant gulls into ambient coastal audio.
* [ ] Reduce gull audio at night.

## Coastal Ambience

* [ ] Add ocean-wave ambience around lighthouse POIs.
* [ ] Add wind ambience.
* [ ] Add stronger wind near cliffs.
* [ ] Add distant gull ambience.
* [ ] Add dock or buoy sounds where appropriate.
* [ ] Add rope and rigging creaks.
* [ ] Add bell or foghorn sounds to some lighthouse types.
* [ ] Add rain and storm ambience when appropriate.
* [ ] Use spatial audio for nearby waves and structures.

## Lighthouse Interior

* [ ] Allow players to enter the lighthouse.
* [ ] Add a ground-floor entrance.
* [ ] Add a spiral staircase or ladder system.
* [ ] Add intermediate floors.
* [ ] Add keeper living quarters.
* [ ] Add storage rooms.
* [ ] Add maintenance areas.
* [ ] Add lantern-room access.
* [ ] Allow players to reach the upper balcony.
* [ ] Add windows with coastal views.
* [ ] Add interior lighting appropriate to time of day.

## Lighthouse Keeper NPC

* [ ] Spawn a lighthouse keeper at operational lighthouses.
* [ ] Give the keeper a daily schedule.
* [ ] Let the keeper maintain the lamp.
* [ ] Let the keeper inspect the lens.
* [ ] Let the keeper clean windows.
* [ ] Let the keeper refuel or repair equipment.
* [ ] Let the keeper sleep during appropriate hours.
* [ ] Let the keeper walk around the lighthouse grounds.
* [ ] Let the keeper react to storms.
* [ ] Let the keeper greet visiting players.
* [ ] Give the keeper local coastal gossip.
* [ ] Let the keeper discuss ship activity.
* [ ] Let the keeper offer quests.

## Other NPCs

* [ ] Allow an assistant lighthouse keeper.
* [ ] Allow visiting sailors.
* [ ] Allow fishermen.
* [ ] Allow merchants delivering supplies.
* [ ] Allow coast guards or harbor officials.
* [ ] Allow scholars studying weather or navigation.
* [ ] Allow smugglers at abandoned lighthouses.
* [ ] Allow bandits to occupy ruined lighthouses.
* [ ] Allow ghosts or supernatural occupants in special variants.
* [ ] Allow quest-specific NPC visitors.

## Keeper Activities

* [ ] Carry oil or fuel supplies.
* [ ] Polish the lens.
* [ ] Repair mechanisms.
* [ ] Check weather instruments.
* [ ] Record ship sightings.
* [ ] Write in a lighthouse logbook.
* [ ] Watch ships from the balcony.
* [ ] Signal ships.
* [ ] Feed or chase away gulls.
* [ ] Inspect storm damage.
* [ ] Sleep or rest between duties.

## Lighthouse Equipment

* [ ] Add Fresnel-lens style visual details if appropriate.
* [ ] Add lamp machinery.
* [ ] Add rotation mechanisms.
* [ ] Add gears.
* [ ] Add counterweights.
* [ ] Add fuel storage.
* [ ] Add maintenance tools.
* [ ] Add ropes.
* [ ] Add signal flags.
* [ ] Add telescopes.
* [ ] Add binoculars.
* [ ] Add maps and nautical charts.
* [ ] Add weather instruments.
* [ ] Add logbooks.
* [ ] Add spare lamp parts.

## Navigation Gameplay

* [ ] Let lighthouse beams identify coastlines at night.
* [ ] Let sailors use lighthouses as navigation landmarks.
* [ ] Give different lighthouse patterns recognizable identities.
* [ ] Allow different rotation rates or flash patterns.
* [ ] Let maps record discovered lighthouse locations.
* [ ] Let players navigate boats using lighthouse bearings.
* [ ] Let lighthouse visibility depend on weather.
* [ ] Let distant beams hint at undiscovered coastal settlements.
* [ ] Use lighthouse bearings in navigation quests.

## Lighthouse Signal Patterns

* [ ] Give each major lighthouse a unique flash pattern.
* [ ] Support rotating continuous beams.
* [ ] Support periodic flashes.
* [ ] Support multiple flashes followed by darkness.
* [ ] Support differently colored signals where appropriate.
* [ ] Store signal pattern as part of lighthouse identity.
* [ ] Let sailors recognize locations from signal patterns.
* [ ] Add signal-pattern information to charts or books.

## Lighthouse Operation Gameplay

* [ ] Allow the lamp to become damaged.
* [ ] Allow the rotation mechanism to fail.
* [ ] Allow fuel to run low where appropriate.
* [ ] Allow storms to damage equipment.
* [ ] Allow players to repair the lighthouse.
* [ ] Allow players to relight an abandoned lighthouse.
* [ ] Allow players to restart the rotation mechanism.
* [ ] Allow players to clean or repair the lens.
* [ ] Allow players to deliver replacement parts.
* [ ] Allow restored lighthouses to affect nearby navigation.

## Quest Ideas

* [ ] Deliver fuel before nightfall.
* [ ] Repair a broken lighthouse mechanism.
* [ ] Replace a damaged lens.
* [ ] Find a missing lighthouse keeper.
* [ ] Investigate why the lighthouse went dark.
* [ ] Defend the lighthouse during a storm.
* [ ] Rescue sailors after a shipwreck.
* [ ] Locate a ship using lighthouse sightings.
* [ ] Carry a message between lighthouse keepers.
* [ ] Investigate strange lights offshore.
* [ ] Recover stolen lighthouse equipment.
* [ ] Remove monsters occupying an abandoned lighthouse.
* [ ] Solve a signal-code puzzle.
* [ ] Decode a keeper's logbook.
* [ ] Discover a hidden room beneath the lighthouse.
* [ ] Investigate ghost sightings.
* [ ] Track smugglers using lighthouse signals.
* [ ] Prevent criminals from sending false signals.

## Shipwreck Gameplay

* [ ] Increase shipwreck risk when a lighthouse is disabled.
* [ ] Generate wreckage after severe coastal storms.
* [ ] Allow lighthouse restoration to reduce local shipwreck events.
* [ ] Let keepers report recent wrecks.
* [ ] Generate rescue quests from nearby wrecks.
* [ ] Allow salvaging wreckage.
* [ ] Add survivor NPCs.
* [ ] Add cargo recovery quests.
* [ ] Add moral choices around salvage ownership.

## Smuggling Gameplay

* [ ] Allow abandoned lighthouses to become smuggler bases.
* [ ] Allow smugglers to alter signal patterns.
* [ ] Allow false lighthouse signals.
* [ ] Let players discover coded nighttime flashes.
* [ ] Add hidden storage under lighthouse structures.
* [ ] Add secret docks or caves nearby.
* [ ] Add patrols around suspected smuggling areas.
* [ ] Allow players to assist or expose smugglers.

## Exploration Rewards

* [ ] Reward reaching the top of the lighthouse.
* [ ] Add panoramic map-reveal bonuses.
* [ ] Reveal nearby POIs from the balcony.
* [ ] Reveal nearby ship locations.
* [ ] Reveal islands or coastal caves.
* [ ] Add collectible logbooks.
* [ ] Add historical plaques or carvings.
* [ ] Add hidden caches.
* [ ] Add unique nautical equipment.
* [ ] Add rare telescope observations.

## Lighthouse History

* [ ] Generate lighthouse age.
* [ ] Generate construction era.
* [ ] Generate builder or sponsoring faction.
* [ ] Generate operational status.
* [ ] Generate keeper history.
* [ ] Generate famous shipwreck history.
* [ ] Generate storm damage history.
* [ ] Generate previous repairs.
* [ ] Generate local legends.
* [ ] Generate memorials for lost sailors.
* [ ] Use history to drive quests and decorations.

## Lighthouse States

* [ ] Operational.
* [ ] Unstaffed.
* [ ] Abandoned.
* [ ] Damaged.
* [ ] Ruined.
* [ ] Under repair.
* [ ] Light extinguished.
* [ ] Rotation mechanism broken.
* [ ] Occupied by enemies.
* [ ] Used by smugglers.
* [ ] Haunted.
* [ ] Restored by players.

## Day/Night Visual Changes

* [ ] Hide the visible beam during daylight.
* [ ] Keep glass/lens reflections visible during daylight.
* [ ] Increase gull activity during daylight.
* [ ] Show keeper maintenance activity during daylight.
* [ ] Illuminate interior windows after sunset.
* [ ] Activate beam bloom at night.
* [ ] Reduce exterior NPC activity late at night.
* [ ] Keep storm-related lighthouse activity possible at any hour.

## POI Interaction

* [ ] Allow the lighthouse to be discovered as a POI.
* [ ] Add it to the player's map after discovery.
* [ ] Allow fast-travel use if game rules permit it.
* [ ] Allow lighthouse inspection.
* [ ] Allow interaction with the keeper.
* [ ] Allow access to navigation equipment.
* [ ] Allow reading logbooks.
* [ ] Allow climbing to the top.
* [ ] Allow repairing damaged components.
* [ ] Allow interacting with the lamp mechanism.

## Lighthouse Plugin Architecture

* [ ] Keep generic lighthouse behavior in a base lighthouse plugin.
* [ ] Let lighthouse variants override tower models.
* [ ] Let variants override beam appearance.
* [ ] Let variants override signal patterns.
* [ ] Let variants override keeper behavior.
* [ ] Let variants override quest tables.
* [ ] Let variants override weather rules.
* [ ] Let variants override gull species or wildlife.
* [ ] Let variants override interior layouts.
* [ ] Let variants override operational mechanics.
* [ ] Let old lighthouse plugins use sensible defaults.
* [ ] Expose capabilities through `supports()`.

## Debugging

* [ ] Add a force-fog option.
* [ ] Add a beam-direction debug arrow.
* [ ] Show beam origin and target.
* [ ] Show beam cone bounds.
* [ ] Show current beam opacity.
* [ ] Show current beam rotation angle.
* [ ] Show current lighthouse operational state.
* [ ] Show gull spawn and despawn radii.
* [ ] Show active gull count.
* [ ] Show current lighthouse LOD.
* [ ] Show light and shadow counts.
* [ ] Show beam draw-call and triangle cost.

## Performance

* [ ] Do not let the visible beam cast shadows.
* [ ] Use one shared emissive beam material where possible.
* [ ] Avoid rebuilding beam geometry every frame.
* [ ] Rotate transforms instead of recreating models.
* [ ] Cap active gull count.
* [ ] Use low-detail gulls at distance.
* [ ] Disable gull shadows at medium and long range.
* [ ] Aggregate distant gull sounds.
* [ ] Disable detailed keeper AI outside active range.
* [ ] Cull lighthouse interiors while outside.
* [ ] Cull exterior detail while deep inside.
* [ ] Keep distant lighthouse beams cheaper than nearby beams.
* [ ] Respect the existing model and LOD resource budgets.

The beam itself is probably best treated as **two separate effects**: a cheap rotating
emissive/transparent cone that gives you the visible shaft and bloom, plus a much
shorter real `SpotLight` only if nearby objects actually need illumination. That
avoids trying to make one expensive shadow-capable light serve both visual and
lighting purposes.
