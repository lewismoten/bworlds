
- [x] A player may play one or more characters at the same time.
- [x] A player may drop off and pickup their characters at different places in the world.
- [x] A player may recruit NPC's to become part of their characters available.

# Developer Notes

A **hybrid “party overseer + direct possession” RPG** rather than forcing you to choose between “I am one character” and “I am an invisible god.”

The player can exist primarily as the **controller of a household/party/company of characters**, while always having at least one embodied character available. You can zoom out and manage the group, issue priorities, build homes/businesses, recruit people, and watch them live their lives; then at any moment directly take control of one character and play through their eyes.

# Player Identity and Control Model

* [ ] Treat the player account as an entity separate from individual characters.
* [x] Allow the player to own, recruit, or otherwise manage multiple characters.
* [x] Require at least one playable character to remain associated with the player at all times.
* [ ] Allow any eligible active character to become the directly controlled character.
* [ ] Allow seamless switching between directly controlled characters.
* [ ] Support a high overhead “party management” camera.
* [ ] Support third-person control of an individual character.
* [ ] Support first-person control of an individual character.
* [ ] Allow camera mode to change without changing character ownership.
* [ ] Allow the player to observe party members acting autonomously.
* [ ] Allow the player to issue commands without directly possessing a character.
* [ ] Allow the directly controlled character to temporarily return to autonomous behavior.
* [ ] Preserve character personality and AI when direct control ends.
* [ ] Ensure directly controlled characters use the same underlying rules as autonomous NPCs.
* [ ] Avoid creating a special “player character” class that behaves fundamentally differently from NPC characters.
* [ ] Keep combat, inventory, health, skills, animation, equipment, and professions shared between player-controlled and AI-controlled characters.
* [ ] Allow important interactions to require the currently embodied character to physically participate.
* [ ] Clearly indicate which character is currently under direct control.
* [ ] Provide fast party-member selection.
* [ ] Allow keyboard shortcuts or controller commands for switching characters.
* [ ] Allow selecting characters directly from the world.
* [ ] Allow selecting characters from a party roster.
* [ ] Prevent switching to characters when gameplay conditions logically prohibit it.
* [ ] Decide whether remote characters can ever be directly controlled from across the world.
* [ ] Allow rulesets to require physical proximity before switching characters if desired.

# Party System

* [ ] Allow multiple characters to travel together as an active party.
* [x] Define a configurable maximum active party size.
* [x] Allow larger ownership rosters than active party size.
* [ ] Allow party members to follow the directly controlled character.
* [ ] Allow autonomous parties even when no specific character is manually controlled.
* [ ] Maintain party cohesion while traveling.
* [ ] Prevent characters from walking directly through one another.
* [ ] Implement local avoidance between party members.
* [ ] Maintain natural personal space.
* [ ] Allow party formation to loosen in towns and safe areas.
* [ ] Tighten formations in dangerous environments.
* [ ] Support single-file movement through narrow passages.
* [ ] Support wider formations outdoors.
* [ ] Allow party formation preferences.
* [ ] Allow tanks or heavily armored characters to favor the front.
* [ ] Allow vulnerable ranged characters to favor the rear.
* [ ] Allow healers to favor protected positions.
* [ ] Allow the player to override formation logic.
* [ ] Prevent party members from blocking doorways indefinitely.
* [ ] Allow party members to move aside when another character needs to pass.
* [ ] Allow characters to catch up when separated.
* [ ] Handle party members who become stuck.
* [ ] Provide regroup commands.
* [ ] Provide wait commands.
* [ ] Provide follow commands.
* [ ] Provide hold-position commands.
* [ ] Provide retreat commands.
* [ ] Provide spread-out commands.
* [ ] Provide stay-close commands.

# Character Priority and Tactics System

This sounds similar to programmable companion behavior, and it could become one of the strongest systems in the game.

* [ ] Allow each active character to have a prioritized behavior list.
* [ ] Evaluate higher-priority conditions before lower-priority ones.
* [ ] Allow health-based conditions.
* [ ] Allow mana or resource-based conditions.
* [ ] Allow ally-status conditions.
* [ ] Allow enemy-status conditions.
* [ ] Allow distance-based conditions.
* [ ] Allow number-of-enemies conditions.
* [ ] Allow environmental conditions.
* [ ] Allow weapon/ammunition conditions.
* [ ] Allow status-effect conditions.
* [ ] Allow profession-related noncombat conditions.
* [ ] Allow rules such as “heal ally below 40% health.”
* [ ] Allow rules such as “resurrect fallen party member.”
* [ ] Allow rules such as “attack enemy targeting healer.”
* [ ] Allow rules such as “use ranged attack when enemy is distant.”
* [ ] Allow rules such as “switch to melee when enemy approaches.”
* [ ] Allow rules such as “drink potion below 25% health.”
* [ ] Allow rules such as “do not consume rare items automatically.”
* [ ] Allow rules such as “retreat when critically injured.”
* [ ] Allow rules such as “protect children/noncombatants.”
* [ ] Allow rules such as “focus attacks on party leader’s target.”
* [ ] Allow rules such as “attack weakest enemy first.”
* [ ] Allow rules such as “attack strongest enemy first.”
* [ ] Allow rules such as “interrupt spellcasters.”
* [ ] Allow rules such as “stay near party leader.”
* [ ] Allow rules such as “keep distance from enemies.”
* [ ] Allow rule priorities to be reordered.
* [ ] Allow rules to be enabled and disabled without deleting them.
* [ ] Provide templates for common combat roles.
* [ ] Provide healer presets.
* [ ] Provide tank presets.
* [ ] Provide ranged presets.
* [ ] Provide aggressive melee presets.
* [ ] Provide cautious presets.
* [ ] Allow character personality to influence behavior beneath explicit player rules.
* [ ] Suspend AI rules while the player directly controls that character.
* [ ] Resume AI cleanly when control is released.
* [ ] Allow temporary manual commands to override normal tactics.
* [ ] Show which tactic/rule caused an autonomous action in debug mode.

# Character Recruitment

* [ ] Allow recruitable characters to exist naturally in towns and other settlements.
* [ ] Allow characters to already have names.
* [ ] Allow names to be changed after recruitment.
* [ ] Preserve original names as optional character-history data.
* [ ] Give recruitable characters professions.
* [ ] Give recruitable characters existing skills.
* [ ] Give recruitable characters personality traits.
* [ ] Give recruitable characters relationships.
* [ ] Give recruitable characters histories.
* [ ] Give recruitable characters personal possessions.
* [ ] Give recruitable characters goals.
* [ ] Give recruitable characters preferences.
* [ ] Allow recruitment through payment.
* [ ] Allow recruitment through friendship.
* [ ] Allow recruitment through reputation.
* [ ] Allow recruitment through quests.
* [ ] Allow recruitment through family relationships.
* [ ] Allow recruitment through guild membership.
* [ ] Allow temporary hiring.
* [ ] Allow permanent recruitment.
* [ ] Allow specialists to be found only in appropriate places.
* [ ] Allow monks or healers to be recruited from monasteries.
* [ ] Allow scholars to be recruited from libraries or academies.
* [ ] Allow sailors to be recruited near ports.
* [ ] Allow miners to be recruited in mining settlements.
* [ ] Allow bards to be recruited from taverns, theaters, or festivals.
* [ ] Allow skilled characters to demand better living conditions or compensation.
* [ ] Allow some characters to refuse recruitment.
* [ ] Allow recruitment likelihood to depend on reputation.
* [ ] Allow characters to leave if treated poorly.

# Household and Family System

* [ ] Allow characters to belong to households.
* [ ] Allow one residence to represent a household home.
* [ ] Limit residents according to building capacity.
* [ ] Allow homes to favor family members rather than arbitrary characters.
* [ ] Allow spouses or partners to live together.
* [ ] Allow children to live with parents or guardians.
* [ ] Allow grandparents and extended family.
* [ ] Support multiple generations.
* [ ] Allow family relationships to affect autonomous behavior.
* [ ] Allow family members to protect one another.
* [ ] Allow family members to share some household resources.
* [ ] Allow children to mature over time if long-term aging is enabled.
* [ ] Allow adults to become elderly.
* [ ] Allow elderly characters to remain playable.
* [ ] Give age an effect on animations and abilities where appropriate.
* [ ] Allow characters to move between residences.
* [ ] Allow households to split.
* [ ] Allow new households to form.
* [ ] Allow characters who leave the active party to return home.
* [ ] Allow the player to choose which household members travel.
* [ ] Allow characters at home to continue daily routines.
* [ ] Allow household relationships to generate events.

# Housing

* [ ] Allow the player to own or rent residences.
* [ ] Give residences maximum resident capacities.
* [ ] Give residences storage limitations.
* [ ] Tie personal storage primarily to the residents who live there.
* [ ] Allow household members to keep personal possessions in their home.
* [ ] Allow household members to hold a limited number of items for the player.
* [ ] Avoid turning every small house into unlimited shared storage.
* [ ] Allow larger homes to support more residents.
* [ ] Allow rooms to have purposes.
* [ ] Support bedrooms.
* [ ] Support kitchens.
* [ ] Support workshops.
* [ ] Support studies.
* [ ] Support libraries.
* [ ] Support storage rooms.
* [ ] Support gardens.
* [ ] Support stables.
* [ ] Support training spaces.
* [ ] Support guest rooms.
* [ ] Allow houses to have upkeep.
* [ ] Allow rented houses to require rent.
* [ ] Allow houses to require repairs.
* [ ] Allow housing quality to affect morale or comfort.
* [ ] Allow residents to complain about overcrowding.
* [ ] Allow furniture and decoration to improve comfort or prestige.
* [ ] Allow characters to autonomously use furniture.
* [ ] Allow characters to sit, sleep, read, cook, craft, or socialize at home.

# Housing Decoration

* [ ] Allow furniture placement.
* [ ] Allow furniture rotation.
* [ ] Allow wall decorations.
* [ ] Allow rugs.
* [ ] Allow tables.
* [ ] Allow chairs.
* [ ] Allow beds.
* [ ] Allow shelves.
* [ ] Allow bookshelves.
* [ ] Allow paintings.
* [ ] Allow trophies.
* [ ] Allow weapons or armor to be displayed.
* [ ] Allow plants.
* [ ] Allow lighting fixtures.
* [ ] Allow banners.
* [ ] Allow cultural decorations.
* [ ] Allow religious decorations.
* [ ] Allow profession-related decorations.
* [ ] Allow residents to react to or use decorations where appropriate.
* [ ] Allow some decoration choices to affect prestige or comfort.
* [ ] Save decoration layout persistently.

# Guild Halls and Large Shared Properties

* [ ] Allow guild halls to house more characters than normal residences.
* [ ] Allow guild halls to provide true shared storage.
* [ ] Allow guild halls to contain communal equipment.
* [ ] Allow guild halls to provide crafting facilities.
* [ ] Allow guild halls to provide training facilities.
* [ ] Allow guild halls to provide meeting rooms.
* [ ] Allow guild halls to provide libraries.
* [ ] Allow guild halls to provide kitchens.
* [ ] Allow guild halls to provide sleeping quarters.
* [ ] Allow guild halls to provide armories.
* [ ] Allow guild halls to provide trophy rooms.
* [ ] Allow guild halls to display guild banners and emblems.
* [ ] Allow guild halls to have upkeep costs.
* [ ] Allow guild halls to employ staff.
* [ ] Allow upgrades to expand guild-hall capacity.

# Castles, Towers, and Special Headquarters

* [ ] Allow castles to support large populations.
* [ ] Allow castles to support guards.
* [ ] Allow castles to contain armories.
* [ ] Allow castles to contain workshops.
* [ ] Allow castles to contain kitchens.
* [ ] Allow castles to contain stables.
* [ ] Allow castles to contain storage vaults.
* [ ] Allow castles to contain guest quarters.
* [ ] Allow castles to function as administrative centers.
* [ ] Allow mage towers to support magical research.
* [ ] Allow mage towers to contain libraries and laboratories.
* [ ] Allow mage towers to recruit or house magical specialists.
* [ ] Allow monasteries to house religious or healing characters.
* [ ] Allow specialized headquarters to unlock specialized gameplay systems.
* [ ] Make large headquarters substantially more expensive to maintain than ordinary homes.

# Personal and Shared Storage

* [ ] Give every character a personal inventory.
* [ ] Give characters equipment inventories.
* [ ] Give residences limited household storage.
* [ ] Restrict residence storage according to ownership or household relationships.
* [ ] Allow guild halls to provide group storage.
* [ ] Allow castles and large headquarters to provide larger shared inventories.
* [ ] Allow containers to have physical or category limitations.
* [ ] Allow secure storage.
* [ ] Allow valuables to be stored separately.
* [ ] Prevent unlimited invisible storage.
* [ ] Allow characters to retrieve equipment autonomously when assigned an appropriate task.
* [ ] Track item location precisely.
* [ ] Show whether an item is being carried, worn, stored, displayed, or used.

# Professions While Inactive

* [ ] Allow characters left at home to continue their profession.
* [ ] Allow inactive characters to earn modest wages.
* [ ] Scale income according to profession skill.
* [ ] Scale income according to local economic conditions.
* [ ] Deduct living expenses where appropriate.
* [ ] Deposit some earnings into household/group savings.
* [ ] Allow characters to spend part of their own earnings.
* [ ] Allow inactive characters to gain small amounts of professional experience.
* [ ] Prevent inactive work from becoming more profitable than active gameplay.
* [ ] Allow profession schedules.
* [ ] Allow days off.
* [ ] Allow illness or injury to prevent work.
* [ ] Allow characters to change professions.
* [ ] Allow characters to retire.
* [ ] Allow retired characters to continue contributing through teaching or household activities.

# Businesses

* [ ] Allow the player or group to own businesses.
* [ ] Allow characters to work at player-owned businesses.
* [ ] Allow owners to designate managers.
* [ ] Allow employees to have working schedules.
* [ ] Calculate income from actual business activity where practical.
* [ ] Deduct rent.
* [ ] Deduct wages.
* [ ] Deduct maintenance.
* [ ] Deduct materials.
* [ ] Deduct taxes or fees where appropriate.
* [ ] Track profits.
* [ ] Allow profits to accumulate into group funds.
* [ ] Allow losses.
* [ ] Allow businesses to fail if expenses continually exceed revenue.
* [ ] Allow businesses to improve through upgrades.
* [ ] Allow character skill to affect business performance.
* [ ] Allow location to affect business performance.
* [ ] Allow local population to affect demand.
* [ ] Allow world events to affect business performance.
* [ ] Allow employees to continue working while the player travels elsewhere.

# Character Anatomy and Appearance

* [ ] Use a shared humanoid character structure whenever possible.
* [ ] Support different heights.
* [ ] Support different body weights.
* [ ] Support different builds.
* [ ] Support different genders.
* [ ] Support different ages.
* [ ] Support different fantasy or human races as required.
* [ ] Support different skin tones.
* [ ] Support different facial structures.
* [ ] Support different hairstyles.
* [ ] Support facial hair.
* [ ] Support scars.
* [ ] Support tattoos or markings.
* [ ] Support body proportions appropriate to race and age.
* [ ] Avoid requiring a completely separate animation set for every body shape.
* [ ] Retarget common animations to varying character proportions.
* [ ] Handle unusually short or tall characters without obvious foot sliding.
* [ ] Adjust reach calculations according to character dimensions.

# Shared Character Rig

This is one of the most important technical pieces.

* [ ] Define a standard humanoid skeleton.
* [ ] Define standard bone names.
* [ ] Define standard bone hierarchy.
* [ ] Define standard hand bones.
* [ ] Define finger bones if detailed hand interactions require them.
* [ ] Define facial animation bones or blend-shape conventions.
* [ ] Define attachment points for weapons.
* [ ] Define attachment points for shields.
* [ ] Define attachment points for bows.
* [ ] Define attachment points for backpacks.
* [ ] Define attachment points for jewelry.
* [ ] Define attachment points for hats and helmets.
* [ ] Define attachment points for tools.
* [ ] Define attachment points for musical instruments.
* [ ] Allow animations to be reused across compatible characters.
* [ ] Support animation retargeting.
* [ ] Support inverse kinematics.
* [ ] Use foot IK to align feet with uneven terrain.
* [ ] Use hand IK where characters interact with environmental objects.
* [ ] Use look-at IK for heads and eyes.
* [ ] Allow upper- and lower-body animations to be layered.

# Equipment Appearance

* [ ] Visually render equipped clothing.
* [ ] Visually render armor.
* [ ] Visually render helmets.
* [ ] Visually render boots.
* [ ] Visually render gloves.
* [ ] Visually render cloaks.
* [ ] Visually render belts.
* [ ] Visually render backpacks.
* [ ] Visually render jewelry.
* [ ] Visually render rings where detail level permits.
* [ ] Visually render necklaces.
* [ ] Visually render earrings.
* [ ] Visually render shields.
* [ ] Visually render equipped weapons.
* [ ] Visually render sheathed weapons.
* [ ] Visually render carried tools.
* [ ] Support clothing layering.
* [ ] Prevent severe model clipping.
* [ ] Adjust equipment for different body proportions.
* [ ] Hide body geometry underneath opaque equipment when useful for performance and clipping prevention.
* [ ] Support cosmetic items separately from functional equipment where appropriate.

# Animation State System

* [ ] Build character animation around named states rather than direct clip playback.
* [ ] Support animation blending.
* [ ] Support animation interruption rules.
* [ ] Support transition durations.
* [ ] Support layered animations.
* [ ] Allow facial animation independent of body animation.
* [ ] Allow upper-body actions while legs continue walking where reasonable.
* [ ] Allow equipment type to modify animation choices.
* [ ] Allow skills to modify animation styles.
* [ ] Allow personality to modify idle animation choices.
* [ ] Allow injury state to modify locomotion animations.
* [ ] Allow fatigue state to modify posture.
* [ ] Allow emotional state to modify posture and expression.

# Basic Locomotion Animations

* [ ] Standing.
* [ ] Idle.
* [ ] Looking around.
* [ ] Walking.
* [ ] Fast walking.
* [ ] Jogging.
* [ ] Running.
* [ ] Sprinting.
* [ ] Walking backward.
* [ ] Strafing.
* [ ] Turning in place.
* [ ] Crouching.
* [ ] Crouch walking.
* [ ] Sneaking.
* [ ] Jumping.
* [ ] Landing.
* [ ] Falling.
* [ ] Climbing ladders.
* [ ] Climbing rocks.
* [ ] Crawling.
* [ ] Squeezing through tight spaces.
* [ ] Swimming.
* [ ] Wading.
* [ ] Treading water.
* [ ] Getting onto a vehicle or mount.
* [ ] Getting off a vehicle or mount.

# Melee Combat Animations

* [ ] Unarmed idle stance.
* [ ] Unarmed attacks.
* [ ] Sword idle stance.
* [ ] Sword slash.
* [ ] Sword thrust.
* [ ] Sword overhead attack.
* [ ] Sword parry.
* [ ] Sword block.
* [ ] Axe idle stance.
* [ ] Axe horizontal attack.
* [ ] Axe overhead attack.
* [ ] Maul idle stance.
* [ ] Maul swing.
* [ ] Maul overhead strike.
* [ ] Spear idle stance.
* [ ] Spear thrust.
* [ ] Spear sweep.
* [ ] Spear brace.
* [ ] Shield idle.
* [ ] Shield block.
* [ ] Shield bash.
* [ ] Dual-wield stance.
* [ ] Dual-wield attacks.
* [ ] Combat dodge.
* [ ] Combat retreat.
* [ ] Hit reaction from front.
* [ ] Hit reaction from rear.
* [ ] Hit reaction from side.
* [ ] Knockdown.
* [ ] Getting up.

# Ranged Combat Animations

* [ ] Bow idle stance.
* [ ] Drawing arrow.
* [ ] Nocking arrow.
* [ ] Drawing bowstring.
* [ ] Aiming.
* [ ] Releasing arrow.
* [ ] Lowering bow.
* [ ] Crossbow idle.
* [ ] Loading crossbow.
* [ ] Cocking crossbow.
* [ ] Aiming crossbow.
* [ ] Firing crossbow.
* [ ] Reloading while moving if skill permits.
* [ ] Throwing objects.
* [ ] Throwing spears.
* [ ] Throwing knives where appropriate.

# Magic Animations

* [ ] Neutral spellcasting stance.
* [ ] One-handed conjuration.
* [ ] Two-handed conjuration.
* [ ] Casting toward a target.
* [ ] Casting toward the ground.
* [ ] Casting into the air.
* [ ] Channeling.
* [ ] Sustaining a spell.
* [ ] Defensive spell casting.
* [ ] Healing spell casting.
* [ ] Resurrection animation.
* [ ] Ritual casting.
* [ ] Staff casting.
* [ ] Wand casting.
* [ ] Spell interruption.
* [ ] Magical exhaustion.

# Profession Animations

* [ ] Mining.
* [ ] Chopping wood.
* [ ] Digging.
* [ ] Hammering.
* [ ] Forging.
* [ ] Sawing.
* [ ] Carpentry.
* [ ] Cooking.
* [ ] Stirring.
* [ ] Grinding.
* [ ] Farming.
* [ ] Planting.
* [ ] Harvesting.
* [ ] Fishing.
* [ ] Sewing.
* [ ] Weaving.
* [ ] Alchemy.
* [ ] Writing.
* [ ] Reading.
* [ ] Drawing.
* [ ] Studying.
* [ ] Cleaning.
* [ ] Carrying boxes.
* [ ] Loading carts.
* [ ] Unloading carts.
* [ ] Operating machinery where appropriate.

# Instrument Animations

* [ ] Lute-like instrument.
* [ ] Guitar-like instrument.
* [ ] Harp.
* [ ] Flute.
* [ ] Recorder.
* [ ] Horn.
* [ ] Trumpet.
* [ ] Drum.
* [ ] Hand drum.
* [ ] Violin/fiddle.
* [ ] Cello.
* [ ] Keyboard/piano.
* [ ] Singing posture.
* [ ] Conducting.
* [ ] Allow bard characters to occasionally play instruments autonomously.
* [ ] Synchronize finger/hand movement approximately with instrument type.
* [ ] Synchronize visible playing with procedural music playback where practical.

# Social Animations

* [ ] Wave.
* [ ] Nod.
* [ ] Shake head.
* [ ] Point.
* [ ] Beckon.
* [ ] Bow.
* [ ] Salute.
* [ ] Clap.
* [ ] Cheer.
* [ ] Laugh.
* [ ] Cry.
* [ ] Hug.
* [ ] Handshake.
* [ ] Give item.
* [ ] Receive item.
* [ ] Show item.
* [ ] Offer item.
* [ ] Dance.
* [ ] Sit conversationally.
* [ ] Lean against wall.
* [ ] Talk with hand gestures.
* [ ] Listen attentively.
* [ ] Look bored.
* [ ] Look impatient.
* [ ] Look nervous.

# Object Interaction Animations

* [ ] Open door.
* [ ] Close door.
* [ ] Open chest.
* [ ] Close chest.
* [ ] Unlock door.
* [ ] Pick lock.
* [ ] Pull lever.
* [ ] Push button.
* [ ] Turn wheel.
* [ ] Pick up small object.
* [ ] Pick up heavy object.
* [ ] Put object down.
* [ ] Give object.
* [ ] Receive object.
* [ ] Hold book.
* [ ] Hold map.
* [ ] Hold torch.
* [ ] Hold lantern.
* [ ] Drink.
* [ ] Eat.
* [ ] Use potion.
* [ ] Sit in chair.
* [ ] Get out of chair.
* [ ] Lie down.
* [ ] Get out of bed.

# Vehicle and Navigation Animations

* [ ] Sit in boat.
* [ ] Row boat.
* [ ] Steer boat.
* [ ] Captain ship.
* [ ] Work ship controls.
* [ ] Climb ship ladder.
* [ ] Operate airship controls.
* [ ] Captain airship.
* [ ] Operate blimp controls.
* [ ] Operate balloon controls.
* [ ] Ride mine cart.
* [ ] Brace during mine-cart turns.
* [ ] Drive wagon.
* [ ] Ride passenger wagon.
* [ ] Ride mount if mounts are supported.

# Idle Animation System

* [ ] Maintain a general idle animation pool.
* [ ] Avoid repeating the same idle continuously.
* [ ] Allow personality to weight idle choices.
* [ ] Allow profession to weight idle choices.
* [ ] Allow equipment to affect idle choices.
* [ ] Allow environment to affect idle choices.
* [ ] Allow weather to affect idle choices.
* [ ] Allow fatigue to affect idle choices.
* [ ] Allow injury to affect idle choices.
* [ ] Allow boredom to affect idle choices.
* [ ] Allow nearby characters to trigger social idles.
* [ ] Allow characters to look at interesting nearby activity.
* [ ] Allow characters to inspect equipment.
* [ ] Allow characters to stretch.
* [ ] Allow characters to sit when waiting long enough.
* [ ] Allow characters to forage nearby plants.
* [ ] Allow bards to occasionally play music.
* [ ] Allow scholars to read.
* [ ] Allow craftsmen to inspect tools.
* [ ] Allow fighters to practice moves.
* [ ] Allow mages to perform minor magical gestures.
* [ ] Allow religious characters to pray or meditate.
* [ ] Allow children to play.
* [ ] Give elderly characters age-appropriate idle options.
* [ ] Add “away from keyboard” behavior for a directly controlled character left inactive for a long time.

# Personality Through Animation

* [ ] Give characters personality traits that influence body language.
* [ ] Give confident characters more open posture.
* [ ] Give timid characters more guarded posture.
* [ ] Give energetic characters more active idles.
* [ ] Give tired characters slower reactions.
* [ ] Give impatient characters restless idles.
* [ ] Give cheerful characters more frequent smiles.
* [ ] Give serious characters restrained gestures.
* [ ] Give skilled fighters confident weapon handling.
* [ ] Give inexperienced characters less polished skill animations.
* [ ] Keep personality variation subtle enough that animations remain readable.

# Facial Expressions

* [ ] Neutral.
* [ ] Happy.
* [ ] Smiling.
* [ ] Laughing.
* [ ] Sad.
* [ ] Crying.
* [ ] Angry.
* [ ] Afraid.
* [ ] Surprised.
* [ ] Disgusted.
* [ ] Confused.
* [ ] Suspicious.
* [ ] Concentrating.
* [ ] Tired.
* [ ] Injured.
* [ ] In pain.
* [ ] Embarrassed.
* [ ] Proud.
* [ ] Bored.
* [ ] Concerned.
* [ ] Sleeping.
* [ ] Unconscious.
* [ ] Dead.
* [ ] Blend facial states rather than requiring only one expression at a time.
* [ ] Allow facial expressions to respond automatically to events.
* [ ] Allow conversation systems to request expressions.

# Injury and Health Animation

* [ ] Represent mild injury visually.
* [ ] Represent severe injury visually.
* [ ] Add limping.
* [ ] Reduce walking speed according to serious leg injuries.
* [ ] Allow arm injuries to affect posture.
* [ ] Allow characters to hold injured body parts.
* [ ] Add stagger animations.
* [ ] Add exhausted breathing.
* [ ] Add weakened posture.
* [ ] Allow injuries to modify combat animations.
* [ ] Allow status effects to modify movement.
* [ ] Allow poisoning to produce visual discomfort.
* [ ] Allow cold to produce shivering.
* [ ] Allow heat to produce exhaustion.
* [ ] Allow recovery to gradually restore normal animations.
* [ ] Avoid making injury animations interfere with necessary gameplay feedback.

# Fatigue and Sleep

* [ ] Track character fatigue.
* [ ] Modify posture as fatigue rises.
* [ ] Increase yawning.
* [ ] Slow idle reactions.
* [ ] Add head-drooping animations.
* [ ] Add stretching.
* [ ] Allow extremely tired characters to stumble occasionally.
* [ ] Reduce work efficiency when exhausted.
* [ ] Allow characters to autonomously seek rest.
* [ ] Support sitting sleep.
* [ ] Support bed sleeping.
* [ ] Support camping sleep.
* [ ] Support waking animation.
* [ ] Allow sleeping posture to differ by personality or age.

# Death and Resurrection

* [ ] Provide death animations appropriate to damage type where useful.
* [ ] Allow body collapse to interact reasonably with terrain.
* [ ] Avoid excessive expensive ragdoll simulation when unnecessary.
* [ ] Support unconscious states separately from death.
* [ ] Support resurrection animations.
* [ ] Support revived characters initially appearing weak.
* [ ] Allow companions to react emotionally to a party member's death.
* [ ] Allow family members to react particularly strongly.
* [ ] Decide what happens to equipment when a character dies.
* [ ] Preserve character identity and history through resurrection if resurrection exists.

# Skill-Specific Character Behavior

* [ ] Let highly skilled characters display more confident skill animations.
* [ ] Let inexperienced characters appear less polished.
* [ ] Give master craftsmen unique work idles.
* [ ] Give skilled fighters practice animations.
* [ ] Give skilled archers bow-maintenance animations.
* [ ] Give miners tool-inspection idles.
* [ ] Give healers medical-preparation idles.
* [ ] Give monks meditation idles.
* [ ] Give bards music idles.
* [ ] Give scholars reading/writing idles.
* [ ] Give sailors rope or navigation idles.
* [ ] Allow profession-specific idles only when appropriate equipment is available.

# Autonomous Activities

* [ ] Allow idle characters to forage.
* [ ] Allow characters to collect nearby low-value resources.
* [ ] Allow characters to sit.
* [ ] Allow characters to converse.
* [ ] Allow characters to browse shops.
* [ ] Allow characters to inspect interesting objects.
* [ ] Allow characters to eat when hungry.
* [ ] Allow characters to drink when thirsty.
* [ ] Allow characters to rest when tired.
* [ ] Allow characters to practice their profession.
* [ ] Allow characters to maintain equipment.
* [ ] Allow characters to read.
* [ ] Allow characters to play music.
* [ ] Allow children to play.
* [ ] Allow family members to interact.
* [ ] Prevent autonomous activities from overriding important party commands.

# Group Social Behavior

* [ ] Allow party members to occasionally converse while traveling.
* [ ] Allow friends to walk near one another.
* [ ] Allow family members to prefer proximity.
* [ ] Allow arguments between incompatible personalities.
* [ ] Allow characters to react to one another's injuries.
* [ ] Allow characters to congratulate successful actions.
* [ ] Allow characters to mourn deaths.
* [ ] Allow characters to celebrate major victories.
* [ ] Allow characters to sit around campfires.
* [ ] Allow groups to eat together.
* [ ] Allow groups to rest together.
* [ ] Avoid synchronized identical idle animations across the entire group.

# Player Camera — Overseer Mode

* [ ] Provide elevated camera positioning.
* [ ] Support zooming in and out.
* [ ] Support camera rotation.
* [ ] Support camera panning.
* [ ] Allow selecting characters from above.
* [ ] Highlight selected characters.
* [ ] Show party destinations.
* [ ] Show tactical destinations when issuing commands.
* [ ] Allow box selection if controlling larger groups ever becomes useful.
* [ ] Keep characters visually readable at overhead distance.
* [ ] Use simplified animation or LOD when zoomed far away.
* [ ] Prevent camera clipping through terrain.
* [ ] Allow camera restrictions in caves and interiors where appropriate.

# First-Person Character Control

* [ ] Attach first-person perspective to the currently controlled character.
* [ ] Hide or adapt head geometry so it does not obstruct the camera.
* [ ] Render visible hands where appropriate.
* [ ] Render held weapons.
* [ ] Render shields.
* [ ] Render tools.
* [ ] Render spellcasting effects.
* [ ] Allow first-person interaction with doors and objects.
* [ ] Allow first-person melee combat.
* [ ] Allow first-person ranged combat.
* [ ] Allow first-person spellcasting.
* [ ] Preserve the same game mechanics used by AI characters.

# Party Command UI

* [ ] Show active party roster.
* [ ] Show health.
* [ ] Show resource/mana.
* [ ] Show status effects.
* [ ] Show current activity.
* [ ] Show current target.
* [ ] Show currently triggered tactical rule.
* [ ] Allow quick character switching.
* [ ] Allow quick heal/defend/follow commands.
* [ ] Allow dragging party members to reorder formation priority.
* [ ] Show party members who become separated.
* [ ] Show party members who are unconscious or unable to follow.

# Character Roster UI

* [ ] Show every owned/recruited character.
* [ ] Group characters by location.
* [ ] Show residence.
* [ ] Show profession.
* [ ] Show current job.
* [ ] Show current activity.
* [ ] Show earnings.
* [ ] Show injuries.
* [ ] Show relationships.
* [ ] Show party availability.
* [ ] Show equipment.
* [ ] Show skill summary.
* [ ] Allow renaming.
* [ ] Allow portrait customization where appropriate.
* [ ] Allow assigning residences.
* [ ] Allow assigning jobs.
* [ ] Allow assigning businesses.
* [ ] Allow adding/removing active party members.

# Character History

* [ ] Record original generated name.
* [ ] Record current name.
* [ ] Record birthplace.
* [ ] Record age.
* [ ] Record family.
* [ ] Record profession history.
* [ ] Record guild membership.
* [ ] Record major battles.
* [ ] Record important injuries.
* [ ] Record deaths and resurrection.
* [ ] Record notable discoveries.
* [ ] Record businesses owned or worked at.
* [ ] Record important relationships.
* [ ] Preserve history even while characters remain inactive for long periods.

# Character Animation Preview Page

I would absolutely build this early. It can become both a development tool and eventually a character/equipment preview.

## Preview Page Basics

* [ ] Create a dedicated `/character-animation-preview` page.
* [ ] Allow selecting any character model.
* [ ] Allow selecting generated characters.
* [ ] Allow selecting saved characters.
* [ ] Allow selecting a generic reference mannequin.
* [ ] Allow loading a character without loading the game world.
* [ ] Render the character on a simple neutral stage.
* [ ] Provide free camera rotation.
* [ ] Provide zoom.
* [ ] Provide camera reset.
* [ ] Provide front view.
* [ ] Provide side view.
* [ ] Provide rear view.
* [ ] Provide overhead view.

## Animation Selection

* [ ] List every available animation.
* [ ] Group animations by category.
* [ ] Search animations by name.
* [ ] Filter by weapon type.
* [ ] Filter by profession.
* [ ] Filter by locomotion.
* [ ] Filter by social animation.
* [ ] Filter by state.
* [ ] Play animation.
* [ ] Pause animation.
* [ ] Resume animation.
* [ ] Stop animation.
* [ ] Restart animation.
* [ ] Scrub animation timeline.
* [ ] Change playback speed.
* [ ] Loop animation.
* [ ] Step one frame forward.
* [ ] Step one frame backward.
* [ ] Display animation duration.
* [ ] Display current animation timestamp.

## Wireframe Preview

* [ ] Toggle solid rendering.
* [ ] Toggle wireframe rendering.
* [ ] Toggle skeleton rendering.
* [ ] Toggle bone names.
* [ ] Toggle attachment points.
* [ ] Toggle collision shape.
* [ ] Toggle character bounding box.
* [ ] Toggle hitboxes.
* [ ] Toggle IK targets.
* [ ] Toggle animation root path.
* [ ] Show foot contact points.
* [ ] Show hand contact points.
* [ ] Display center of mass if useful.
* [ ] Display forward direction.

## Equipment Preview

* [ ] Equip clothing.
* [ ] Equip armor.
* [ ] Equip helmets.
* [ ] Equip weapons.
* [ ] Equip shields.
* [ ] Equip jewelry.
* [ ] Equip backpacks.
* [ ] Equip tools.
* [ ] Equip musical instruments.
* [ ] Verify weapon attachment positions.
* [ ] Verify sheathed weapon positions.
* [ ] Detect obvious clipping.
* [ ] Test animation with different equipment combinations.

## Body Variation Testing

* [ ] Change height.
* [ ] Change weight.
* [ ] Change body proportions.
* [ ] Change age.
* [ ] Change gender/body model.
* [ ] Change race/species.
* [ ] Verify animation retargeting.
* [ ] Verify foot placement.
* [ ] Verify hand placement.
* [ ] Verify equipment fit.
* [ ] Identify animations that break at extreme body proportions.

## Facial Animation Preview

* [ ] Select facial expression.
* [ ] Adjust expression intensity.
* [ ] Blend multiple expressions.
* [ ] Preview blinking.
* [ ] Preview talking.
* [ ] Preview eye movement.
* [ ] Preview look-at targets.
* [ ] Preview emotional transitions.
* [ ] Preview facial animation while body animation plays.

## Animation Layer Testing

* [ ] Preview walking + upper-body sword attack.
* [ ] Preview walking + spellcasting.
* [ ] Preview walking + carrying object.
* [ ] Preview injury overlay.
* [ ] Preview fatigue overlay.
* [ ] Preview facial-expression overlay.
* [ ] Preview equipment-specific pose overlays.
* [ ] Show animation weights.
* [ ] Allow manually changing blend weights.
* [ ] Inspect transition timing.

## Animation Debugging

* [ ] Display current animation state.
* [ ] Display previous animation state.
* [ ] Display transition progress.
* [ ] Display root motion.
* [ ] Display character velocity.
* [ ] Display animation-event markers.
* [ ] Show weapon-hit event timing.
* [ ] Show footstep event timing.
* [ ] Show sound-trigger timing.
* [ ] Show particle-trigger timing.
* [ ] Report missing animation clips.
* [ ] Report invalid skeleton mappings.
* [ ] Report missing bones.
* [ ] Report invalid equipment attachment points.

# Animation Data Architecture

I would avoid putting individual animations directly into NPC code. Instead give characters a common animation interface:

```ts
interface CharacterAnimationState {
  locomotion: LocomotionState;
  action?: CharacterAction;
  posture?: CharacterPosture;
  injury?: InjuryAnimationState;
  emotion?: Emotion;
  equipment?: EquipmentAnimationContext;
}
```

Then the animation system decides which clips/blends are appropriate:

```text
Character state
      ↓
Animation Resolver
      ↓
Base locomotion
      +
Upper-body action
      +
Injury posture
      +
Personality variation
      +
Facial expression
      ↓
Final pose
```

That becomes particularly powerful for something like:

```text
Walking
+
Carrying shield
+
Injured left leg
+
Very tired
+
Looking toward nearby enemy
```

You don't need one bespoke animation called:

```text
walking_with_shield_while_injured_and_tired.anim
```

Instead you compose it from layers.

# A Strong Overall Character Architecture

I think the underlying idea you've arrived at can be expressed nicely as:

```text
                      YOU
                       │
                 Player Account
                       │
           ┌───────────┴───────────┐
           │                       │
       Characters               Property
           │                       │
    ┌──────┴──────┐        ┌──────┴──────┐
    │             │        │             │
Active Party   At Home   Houses      Businesses
    │             │        │             │
    │          Professions │           Workers
    │          Families    │           Income
    │          Income      │           Expenses
    │                      │
    └──────────┐           │
               │           │
          Shared Group / Guild
                   │
              Guild Hall
                   │
             Shared Storage
```

And then character control works like:

```text
Overseer mode
     ↓
Watch 4 characters traveling together

     ↓ click one

Direct third-person control

     ↓ switch camera

First-person control

     ↓ release control

Character returns to its own AI
and tactical priorities
```

**your characters can matter as people instead of disposable party slots**. The blacksmith you recruited six months ago can eventually be somebody's parent, own a house, work in your shop, join an expedition when you need them, return home afterward, limp for several days after being injured, occasionally play cards with another character, and still be someone you can take direct control of whenever you want.

Players can choose either a conventional single-avatar RPG or a pure settlement-management game.
