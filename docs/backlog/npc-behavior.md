## Core NPC Behavior Architecture

- [ ] Create a common `NpcBehaviorPlugin` interface.
- [ ] Give each behavior plugin a stable unique ID.
- [ ] Give each behavior plugin a display name.
- [ ] Give each behavior plugin a short description.
- [ ] Allow each NPC to own multiple behavior plugins.
- [ ] Allow behaviors to be added or removed at runtime.
- [ ] Allow behaviors to be enabled or disabled.
- [ ] Allow behaviors to define their own configuration.
- [ ] Allow behaviors to expose capabilities through `supports()`.
- [ ] Keep older behavior plugins valid as features are added.
- [ ] Allow behavior plugins to inherit from other behaviors.
- [ ] Allow behavior plugins to wrap or extend another behavior.
- [ ] Allow species plugins to provide default behaviors.
- [ ] Allow profession plugins to provide default behaviors.
- [ ] Allow faction plugins to provide default behaviors.
- [ ] Allow quests to temporarily add NPC behaviors.
- [ ] Allow equipment or status effects to add behaviors.
- [ ] Allow behaviors to be saved with persistent NPC state.
- [ ] Allow temporary behaviors to expire automatically.

## Behavior Priority Stack

- [ ] Give every NPC an ordered behavior stack.
- [ ] Evaluate higher-priority behaviors before lower ones.
- [ ] Let a behavior declare when it is applicable.
- [ ] Skip behaviors whose conditions are not currently met.
- [ ] Let a behavior stay active while its motivation remains valid.
- [ ] Resume lower-priority behavior after urgent behavior ends.
- [ ] Allow a behavior to interrupt a lower-priority behavior.
- [ ] Allow some behaviors to be marked non-interruptible.
- [ ] Allow emergency behaviors to override normal priorities.
- [ ] Allow priorities to change dynamically.
- [ ] Allow quest behaviors to temporarily gain priority.
- [ ] Allow combat behaviors to override social behaviors.
- [ ] Allow survival behaviors to override work behaviors.
- [ ] Show the current active behavior in debug mode.
- [ ] Show why a behavior became active in debug mode.
- [ ] Show why a behavior stopped in debug mode.

## Motivation System

- [ ] Define a common motivation interface.
- [ ] Let motivations return a current urgency score.
- [ ] Let motivations expire when their condition disappears.
- [ ] Support health-based motivations.
- [ ] Support hunger-based motivations.
- [ ] Support thirst-based motivations.
- [ ] Support fatigue-based motivations.
- [ ] Support fear-based motivations.
- [ ] Support aggression-based motivations.
- [ ] Support duty-based motivations.
- [ ] Support friendship-based motivations.
- [ ] Support family-based motivations.
- [ ] Support profession-based motivations.
- [ ] Support quest-based motivations.
- [ ] Support curiosity-based motivations.
- [ ] Support greed-based motivations.
- [ ] Support loyalty-based motivations.
- [ ] Support reputation-based motivations.
- [ ] Support faction-based motivations.
- [ ] Let multiple motivations influence one behavior.
- [ ] Let one motivation activate several possible behaviors.

## Generator-Based Work

- [ ] Allow behaviors to execute as JavaScript generators.
- [ ] Let behaviors yield after small units of work.
- [ ] Resume unfinished behavior generators on later frames.
- [ ] Give NPC behavior work a per-frame CPU budget.
- [ ] Stop behavior work when the scheduler budget is exhausted.
- [ ] Resume queued behaviors on later frames.
- [ ] Allow behaviors to yield progress data.
- [ ] Allow behaviors to yield movement requests.
- [ ] Allow behaviors to yield animation requests.
- [ ] Allow behaviors to yield interaction requests.
- [ ] Allow behaviors to yield pathfinding jobs.
- [ ] Allow behaviors to yield dialogue actions.
- [ ] Allow long pathfinding work to yield periodically.
- [ ] Allow behavior generators to be cancelled.
- [ ] Cancel generators when their motivation disappears.
- [ ] Prevent abandoned generators from retaining NPC references.
- [ ] Track generator CPU time by behavior plugin.
- [ ] Warn when a behavior goes too long without yielding.

## Central NPC Scheduler

- [ ] Create one scheduler for all NPC behavior work.
- [ ] Limit NPC behavior CPU time per animation frame.
- [ ] Prioritize visible and nearby NPCs.
- [ ] Reduce update frequency for distant NPCs.
- [ ] Suspend detailed behavior for dormant NPCs.
- [ ] Spread NPC updates across different frames.
- [ ] Avoid updating every NPC on the same frame.
- [ ] Resume dormant NPCs when players approach.
- [ ] Cancel behavior work for unloaded NPCs.
- [ ] Track pending behavior jobs.
- [ ] Track behavior jobs completed per second.
- [ ] Track average behavior execution time.
- [ ] Track worst behavior execution time.

## Behavior Selection

- [ ] Allow a behavior to provide multiple valid actions.
- [ ] Allow weighted random selection between valid actions.
- [ ] Let personality modify action weights.
- [ ] Let current mood modify action weights.
- [ ] Let relationships modify action weights.
- [ ] Let time of day modify action weights.
- [ ] Let weather modify action weights.
- [ ] Let nearby activity modify action weights.
- [ ] Prevent random choices from violating hard priorities.
- [ ] Use deterministic randomness where reproducibility matters.
- [ ] Avoid repeating the same random choice constantly.
- [ ] Track recent choices to improve variety.

## Following Behaviors

- [ ] Follow a specific player.
- [ ] Follow the nearest player.
- [ ] Follow the party leader.
- [ ] Follow a specific NPC.
- [ ] Follow the nearest friendly NPC.
- [ ] Follow a family member.
- [ ] Follow an escort target.
- [ ] Follow at a configurable distance.
- [ ] Maintain formation position while following.
- [ ] Avoid bumping into followed characters.
- [ ] Slow down when too close.
- [ ] Speed up when falling behind.
- [ ] Teleport only as a last-resort unstuck rule.
- [ ] Stop following when the motivation expires.

## Escort Behaviors

- [ ] Follow the assigned escort leader.
- [ ] Stay within a safe escort radius.
- [ ] Stop and wait if separated.
- [ ] Call for help when attacked.
- [ ] Flee when severely threatened if appropriate.
- [ ] Fight alongside escorts when capable.
- [ ] Avoid rushing ahead of the party.
- [ ] Resume the route after combat.
- [ ] Detect arrival at the escort destination.
- [ ] Fail or alter the quest if escort conditions break.

## Combat Target Selection

- [ ] Attack the nearest hostile target.
- [ ] Attack the weakest hostile target.
- [ ] Attack the strongest hostile target.
- [ ] Attack the player with the lowest health.
- [ ] Attack the player casting magic.
- [ ] Attack the player healing allies.
- [ ] Attack ranged attackers first.
- [ ] Attack enemies targeting vulnerable allies.
- [ ] Attack the party leader.
- [ ] Attack the last character who damaged the NPC.
- [ ] Attack targets based on threat.
- [ ] Avoid targets the NPC fears.
- [ ] Prefer targets vulnerable to the NPC's abilities.
- [ ] Allow species-specific targeting preferences.

## Defensive Combat Behaviors

- [ ] Attack monsters approaching the NPC.
- [ ] Attack monsters approaching nearby players.
- [ ] Attack monsters approaching family members.
- [ ] Attack only after being attacked.
- [ ] Attack only after the player attacks.
- [ ] Defend the current party leader.
- [ ] Defend a designated NPC.
- [ ] Defend a location.
- [ ] Defend a doorway or choke point.
- [ ] Protect healers.
- [ ] Protect children or civilians.
- [ ] Guard an object or treasure.
- [ ] Retreat when critically injured.
- [ ] Seek cover when under ranged attack.

## Healing and Support Behaviors

- [ ] Heal the lowest-health ally.
- [ ] Heal allies below a configurable health threshold.
- [ ] Heal the party leader first.
- [ ] Heal self before others at critical health.
- [ ] Remove harmful status effects.
- [ ] Resurrect fallen allies.
- [ ] Buff allies before combat.
- [ ] Buff allies during combat.
- [ ] Restore mana or other resources.
- [ ] Avoid wasting healing on minor injuries.
- [ ] Conserve rare healing items.
- [ ] Move closer before casting short-range support skills.

## Combat Positioning

- [ ] Maintain melee range.
- [ ] Maintain ranged distance.
- [ ] Keep healers behind front-line fighters.
- [ ] Avoid standing in environmental hazards.
- [ ] Seek cover when appropriate.
- [ ] Flank enemies when appropriate.
- [ ] Avoid blocking allies.
- [ ] Spread out against area attacks.
- [ ] Group up for defensive abilities.
- [ ] Retreat toward friendly NPCs.
- [ ] Retreat toward a safe location.
- [ ] Reposition when line of sight is blocked.

## Home Behaviors

- [ ] Walk home at an appropriate time.
- [ ] Sleep at home.
- [ ] Eat at home.
- [ ] Rest at home when tired.
- [ ] Store personal items at home.
- [ ] Visit family members at home.
- [ ] Perform household chores.
- [ ] Relax during free time.
- [ ] Stay home when sick.
- [ ] Seek home during dangerous town events.

## Work Behaviors

- [ ] Walk to the assigned workplace.
- [ ] Begin work at the scheduled time.
- [ ] Stop work at the scheduled time.
- [ ] Perform profession-specific tasks.
- [ ] Take scheduled breaks.
- [ ] Leave work when injured.
- [ ] Stay home when unable to work.
- [ ] Return home after work.
- [ ] React to workplace emergencies.
- [ ] Generate profession income while working.
- [ ] Use nearby profession tools.
- [ ] Choose alternate work tasks when one is unavailable.

## Shopkeeper Behaviors

- [ ] Walk to the shop before opening time.
- [ ] Open the shop at scheduled hours.
- [ ] Stand near the sales counter.
- [ ] Greet approaching customers.
- [ ] Trade with players.
- [ ] Trade with NPC customers.
- [ ] Restock shelves.
- [ ] Retrieve stock from storage.
- [ ] Close the shop after business hours.
- [ ] Lock doors after closing.
- [ ] Return home after work.
- [ ] React to theft.
- [ ] Call guards when threatened.
- [ ] Flee when overwhelmed.
- [ ] Offer quests when appropriate.

## Townsperson Daily Life

- [ ] Generate daily schedules.
- [ ] Walk between home and work.
- [ ] Visit shops.
- [ ] Visit friends.
- [ ] Visit family.
- [ ] Visit taverns.
- [ ] Visit religious locations.
- [ ] Visit markets.
- [ ] Sit in public areas.
- [ ] Wander through town.
- [ ] Stop to talk with nearby NPCs.
- [ ] React to town events.
- [ ] Go indoors during dangerous weather.
- [ ] Sleep during appropriate hours.
- [ ] Change routines on holidays or festivals.

## Social Behaviors

- [ ] Approach a friend.
- [ ] Approach a family member.
- [ ] Start a conversation.
- [ ] Join an existing conversation.
- [ ] Exchange gossip.
- [ ] Discuss nearby events.
- [ ] Discuss another NPC.
- [ ] Discuss local rumors.
- [ ] Offer information about nearby POIs.
- [ ] Offer quest hints.
- [ ] Offer a quest.
- [ ] Thank a player.
- [ ] Avoid disliked characters.
- [ ] Argue with rivals.
- [ ] Greet familiar players.
- [ ] React differently to strangers.

## Gossip and Knowledge

- [ ] Give NPCs knowledge of recent local events.
- [ ] Give NPCs knowledge of nearby NPCs.
- [ ] Give NPCs knowledge based on profession.
- [ ] Give NPCs knowledge based on faction.
- [ ] Let NPCs forget old low-value gossip.
- [ ] Allow rumors to spread between NPCs.
- [ ] Allow rumors to become distorted.
- [ ] Mark some knowledge as private.
- [ ] Prevent NPCs from revealing knowledge they should not know.
- [ ] Use gossip as a source of quest clues.

## Player Interaction Reactions

- [ ] React when a player approaches.
- [ ] React when a player speaks.
- [ ] React when a player attacks.
- [ ] React when a player steals.
- [ ] React when a player heals the NPC.
- [ ] React when a player gives an item.
- [ ] React when a player draws a weapon.
- [ ] React when a player casts nearby magic.
- [ ] React based on player reputation.
- [ ] React based on faction standing.
- [ ] React based on previous encounters.
- [ ] Offer dialogue choices when appropriate.
- [ ] Offer trade when appropriate.
- [ ] Offer quests when appropriate.

## Quest Behaviors

- [ ] Add behaviors while a quest is active.
- [ ] Remove quest behaviors when the quest ends.
- [ ] Follow the player during escort quests.
- [ ] Wait at quest locations.
- [ ] Lead the player to destinations.
- [ ] Defend quest objectives.
- [ ] Flee from quest threats.
- [ ] Trigger dialogue at quest milestones.
- [ ] Perform scripted interactions through behaviors.
- [ ] React to quest failure.
- [ ] React to quest completion.
- [ ] Preserve ordinary behaviors beneath quest overrides.

## Hired Fighter Behaviors

- [ ] Follow the hiring player.
- [ ] Guard the hiring player.
- [ ] Attack nearby monsters automatically.
- [ ] Attack only when ordered.
- [ ] Attack when the employer attacks.
- [ ] Protect other party members.
- [ ] Follow tactical priorities.
- [ ] Use healing items when needed.
- [ ] Retreat at configurable health.
- [ ] Return to employer after combat.
- [ ] End employment when the contract expires.
- [ ] Leave if unpaid or treated badly.

## Monster Behaviors

- [ ] Patrol a territory.
- [ ] Guard a lair.
- [ ] Hunt nearby prey.
- [ ] Attack intruders.
- [ ] Warn nearby monsters.
- [ ] Flee stronger enemies.
- [ ] Defend offspring.
- [ ] Defend food.
- [ ] Sleep when inactive.
- [ ] Return to a lair.
- [ ] Investigate suspicious sounds.
- [ ] Investigate nearby light.
- [ ] Chase targets only within territory limits.
- [ ] Give up pursuit after sufficient distance.
- [ ] Call for reinforcements where appropriate.

## Animal Behaviors

- [ ] Wander within a natural territory.
- [ ] Search for food.
- [ ] Search for water.
- [ ] Sleep in appropriate locations.
- [ ] Follow herd or pack members.
- [ ] Flee predators.
- [ ] Defend young.
- [ ] Investigate interesting objects.
- [ ] React to sudden noises.
- [ ] React to fire.
- [ ] React to weather.
- [ ] Migrate where appropriate.
- [ ] Return to nests or dens.

## Dog Behaviors

- [ ] Follow an owner.
- [ ] Follow the nearest family member.
- [ ] Stay near home.
- [ ] Wander nearby.
- [ ] Sniff interesting locations.
- [ ] Investigate other animals.
- [ ] Bark at threats.
- [ ] Defend the owner.
- [ ] Play with friendly characters.
- [ ] Rest near the owner.
- [ ] Fetch appropriate objects.
- [ ] Beg near food.
- [ ] Return home when separated.

## Needs and Survival

- [ ] Track hunger as a possible motivation.
- [ ] Track thirst as a possible motivation.
- [ ] Track fatigue as a possible motivation.
- [ ] Track safety as a possible motivation.
- [ ] Track social need where appropriate.
- [ ] Seek food when hungry.
- [ ] Seek water when thirsty.
- [ ] Seek rest when tired.
- [ ] Seek shelter in bad weather.
- [ ] Seek safety during attacks.
- [ ] Prevent basic needs from causing constant behavior thrashing.

## Personality Influence

- [ ] Give NPCs personality traits.
- [ ] Let bravery alter combat choices.
- [ ] Let aggression alter attack thresholds.
- [ ] Let friendliness alter social choices.
- [ ] Let curiosity alter exploration choices.
- [ ] Let greed alter trade and loot choices.
- [ ] Let loyalty alter defensive behavior.
- [ ] Let laziness alter work behavior.
- [ ] Let sociability alter conversation frequency.
- [ ] Let personality weight choices instead of forcing them.

## Relationships

- [ ] Track friendship relationships.
- [ ] Track family relationships.
- [ ] Track romantic relationships.
- [ ] Track rivalry.
- [ ] Track hostility.
- [ ] Track employer relationships.
- [ ] Track faction relationships.
- [ ] Let relationships alter behavior priorities.
- [ ] Let NPCs visit important relationships.
- [ ] Let NPCs assist friends in danger.
- [ ] Let NPCs avoid enemies.
- [ ] Let relationships evolve from interactions.

## Pathfinding Plugin Architecture

- [ ] Create a common pathfinding algorithm interface.
- [ ] Allow behaviors to request pathfinding by goal.
- [ ] Support multiple pathfinding algorithms.
- [ ] Assign preferred algorithms by behavior.
- [ ] Allow fallback pathfinding algorithms.
- [ ] Record why a path failed.
- [ ] Retry using another algorithm after failure.
- [ ] Limit pathfinding work per frame.
- [ ] Allow pathfinding generators to yield.
- [ ] Allow pathfinding jobs to be cancelled.
- [ ] Cache reusable paths where appropriate.
- [ ] Invalidate paths when navigation changes.

## Pathfinding Algorithms

- [ ] Support A* pathfinding.
- [ ] Support Dijkstra pathfinding.
- [ ] Support greedy best-first search.
- [ ] Support waypoint navigation.
- [ ] Support hierarchical pathfinding.
- [ ] Support simple direct steering.
- [ ] Support local obstacle avoidance.
- [ ] Support flow-field movement for groups.
- [ ] Allow plugins to register new pathfinders.
- [ ] Match pathfinding complexity to travel distance.

## Path Failure Recovery

- [ ] Detect NPCs that are stuck.
- [ ] Detect repeated movement without progress.
- [ ] Recalculate the current path.
- [ ] Try an alternate pathfinding algorithm.
- [ ] Try another nearby destination.
- [ ] Move to a nearby reachable waypoint.
- [ ] Back away from obstacles before retrying.
- [ ] Temporarily ignore an unreachable optional goal.
- [ ] Return to a known safe location.
- [ ] Log repeated path failures in debug mode.
- [ ] Avoid infinite pathfinding retry loops.

## Destination Selection

- [ ] Allow exact destination coordinates.
- [ ] Allow destination NPCs.
- [ ] Allow destination players.
- [ ] Allow destination buildings.
- [ ] Allow destination POIs.
- [ ] Allow destination tile types.
- [ ] Allow nearest matching destination.
- [ ] Allow random matching destination.
- [ ] Allow weighted destination choices.
- [ ] Allow fallback destinations.
- [ ] Require destinations to pass reachability checks.

## Local Navigation

- [ ] Avoid other moving NPCs.
- [ ] Avoid players.
- [ ] Avoid blocking doorways.
- [ ] Move aside for higher-priority travelers.
- [ ] Maintain personal space.
- [ ] Support group formations.
- [ ] Support single-file movement.
- [ ] Support crowd movement.
- [ ] Reduce oscillation when two NPCs block each other.
- [ ] Handle doors during movement.
- [ ] Handle stairs and elevation changes.

## Animation Integration

- [ ] Let behaviors request animation states.
- [ ] Play walking animation while moving.
- [ ] Play running animation while chasing.
- [ ] Play combat animations during attacks.
- [ ] Play healing animations.
- [ ] Play work animations.
- [ ] Play conversation animations.
- [ ] Play trading animations.
- [ ] Play eating animations.
- [ ] Play sleeping animations.
- [ ] Play fear or fleeing animations.
- [ ] Let behavior transitions blend animations smoothly.
- [ ] Stop outdated animations when behavior changes.

## Idle Behaviors

- [ ] Look around while idle.
- [ ] Shift posture while idle.
- [ ] Sit after waiting long enough.
- [ ] Talk to nearby NPCs.
- [ ] Inspect nearby objects.
- [ ] Practice a profession skill.
- [ ] Read when appropriate.
- [ ] Play music when appropriate.
- [ ] Forage when appropriate.
- [ ] Wander short distances.
- [ ] Avoid repeating the same idle behavior too often.

## Time and Schedule Integration

- [ ] Allow behaviors active only at certain times.
- [ ] Support work schedules.
- [ ] Support sleep schedules.
- [ ] Support meal schedules.
- [ ] Support shop opening hours.
- [ ] Support religious schedules.
- [ ] Support festival schedules.
- [ ] Support weekend or special-day schedules.
- [ ] Allow schedules to be interrupted by emergencies.
- [ ] Resume schedules after interruptions where sensible.

## Environment Reactions

- [ ] React to rain.
- [ ] React to storms.
- [ ] React to extreme cold.
- [ ] React to extreme heat.
- [ ] React to fire.
- [ ] React to darkness.
- [ ] React to nearby combat.
- [ ] React to explosions or loud sounds.
- [ ] React to dangerous terrain.
- [ ] React to closed roads or blocked paths.
- [ ] Seek shelter when appropriate.

## Group Behavior

- [ ] Allow NPCs to belong to behavior groups.
- [ ] Give groups shared goals.
- [ ] Give groups leaders.
- [ ] Let members follow group leaders.
- [ ] Support group patrols.
- [ ] Support group combat formations.
- [ ] Support shared retreat decisions.
- [ ] Support coordinated attacks.
- [ ] Support group travel.
- [ ] Support group conversations.
- [ ] Keep group behavior from overriding individual emergencies.

## Threat and Awareness

- [ ] Track nearby known threats.
- [ ] Track visible threats.
- [ ] Track recently heard threats.
- [ ] Track recent attackers.
- [ ] Forget stale threats over time.
- [ ] Score threats by danger.
- [ ] Score threats by distance.
- [ ] Score threats by hostility.
- [ ] Let behavior plugins query threat data.
- [ ] Avoid rescanning the whole world for threats.

## Perception

- [ ] Support visual perception.
- [ ] Support hearing perception.
- [ ] Support proximity perception.
- [ ] Support smell for relevant animals.
- [ ] Apply maximum perception ranges.
- [ ] Account for walls blocking vision.
- [ ] Account for darkness reducing vision.
- [ ] Account for loud sounds increasing detection.
- [ ] Reduce perception checks for distant NPCs.
- [ ] Cache recent perception results briefly.

## Memory

- [ ] Give NPCs short-term event memory.
- [ ] Remember recent attackers.
- [ ] Remember recent conversations.
- [ ] Remember important locations.
- [ ] Remember failed destinations.
- [ ] Remember recent gossip.
- [ ] Remember recent player interactions.
- [ ] Expire low-value memories.
- [ ] Preserve important long-term memories.
- [ ] Let behaviors query NPC memory.

## Player-Editable Behavior Stacks

- [ ] Let players inspect learned behavior rules.
- [ ] Let players reorder controllable behaviors.
- [ ] Let players enable or disable learned behaviors.
- [ ] Let players configure behavior thresholds.
- [ ] Let players select target preferences.
- [ ] Let players configure retreat health.
- [ ] Let players configure healing priorities.
- [ ] Let players configure follow distance.
- [ ] Let players save behavior presets.
- [ ] Let presets be copied between compatible NPCs.
- [ ] Restrict behaviors an NPC has not learned.
- [ ] Keep personality behaviors partly outside player control.

## Learning Behaviors

- [ ] Allow NPCs to learn new behavior plugins.
- [ ] Learn behaviors through training.
- [ ] Learn behaviors through professions.
- [ ] Learn behaviors through quests.
- [ ] Learn behaviors from other NPCs.
- [ ] Learn behaviors through repeated experience.
- [ ] Persist learned behaviors.
- [ ] Allow advanced skills to unlock better behavior variants.
- [ ] Allow behavior proficiency to improve execution.
- [ ] Avoid automatically granting every behavior to every NPC.

## Behavior Presets

- [ ] Provide townsperson defaults.
- [ ] Provide shopkeeper defaults.
- [ ] Provide guard defaults.
- [ ] Provide healer defaults.
- [ ] Provide hired fighter defaults.
- [ ] Provide escort defaults.
- [ ] Provide aggressive monster defaults.
- [ ] Provide defensive monster defaults.
- [ ] Provide prey-animal defaults.
- [ ] Provide predator defaults.
- [ ] Provide pet defaults.
- [ ] Allow plugins to define custom presets.

## Townsperson Default Stack

- [ ] Add emergency survival behavior.
- [ ] Add threat reaction behavior.
- [ ] Add scheduled work behavior.
- [ ] Add hunger and meal behavior.
- [ ] Add social behavior.
- [ ] Add shopping behavior.
- [ ] Add home behavior.
- [ ] Add sleep behavior.
- [ ] Add idle wandering behavior.
- [ ] Add personality-based optional behavior.

## Shopkeeper Default Stack

- [ ] Add threat and theft reaction behavior.
- [ ] Add customer interaction behavior.
- [ ] Add shop work behavior.
- [ ] Add restocking behavior.
- [ ] Add shop opening and closing behavior.
- [ ] Add social behavior during quiet periods.
- [ ] Add home behavior after hours.
- [ ] Add sleep behavior.

## Hired Fighter Default Stack

- [ ] Add survival and retreat behavior.
- [ ] Add protect-employer behavior.
- [ ] Add combat-target behavior.
- [ ] Add support-party behavior.
- [ ] Add follow-employer behavior.
- [ ] Add regroup behavior.
- [ ] Add idle behavior.

## Monster Default Stack

- [ ] Add survival behavior.
- [ ] Add territory-defense behavior.
- [ ] Add target-selection behavior.
- [ ] Add pursuit behavior.
- [ ] Add return-to-lair behavior.
- [ ] Add food or hunting behavior.
- [ ] Add sleep behavior.
- [ ] Add idle behavior.

## Debugging

- [ ] Show every behavior attached to the selected NPC.
- [ ] Show behavior priority order.
- [ ] Show current active behavior.
- [ ] Show current motivation scores.
- [ ] Show current destination.
- [ ] Show current target.
- [ ] Show current pathfinding algorithm.
- [ ] Show current generated path.
- [ ] Show failed pathfinding attempts.
- [ ] Show behavior generators currently queued.
- [ ] Show CPU time per behavior.
- [ ] Show yields per behavior.
- [ ] Show interruptions per behavior.
- [ ] Show behavior transitions.
- [ ] Show recent behavior decisions.
- [ ] Allow pausing one NPC's AI.
- [ ] Allow stepping one NPC behavior cycle manually.

## Performance

- [ ] Avoid evaluating every behavior every frame.
- [ ] Cache motivation values briefly when safe.
- [ ] Reevaluate urgent motivations more often.
- [ ] Reevaluate low-priority motivations less often.
- [ ] Use spatial queries for nearby entities.
- [ ] Avoid scanning all NPCs for targets.
- [ ] Avoid scanning all players for targets.
- [ ] Avoid creating temporary arrays during behavior selection.
- [ ] Reuse behavior-context objects where practical.
- [ ] Cap pathfinding jobs per frame.
- [ ] Cap perception checks per frame.
- [ ] Suspend detailed AI outside active regions.
- [ ] Use coarse simulation for distant NPCs.
- [ ] Keep behavior history buffers bounded.

## Behavior Lifecycle

- [ ] Define behavior initialization.
- [ ] Define behavior activation.
- [ ] Define behavior suspension.
- [ ] Define behavior resumption.
- [ ] Define behavior completion.
- [ ] Define behavior cancellation.
- [ ] Define behavior disposal.
- [ ] Clean up paths when behaviors end.
- [ ] Clean up temporary event listeners.
- [ ] Clean up generators when NPCs unload.
- [ ] Preserve persistent state across NPC unloading.

## Behavior Events

- [ ] Emit an event when a behavior activates.
- [ ] Emit an event when a behavior completes.
- [ ] Emit an event when a behavior fails.
- [ ] Emit an event when a behavior is interrupted.
- [ ] Emit an event when a path fails.
- [ ] Emit an event when a target changes.
- [ ] Emit an event when motivation changes significantly.
- [ ] Allow quests to listen for behavior events.
- [ ] Keep behavior events scoped to relevant listeners.

## Safety Against Behavior Loops

- [ ] Detect behaviors rapidly activating and cancelling.
- [ ] Add cooldowns to unstable behavior transitions.
- [ ] Limit behavior changes per NPC per second.
- [ ] Prevent recursive behavior activation.
- [ ] Prevent one behavior from spawning itself indefinitely.
- [ ] Detect generators that never complete or yield.
- [ ] Detect repeated impossible goals.
- [ ] Temporarily suppress repeatedly failing behaviors.
- [ ] Fall back to a safe idle behavior after repeated failures.

## Base Behavior Plugin API

- [ ] Define behavior applicability checks.
- [ ] Define motivation scoring.
- [ ] Define priority scoring.
- [ ] Define generator creation.
- [ ] Define cancellation hooks.
- [ ] Define behavior state serialization.
- [ ] Define behavior configuration validation.
- [ ] Define supported NPC species.
- [ ] Define supported professions.
- [ ] Define required capabilities.
- [ ] Define debug-description hooks.

## Suggested Behavior Context

- [ ] Include the NPC in behavior context.
- [ ] Include nearby players.
- [ ] Include nearby NPCs.
- [ ] Include nearby threats.
- [ ] Include current party.
- [ ] Include NPC relationships.
- [ ] Include NPC memory.
- [ ] Include current location.
- [ ] Include time and weather.
- [ ] Include active quest state.
- [ ] Include pathfinding services.
- [ ] Include animation services.
- [ ] Include interaction services.
- [ ] Include deterministic random source.
- [ ] Include scheduler yield/cancellation helpers.

## Automated Tests

- [ ] Verify higher-priority behaviors interrupt lower ones.
- [ ] Verify lower-priority behaviors resume afterward.
- [ ] Verify expired motivations stop their behavior.
- [ ] Verify behavior generators yield correctly.
- [ ] Verify cancelled generators stop running.
- [ ] Verify pathfinding fallback occurs after failure.
- [ ] Verify behavior stacks survive save/load.
- [ ] Verify town NPCs follow valid daily schedules.
- [ ] Verify combat NPCs choose valid hostile targets.
- [ ] Verify NPCs do not attack allies accidentally.
- [ ] Verify NPCs recover from unreachable destinations.
- [ ] Verify random choices remain deterministic when seeded.
- [ ] Verify unloaded NPCs stop consuming detailed AI time.
- [ ] Stress-test thousands of NPC behavior updates.
- [ ] Verify NPC AI stays within its frame-time budget.

A useful separation would be **motivation → behavior → action**. Motivation answers
“why should I do something?”, behavior decides “what should I do?”, and the
action layer handles concrete operations like walking, attacking, talking, or
playing an animation. That keeps a `ProtectPlayerBehavior` reusable whether the
NPC is a dog, guard, hired fighter, or quest companion.
