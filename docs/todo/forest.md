- [X] Add a mushroom ring or stone ring in the middle of large forests
- [X] Trees in the middle of large forest may have an occasional stump or fallen tree.
- [ ] A large forest may have a very large and tall tree deep inside, that is a woodland town of its own. There are a few types - inabitants live (a) inside the hollowed trunk/bark of the tree, (b) high above the other trees in the branches, (c) underneath the tree roots, or (d) a combination where different town maps lead to each level.
- [X] Improve the branch generation to make trees
- [X] Add pine trees
- [X] Add bushes
- [X] Sometimes show a stump
- [X] Sometimes show a fallen tree
- [X] Consider a forest near a river can have a fallen tree across the river to form a bridge without a path/road leading to it
- [X] A forest may have a meadow with flowers
- [X] A tree may have a hollow
- [X] Birds can fly over trees
- [X] An owl may live in the hollow of a tree
- [X] A tree may have two pairs of initials carved into it with a heart (LM + FG)
- [X] A path may be through the woods without any markings other than there are no trees (or perhaps breadcrumbs)
- [ ] Touching / knocking on 3-5 trees in a specific order in a small area may reveal a secret treasure or entrance

# Developer Notes

A **shared tree-generation framework with species/family plugins**, rather than a completely unrelated generator for every tree.

The base framework should handle common concepts—seeded variation, age, seasons, damage, LOD, collision, attachments, animation, wildlife hooks—while each species plugin decides how those concepts actually look.

For example, an oak and a pine both support `age`, but aging them should produce very different shapes.

# Tree Generator Architecture

* [X] Create a common `TreeGenerator` interface used by every tree implementation.
* [X] Create a shared base generator containing reusable tree-generation utilities.
* [X] Allow specialized tree generators to extend or compose the shared functionality.
* [X] Allow one generator to represent a family of closely related trees.
* [X] Allow individual species to override family behavior.
* [X] Separate tree biological state from rendered geometry.
* [X] Separate tree placement from tree appearance generation.
* [X] Separate structural geometry from foliage.
* [X] Separate decorations and inhabitants from the tree itself.
* [X] Separate collision geometry from visible geometry.
* [ ] Separate tree simulation from rendering.
* [ ] Allow text, 2D, and 3D renderers to consume the same logical tree state.
* [X] Generate trees deterministically from world seed and location.
* [ ] Preserve persistent changes such as carvings, damage, harvesting, and fire.
* [ ] Avoid regenerating persistent tree state from scratch after the player modifies it.
* [X] Allow generators to advertise optional capabilities.
* [X] Keep older tree generators functional when new capabilities are introduced.
* [X] Provide sensible fallbacks when a generator does not support a feature.

# Tree Generator Capability / `supports` System

I would definitely implement the feature-support idea.

* [X] Define named tree capabilities.
* [X] Allow generators to report whether they support each capability.
* [X] Allow capabilities to be queried without actually generating the tree.
* [X] Allow capabilities to contain levels or metadata rather than only `true/false` where useful.
* [X] Provide default behavior when a capability is unsupported.
* [X] Ensure adding a new capability does not break existing generators.
* [X] Allow renderer-specific capabilities.
* [X] Allow gameplay capabilities independent of renderer capabilities.
* [X] Allow capabilities to differ by tree state.
* [X] Allow capabilities to differ by LOD.

Something along these lines:

```ts
type TreeFeature =
  | "branches"
  | "foliage"
  | "fruit"
  | "flowers"
  | "seasonalLeaves"
  | "wind"
  | "hollows"
  | "nests"
  | "climbable"
  | "harvestable"
  | "carvings"
  | "attachments"
  | "burning"
  | "damage"
  | "fallen"
  | "lod";
```

And:

```ts
interface TreeGenerator {
  supports(feature: TreeFeature): boolean;

  generate(context: TreeGenerationContext): Tree;
}
```

You may eventually want richer capability data:

```ts
interface TreeCapabilities {
  foliage?: boolean;
  fruit?: boolean;
  flowers?: boolean;

  wind?: {
    trunk: boolean;
    branches: boolean;
    leaves: boolean;
  };

  lod?: {
    levels: number;
  };

  wildlife?: readonly TreeWildlifeType[];
}
```

# Tree Species and Families

* [X] Define tree families.
* [X] Define individual species.
* [X] Allow species to inherit characteristics from families.
* [X] Define deciduous trees.
* [X] Define evergreen trees.
* [X] Define conifers.
* [ ] Define palms.
* [ ] Define fruit trees.
* [X] Define flowering trees.
* [ ] Define swamp trees.
* [ ] Define tropical trees.
* [ ] Define desert trees.
* [ ] Define alpine trees.
* [ ] Define dead-tree variants.
* [ ] Define fantasy tree families if appropriate.
* [ ] Define magical tree families if appropriate.
* [ ] Give each species characteristic trunk proportions.
* [ ] Give each species characteristic branching styles.
* [ ] Give each species characteristic canopy shapes.
* [ ] Give each species characteristic bark.
* [ ] Give each species characteristic leaves.
* [ ] Give each species appropriate fruit or nuts.
* [ ] Give each species appropriate flowering behavior.
* [X] Define appropriate maximum age.
* [ ] Define appropriate maximum height.
* [ ] Define typical habitat.
* [ ] Define temperature tolerance.
* [ ] Define moisture tolerance.
* [ ] Define altitude preference.
* [ ] Define soil preference.
* [ ] Define growth speed.
* [ ] Define typical spacing from neighboring trees.

# Placement-Based Procedural Generation

* [X] Use world coordinates as part of the procedural seed.
* [X] Include species in the seed.
* [ ] Include biome in tree generation.
* [ ] Include altitude.
* [ ] Include slope.
* [ ] Include soil.
* [ ] Include rainfall or moisture.
* [ ] Include temperature.
* [ ] Include sunlight exposure.
* [ ] Include prevailing wind.
* [ ] Include proximity to water.
* [ ] Include nearby tree density.
* [ ] Include nearby structures.
* [ ] Include local disturbance history.
* [ ] Prevent trees from spawning inside buildings.
* [ ] Prevent trees from blocking critical roads unless intentionally allowed.
* [ ] Prevent overlapping trunks.
* [ ] Allow tree crowns to overlap naturally.
* [ ] Bias trees toward believable ecological groupings.
* [ ] Generate seedlings around mature seed-producing trees where appropriate.
* [ ] Allow forests to reflect environmental gradients rather than abrupt biome boundaries.

# Tree Age

* [X] Generate tree age.
* [X] Base trunk thickness partly on age.
* [X] Base tree height partly on age.
* [X] Increase branching complexity with age.
* [X] Increase canopy size with age.
* [X] Allow young trees to have simple geometry.
* [X] Generate saplings.
* [X] Generate adolescent trees.
* [X] Generate mature trees.
* [X] Generate ancient trees.
* [X] Make very old trees more irregular.
* [ ] Give older trees more dead branches.
* [X] Increase hollow probability with age.
* [ ] Increase bark damage with age.
* [ ] Increase branch loss with age.
* [ ] Allow old trees to become historically significant landmarks.
* [ ] Allow especially old trees to receive unique procedural names or records.
* [ ] Adjust fruit production according to maturity.
* [ ] Prevent seedlings from producing mature fruit.
* [ ] Allow senescent trees to produce less foliage or fruit.

# Trunk Generation

* [ ] Generate variable trunk height.
* [ ] Generate variable trunk diameter.
* [ ] Taper trunks naturally toward the canopy.
* [ ] Avoid perfectly straight cylinders.
* [ ] Add slight curvature.
* [ ] Add directional lean.
* [ ] Allow terrain slope to influence lean.
* [ ] Allow wind exposure to influence lean.
* [ ] Generate buttress roots for appropriate species.
* [ ] Generate trunk forks.
* [ ] Generate multiple trunks for appropriate species.
* [ ] Generate twisted trunks.
* [ ] Generate irregular trunk thickness.
* [ ] Generate bark ridges.
* [ ] Generate bark cracks.
* [ ] Generate knots.
* [ ] Generate scars.
* [ ] Generate broken limb locations.
* [ ] Generate exposed wood.
* [ ] Generate moss or lichen.
* [ ] Generate vines where appropriate.
* [ ] Support hollow trunks.
* [ ] Support partially hollow trunks.
* [ ] Support split trunks.

# Branch Generation

This probably deserves several interchangeable strategies.

* [ ] Define a common branch-generation interface.
* [ ] Support recursive branching.
* [ ] Support rule-based/L-system branching.
* [ ] Support spline-based branching.
* [ ] Support space-colonization branching.
* [ ] Support predefined skeletal templates with procedural variation.
* [ ] Support hybrid template/procedural branching.
* [ ] Allow species to choose branching algorithms.
* [ ] Allow LOD level to choose a cheaper branching algorithm.
* [ ] Generate primary limbs.
* [ ] Generate secondary branches.
* [ ] Generate tertiary branches.
* [ ] Control branching angle by species.
* [ ] Control branch length by species.
* [ ] Control branch taper.
* [ ] Control branch curvature.
* [ ] Control upward versus downward branch tendency.
* [ ] Control branch density.
* [ ] Control minimum branch separation.
* [ ] Prevent impossible self-intersections where practical.
* [ ] Allow some branch intersections when natural-looking.
* [ ] Bias branches toward available sunlight.
* [ ] Reduce branching on shaded sides of dense forests.
* [ ] Bias exposed trees toward asymmetric growth.
* [ ] Let strong prevailing wind deform long-term branch growth.
* [ ] Generate dead branches.
* [ ] Generate broken branches.
* [ ] Generate dangling branches.
* [ ] Generate low branches.
* [ ] Generate climbable limbs where appropriate.

# Canopy Generation

* [ ] Define species-specific canopy shapes.
* [ ] Support spherical canopies.
* [ ] Support broad spreading canopies.
* [ ] Support conical canopies.
* [ ] Support columnar canopies.
* [ ] Support weeping canopies.
* [ ] Support irregular canopies.
* [ ] Allow canopy asymmetry.
* [ ] Reduce canopy growth where neighboring trees block light.
* [ ] Generate canopy gaps.
* [ ] Generate sparse crowns on unhealthy trees.
* [ ] Generate very dense crowns on healthy mature trees.
* [ ] Prevent foliage from forming obviously geometric blobs.
* [ ] Allow visible internal branches through canopy gaps.

# Foliage

* [ ] Allow trees without foliage.
* [ ] Generate leaves only for species that support them.
* [ ] Generate needles for conifers.
* [ ] Generate broad leaves for deciduous trees.
* [ ] Generate palm fronds.
* [ ] Generate leaf clusters rather than one object per leaf at normal distances.
* [ ] Support individual leaves at very high detail where worthwhile.
* [ ] Orient leaves realistically around branches.
* [ ] Vary leaf size.
* [ ] Vary leaf orientation.
* [ ] Vary leaf hue slightly.
* [ ] Avoid identical repeating foliage cards.
* [ ] Cull hidden internal foliage where beneficial.
* [ ] Adjust foliage density according to tree health.
* [ ] Adjust foliage density according to season.
* [ ] Adjust foliage density according to drought.
* [ ] Allow partially defoliated trees.
* [ ] Allow insect-damaged foliage.
* [ ] Allow diseased foliage.

# Seasons

* [ ] Support dormant winter state.
* [ ] Support early budding.
* [ ] Support leaf emergence.
* [ ] Support spring flowering.
* [ ] Support full green summer foliage.
* [ ] Support fruit development.
* [ ] Support seed development.
* [ ] Support autumn color transition.
* [ ] Support partial leaf fall.
* [ ] Support bare deciduous trees.
* [ ] Keep evergreen foliage through winter where appropriate.
* [ ] Adjust evergreen color seasonally if appropriate.
* [ ] Make seasonal timing species-specific.
* [ ] Make seasonal timing climate-dependent.
* [ ] Make seasonal timing altitude-dependent.
* [ ] Allow unusually warm/cold years to alter timing.
* [ ] Transition gradually rather than instantly changing entire trees.
* [ ] Generate leaves falling over time.
* [ ] Accumulate fallen leaves beneath trees where appropriate.
* [ ] Allow wind to accelerate leaf fall.
* [ ] Remove or decay fallen leaves over time.

# Flowers and Blossoms

* [ ] Define whether the species flowers visibly.
* [ ] Generate flowering season.
* [ ] Generate flower density.
* [ ] Generate flower color variation.
* [ ] Support cherry-blossom-like trees.
* [ ] Support fruit-tree blossoms.
* [ ] Support hanging flower clusters.
* [ ] Allow flower petals to fall.
* [ ] Allow wind to move petals.
* [ ] Generate petals on nearby ground.
* [ ] Attract pollinating insects.
* [ ] Transition flowers into fruit where appropriate.
* [ ] Avoid keeping flowers permanently after the flowering period.

# Fruit, Nuts, and Seeds

* [ ] Define fruit-bearing species.
* [ ] Define nut-bearing species.
* [ ] Define seed-producing species.
* [ ] Generate fruit seasonally.
* [ ] Vary fruit quantity according to tree health.
* [ ] Vary fruit quantity according to age.
* [ ] Position fruit on plausible branches.
* [ ] Allow fruit harvesting.
* [ ] Remove harvested fruit visually.
* [ ] Allow fruit to regrow only during appropriate cycles.
* [ ] Allow ripe fruit to fall.
* [ ] Generate fallen fruit below trees.
* [ ] Allow animals to eat fruit.
* [ ] Allow spoiled fruit.
* [ ] Generate acorns.
* [ ] Generate walnuts.
* [ ] Generate pinecones.
* [ ] Generate berries where tree-like species support them.
* [ ] Generate seeds blowing or falling where visually worthwhile.
* [ ] Allow seeds to contribute to future tree generation.

# Roots

* [ ] Generate visible roots around large trees.
* [ ] Generate roots following terrain contours.
* [ ] Generate exposed roots on slopes.
* [ ] Generate exposed roots near eroded riverbanks.
* [ ] Generate large roots near ancient trees.
* [ ] Generate roots entering caves where appropriate.
* [ ] Generate roots disrupting paths.
* [ ] Generate roots lifting old pavement or ruins.
* [ ] Use roots as minor traversal obstacles.
* [ ] Avoid roots becoming tedious collision traps.
* [ ] Support root interaction with nearby water.

# Wind Animation

* [ ] Allow trees to respond to local wind speed.
* [ ] Allow trees to respond to wind direction.
* [ ] Move trunks slightly in strong wind.
* [ ] Move major branches independently.
* [ ] Move small branches more than thick branches.
* [ ] Move leaves more rapidly than branches.
* [ ] Use different flexibility values by species.
* [ ] Make young trees more flexible.
* [ ] Make dead branches stiff or brittle.
* [ ] Add gust responses.
* [ ] Avoid synchronizing all nearby trees.
* [ ] Give each tree a phase offset.
* [ ] Let exposed trees move more than sheltered trees.
* [ ] Reduce wind animation complexity at distance.
* [ ] Consider GPU/shader-based wind for foliage.
* [ ] Avoid updating thousands of branch bones on the CPU each frame.

# Storm Effects

* [ ] Increase branch movement during storms.
* [ ] Increase falling leaves.
* [ ] Allow weak/dead branches to break.
* [ ] Allow trees to fall under extreme conditions where simulation supports it.
* [ ] Add rain interaction to foliage.
* [ ] Add snow accumulation.
* [ ] Allow snow to fall from branches.
* [ ] Add ice accumulation where appropriate.
* [ ] Make damaged trees more vulnerable to storms.

# Tree Health

* [ ] Track overall tree health.
* [ ] Track water stress.
* [ ] Track disease.
* [ ] Track insect infestation.
* [ ] Track fire damage.
* [ ] Track physical damage.
* [ ] Track rot.
* [ ] Track age-related decline.
* [ ] Reduce foliage for unhealthy trees.
* [ ] Change foliage coloration for unhealthy trees.
* [ ] Generate dead limbs.
* [ ] Generate bark damage.
* [ ] Reduce fruit yield.
* [ ] Allow recovery from minor conditions.
* [ ] Allow irreversible decline from severe damage.

# Tree States

* [ ] Healthy.
* [ ] Young.
* [ ] Mature.
* [ ] Ancient.
* [ ] Dormant.
* [ ] Flowering.
* [ ] Fruiting.
* [ ] Seeding.
* [ ] Drought-stressed.
* [ ] Diseased.
* [ ] Infected.
* [ ] Insect-infested.
* [ ] Dead.
* [ ] Standing dead.
* [ ] Rotten.
* [ ] Hollow.
* [ ] Partially broken.
* [ ] Lightning-struck.
* [ ] Burning.
* [ ] Smoldering.
* [ ] Burnt.
* [ ] Charred standing trunk.
* [ ] Fallen.
* [ ] Fallen and rotting.
* [ ] Stump.
* [ ] Cut stump.
* [ ] Uprooted.
* [ ] Beaver-chewed.
* [ ] Woodpecker-damaged.
* [ ] Storm-damaged.
* [ ] Partially harvested.

# Fire

* [ ] Allow trees to catch fire.
* [ ] Make fire spread through foliage.
* [ ] Make fire spread along branches.
* [ ] Make dry trees burn more readily.
* [ ] Make dead trees burn differently from healthy trees.
* [ ] Remove foliage as it burns.
* [ ] Blacken bark.
* [ ] Generate embers.
* [ ] Generate smoke.
* [ ] Generate falling burning branches.
* [ ] Transition burning trees into burnt states.
* [ ] Allow partial survival after limited fire damage.
* [ ] Generate long-term fire scars.
* [ ] Allow forest-fire propagation rules.
* [ ] Simplify fire simulation for distant trees.

# Fallen Trees

* [ ] Generate naturally fallen trees.
* [ ] Generate storm-felled trees.
* [ ] Generate cut trees.
* [ ] Generate uprooted trees.
* [ ] Generate broken trunks.
* [ ] Generate root balls.
* [ ] Allow fallen trees to block paths.
* [ ] Allow fallen trees to bridge streams or ravines.
* [ ] Allow climbing across suitable fallen trunks.
* [ ] Allow chopping/removal.
* [ ] Allow deadwood harvesting.
* [ ] Allow moss growth over time.
* [ ] Allow fungi to colonize fallen trunks.
* [ ] Allow animals to use fallen trees as habitat.
* [ ] Gradually increase rot.
* [ ] Reduce collision as decomposition progresses where appropriate.

# Stumps

* [ ] Generate stumps when trees are chopped.
* [ ] Preserve stump diameter from the original tree.
* [ ] Generate cut-ring texture.
* [ ] Track stump age.
* [ ] Generate rot over time.
* [ ] Allow moss to grow.
* [ ] Allow fungi to grow.
* [ ] Allow stump hollows.
* [ ] Allow insects.
* [ ] Allow small animals to use hollow stumps.
* [ ] Allow some tree species to sprout new shoots from stumps.

# Hollows

* [ ] Generate trunk hollows.
* [ ] Generate branch hollows.
* [ ] Increase hollow probability with tree age.
* [ ] Increase hollow probability in damaged trees.
* [ ] Allow hollows to contain animals.
* [ ] Allow hollows to contain insects.
* [ ] Allow hollows to contain items.
* [ ] Allow hidden quest objects inside hollows.
* [ ] Allow characters to inspect hollows.
* [ ] Give large hollows visible interior darkness.
* [ ] Allow water accumulation in suitable cavities.
* [ ] Allow rot around hollow edges.

# Birds

* [ ] Allow appropriate tree species to host birds.
* [ ] Generate perched birds.
* [ ] Generate birds arriving.
* [ ] Generate birds leaving.
* [ ] Generate birds hopping between branches.
* [ ] Generate birds hovering briefly near foliage where species-appropriate.
* [ ] Generate bird songs.
* [ ] Generate alarm calls.
* [ ] Allow birds to react to nearby characters.
* [ ] Allow birds to flee sudden noises.
* [ ] Generate seasonal bird populations.
* [ ] Generate migratory species.
* [ ] Avoid spawning a bird in every tree.

# Bird Nests

* [ ] Generate nests on structurally plausible branches.
* [ ] Prefer branch forks.
* [ ] Generate empty nests.
* [ ] Generate occupied nests.
* [ ] Generate eggs.
* [ ] Generate chicks.
* [ ] Generate parents returning to nests.
* [ ] Allow seasons to control nesting activity.
* [ ] Allow abandoned old nests.
* [ ] Let nests fall from heavily damaged trees.
* [ ] Allow players to inspect nests where gameplay permits.

# Owls

* [ ] Generate owl roosts in suitable trees.
* [ ] Prefer large trees and hollows.
* [ ] Make owls primarily active at night.
* [ ] Generate owl calls.
* [ ] Allow owls to watch nearby characters.
* [ ] Allow owls to fly away when disturbed.
* [ ] Use owl presence as environmental ambience or quest clues where appropriate.

# Squirrels and Small Animals

* [ ] Generate squirrels on appropriate trees.
* [ ] Allow squirrels to climb trunks.
* [ ] Allow squirrels to run along branches.
* [ ] Allow squirrels to jump between nearby trees.
* [ ] Allow squirrels to carry nuts.
* [ ] Generate squirrel nests/dreys.
* [ ] Allow squirrels to hide in hollows.
* [ ] Make squirrels flee characters.
* [ ] Allow seasonal food gathering.
* [ ] Support other tree-dwelling animals by biome.

# Woodpeckers

* [ ] Generate woodpeckers on appropriate trees.
* [ ] Prefer trees containing insects or dead wood.
* [ ] Generate pecking animation.
* [ ] Generate directional pecking sound.
* [ ] Generate woodpecker holes.
* [ ] Preserve holes as tree damage/details.
* [ ] Allow repeated activity to create visible clusters of holes.

# Insects

* [ ] Generate ants.
* [ ] Generate beetles.
* [ ] Generate caterpillars.
* [ ] Generate bees.
* [ ] Generate wasps.
* [ ] Generate butterflies around flowering trees.
* [ ] Generate moths.
* [x] Generate fireflies.
* [ ] Generate cicadas.
* [ ] Make insect populations seasonal.
* [ ] Make insects biome-dependent.
* [ ] Generate hives or nests where appropriate.
* [ ] Allow insect infestations to affect tree health.

# Fireflies

* [x] Generate fireflies around suitable trees.
* [x] Restrict them primarily to appropriate evening/night conditions.
* [x] Favor warm and humid environments.
* [x] Animate independently.
* [x] Vary glow timing.
* [x] Avoid synchronized flashing unless representing a species that does so.
* [x] Reduce firefly rendering at distance.
* [x] Allow fireflies to cluster around certain vegetation.

# Spider Webs

* [x] Generate webs between nearby branches.
* [x] Generate webs inside hollows.
* [x] Generate webs around dead branches.
* [x] Generate webs on abandoned/dead trees more frequently.
* [x] Add dew or rain glint where appropriate.
* [ ] Allow webs to be disturbed or destroyed.
* [x] Generate spiders where appropriate.

# Beaver Damage

* [x] Generate beaver-chewed trunks near suitable waterways.
* [x] Generate characteristic cone-shaped chew marks.
* [x] Generate partial chewing.
* [x] Generate nearly felled trees.
* [x] Generate felled beaver-cut trees.
* [x] Generate stripped branches.
* [x] Associate damage with nearby beaver populations.
* [x] Avoid beaver damage far from suitable habitat.

# Tree Carvings

* [ ] Support persistent carvings.
* [x] Generate old lovers' initials.
* [x] Generate hearts.
* [x] Generate dates.
* [x] Generate traveler markings.
* [x] Generate directional arrows.
* [X] Generate symbols.
* [X] Generate religious markings.
* [X] Generate guild symbols.
* [X] Generate warning marks.
* [X] Generate quest hints.
* [X] Generate treasure-map clues.
* [X] Generate historical inscriptions.
* [X] Allow players to inspect carvings.
* [ ] Allow new player-created carvings if desirable.
* [X] Age carvings visually.
* [X] Allow bark growth to partially obscure old carvings.
* [X] Preserve important quest carvings deterministically.

# Items Attached to Trees

* [ ] Define attachment points on trunks.
* [ ] Define attachment points on branches.
* [ ] Support objects hanging from branches.
* [ ] Support objects leaning against trunks.
* [ ] Support objects stuck into trunks.
* [ ] Support objects tied around trunks.
* [ ] Support objects nailed to trees.
* [ ] Support objects hidden in hollows.
* [ ] Support ropes tied to branches.
* [ ] Support swings.
* [ ] Support hanging lanterns.
* [ ] Support signs.
* [ ] Support wanted posters or notices.
* [ ] Support baskets.
* [ ] Support charms.
* [ ] Support ribbons.
* [ ] Support wind chimes.
* [ ] Support cages.
* [ ] Support backpacks resting against trees.
* [ ] Support weapons leaning against trees.
* [ ] Support arrows embedded in trunks.
* [ ] Support an arrow carrying a note.
* [ ] Support thrown knives embedded in wood.
* [ ] Support quest items.
* [ ] Support memorial objects.
* [ ] Make attached objects inherit appropriate motion when branches sway.

# Rope and Hanging Interaction

* [ ] Allow ropes to hang from strong branches.
* [ ] Allow rope swings.
* [ ] Allow hanging signs.
* [ ] Allow lanterns.
* [ ] Allow hammocks between trees.
* [ ] Allow clotheslines between trees where appropriate.
* [ ] Allow traps suspended from branches.
* [ ] Validate whether the selected branch is strong enough for the attached object.

# Interaction and Harvesting

* [ ] Allow players to inspect trees.
* [ ] Allow identification of tree species.
* [ ] Allow gathering fruit.
* [ ] Allow gathering nuts.
* [ ] Allow gathering seeds.
* [ ] Allow gathering bark where appropriate.
* [ ] Allow gathering sap.
* [ ] Allow gathering leaves.
* [ ] Allow gathering flowers.
* [ ] Allow gathering dead branches.
* [ ] Allow chopping trees.
* [ ] Allow pruning where gameplay supports it.
* [ ] Allow climbing appropriate trees.
* [ ] Allow shaking branches.
* [ ] Allow searching hollows.
* [ ] Allow retrieving embedded objects.
* [ ] Allow reading carvings.
* [ ] Allow collecting nests only if game design permits.
* [ ] Update visual state after harvesting.

# Collision and Movement Obstruction

* [ ] Generate a simplified trunk collision shape.
* [ ] Generate movement-obstruction bounds separately from render geometry.
* [ ] Avoid using detailed branch geometry for ordinary character collision.
* [ ] Allow roots to have optional collision.
* [ ] Allow large low branches to obstruct movement.
* [ ] Allow fallen trees to create collision.
* [ ] Allow stumps to obstruct movement.
* [ ] Support climbable trees separately from blocking geometry.
* [ ] Make collision scale appropriately with trunk size.
* [ ] Ensure collision changes when a tree falls or is chopped.
* [ ] Keep collision stable across LOD transitions.
* [ ] Avoid characters getting caught between tiny root/branch collision shapes.

# Navigation

* [ ] Register tree trunks with pathfinding.
* [ ] Treat dense tree clusters as higher movement cost.
* [ ] Allow small creatures to navigate spaces unavailable to large characters.
* [ ] Update navigation if trees fall.
* [ ] Update navigation if trees are cut.
* [ ] Allow AI to navigate around fallen logs.
* [ ] Allow AI to intentionally use fallen trees as crossings where appropriate.

# Text Renderer

* [ ] Represent tree species or family with suitable symbols where useful.
* [ ] Distinguish living trees from dead trees.
* [ ] Distinguish stumps.
* [ ] Distinguish fallen trees.
* [ ] Indicate fruit availability where useful.
* [ ] Indicate burning trees.
* [ ] Indicate special/interactable trees.
* [ ] Preserve logical tree state even when visual detail cannot be shown.

# 2D Renderer

* [ ] Generate species-specific sprites or procedural shapes.
* [ ] Represent canopy shape.
* [ ] Represent trunk size.
* [ ] Represent seasonal foliage.
* [ ] Represent fruit.
* [ ] Represent blossoms.
* [ ] Represent dead/burnt states.
* [ ] Represent stumps.
* [ ] Represent fallen trees.
* [ ] Render important attachments.
* [ ] Animate wind economically.
* [ ] Render wildlife where meaningful.
* [ ] Use simplified shadows.

# 3D Renderer

* [ ] Generate procedural trunk meshes.
* [ ] Generate procedural branches.
* [ ] Generate foliage clusters.
* [ ] Generate species-specific materials.
* [ ] Generate bark normal/detail variation.
* [ ] Generate roots where visible.
* [ ] Generate fruit models.
* [ ] Generate flower models or cards.
* [ ] Generate hollows.
* [ ] Generate scars.
* [ ] Generate damaged areas.
* [ ] Generate attachment points.
* [ ] Support animated branches.
* [ ] Support animated foliage.
* [ ] Support falling leaves.
* [ ] Support tree shadows.
* [ ] Support snow accumulation.
* [ ] Support burning visual effects.
* [ ] Support wildlife attachment/animation.

# Tree LOD

This is particularly important because forests can easily become one of your most expensive 3D environments.

* [ ] Define several tree LOD levels.
* [ ] Generate high-detail trees close to the camera.
* [ ] Generate medium-detail trees at moderate distance.
* [ ] Generate simplified trees at long distance.
* [ ] Use billboards or impostors at extreme distance where useful.
* [ ] Reduce branch count with distance.
* [ ] Reduce foliage-cluster count with distance.
* [ ] Remove tiny branches at medium distance.
* [ ] Remove fruit models at long distance.
* [ ] Remove small hollows and carvings at long distance.
* [ ] Remove small wildlife at long distance.
* [ ] Reduce wind simulation complexity with distance.
* [ ] Remove individual leaf movement at distance.
* [ ] Reduce shadow complexity with distance.
* [ ] Stop tree animations completely beyond meaningful range where appropriate.
* [ ] Maintain roughly the same silhouette between LODs.
* [ ] Prevent obvious tree shape popping during LOD transitions.
* [ ] Use hysteresis to avoid rapidly switching LOD levels.
* [ ] Generate cheaper collision independent of visual LOD.

A rough hierarchy could be:

```text
LOD 0 — nearby
full trunk
primary + secondary + small branches
dense foliage
fruit
hollows
attachments
animals
full wind
shadows

LOD 1
trunk
major branches
reduced foliage
major fruit
basic wind

LOD 2
simple trunk
simplified branch silhouette
canopy clusters
simple sway

LOD 3
impostor / billboard
```

# Tree Instancing and Performance

* [ ] Share tree materials between compatible species.
* [ ] Share branch geometries where possible.
* [ ] Instance leaves.
* [ ] Instance fruit.
* [ ] Instance common rock/root decorations.
* [ ] Consider instancing entire low-LOD trees.
* [ ] Avoid creating thousands of unique materials.
* [ ] Avoid unique textures for every tree.
* [ ] Use procedural parameters for visual variation.
* [ ] Avoid CPU animation for every leaf.
* [ ] Use shaders for large-scale foliage wind.
* [ ] Disable simulation for distant trees.
* [ ] Avoid checking every tree every frame.
* [ ] Update seasonal changes in batches.
* [ ] Update growth at very low frequency.
* [ ] Spatially index trees.
* [ ] Cull whole forest chunks before individual trees.
* [ ] Avoid generating high-detail tree geometry until it is needed.

# Tree Audio

* [ ] Generate leaf rustling based on wind.
* [ ] Scale rustling with foliage amount.
* [ ] Generate branch creaking during strong wind.
* [ ] Generate occasional twig snapping.
* [ ] Generate falling-leaf ambience sparingly.
* [ ] Generate fruit or nuts falling.
* [ ] Generate tree-falling audio.
* [ ] Generate chopping impacts.
* [ ] Generate bark scraping.
* [ ] Generate bird calls spatially from occupied trees.
* [ ] Generate woodpecker sounds.
* [ ] Generate squirrel movement where audible.
* [ ] Generate insect ambience.
* [ ] Generate fire sounds for burning trees.
* [ ] Avoid giving every tree its own continuous audio source.
* [ ] Aggregate forest rustling into ambient systems where appropriate.

# Tree Shadows and Lighting

* [ ] Cast trunk shadows.
* [ ] Cast major-branch shadows.
* [ ] Cast canopy shadows.
* [ ] Approximate tiny-leaf shadows rather than rendering every leaf's shadow.
* [ ] Reduce shadow complexity at distance.
* [ ] Allow sunlight to create dappled forest-floor lighting.
* [ ] Let seasons change the amount of sunlight reaching the ground.
* [ ] Let bare winter trees cast different silhouettes.
* [ ] Allow fireflies and magical tree features to emit small localized light where appropriate.

# Tree Persistence

* [ ] Preserve harvested fruit state until regrowth.
* [ ] Preserve chopped trees.
* [ ] Preserve stumps.
* [ ] Preserve fallen trees.
* [ ] Preserve fire damage.
* [ ] Preserve carvings.
* [ ] Preserve embedded arrows/items.
* [ ] Preserve quest-related tree state.
* [ ] Preserve major animal nests where gameplay requires it.
* [ ] Preserve planted trees.
* [ ] Allow purely cosmetic details to regenerate from the deterministic tree seed.
* [ ] Store deltas rather than full procedural tree geometry.

# Tree Growth Over Time

* [ ] Allow planted seedlings.
* [ ] Allow seedlings to mature.
* [ ] Increase trunk size gradually.
* [ ] Increase branch complexity.
* [ ] Increase canopy size.
* [ ] Begin flowering at maturity.
* [ ] Begin fruiting at maturity.
* [ ] Respond to environmental stress.
* [ ] Allow trees to die.
* [ ] Allow dead trees to remain standing.
* [ ] Allow dead trees eventually to fall.
* [ ] Allow fallen trees eventually to rot.
* [ ] Allow stumps to decay.
* [ ] Keep long-term simulation extremely inexpensive for distant trees.

# Ecological Interactions

* [ ] Let mature trees produce seeds.
* [ ] Allow seedlings to appear around parent trees.
* [ ] Allow animals to distribute seeds.
* [ ] Allow fruit consumption to contribute to seed dispersal.
* [ ] Let dense canopy reduce plants underneath.
* [ ] Let fallen trees create habitat.
* [ ] Let deadwood support fungi and insects.
* [ ] Let tree species compete differently for light.
* [ ] Let wet areas favor appropriate species.
* [ ] Let fire alter forest composition.
* [ ] Let logging alter forest composition.
* [ ] Avoid simulating individual biology continuously when statistical simulation is sufficient.

# Quest Integration

* [ ] Allow a specific tree to become a quest landmark.
* [ ] Allow carvings to reveal quest clues.
* [ ] Allow notes to be attached to trees.
* [ ] Allow arrows with notes to be embedded in trees.
* [ ] Allow items to be hidden inside hollows.
* [ ] Allow buried caches near distinctive trees.
* [ ] Allow ancient trees to have historical significance.
* [ ] Allow unusual tree shapes to act as navigation landmarks.
* [ ] Allow a tree to be diseased as part of a quest.
* [ ] Allow a tree to require healing or magical treatment.
* [ ] Allow trees to mark boundaries or trail routes.
* [ ] Allow player actions toward important trees to have consequences.

# Debug / Tree Generator Preview

I would build this much like the character-animation preview page.

* [ ] Create a dedicated tree-generator preview page.
* [ ] Select tree family.
* [ ] Select species.
* [ ] Enter generation seed.
* [ ] Randomize seed.
* [ ] Change age.
* [ ] Change season.
* [ ] Change health.
* [ ] Change moisture.
* [ ] Change wind.
* [ ] Change temperature.
* [ ] Change tree state.
* [ ] Toggle fruit.
* [ ] Toggle flowers.
* [ ] Toggle wildlife.
* [ ] Toggle decorations.
* [ ] Toggle attachments.
* [ ] Preview young through ancient stages.
* [ ] Preview all seasonal stages.
* [ ] Preview damaged states.
* [ ] Preview burnt state.
* [ ] Preview fallen state.
* [ ] Preview stump.
* [ ] Preview each LOD.
* [ ] Force LOD manually.
* [ ] Display triangle count.
* [ ] Display vertex count.
* [ ] Display draw-call count.
* [ ] Display generated object count.
* [ ] Display generation time.
* [ ] Display memory estimate.
* [ ] Display collision geometry.
* [ ] Display movement obstruction bounds.
* [ ] Display branch skeleton.
* [ ] Display attachment points.
* [ ] Display wildlife attachment positions.
* [ ] Toggle wireframe.
* [ ] Toggle foliage.
* [ ] Toggle shadows.
* [ ] Animate wind.
* [ ] Compare several seeds side-by-side.
* [ ] Generate a grid of trees from one species to judge whether they look sufficiently different.
* [ ] Generate mixed forests to test whether procedural variation remains visually coherent.

# Automated Tree Quality Tests

* [ ] Verify deterministic seeds generate identical trees.
* [ ] Verify different seeds produce meaningful variation.
* [ ] Verify required tree capabilities are correctly reported.
* [ ] Verify unsupported capabilities do not throw errors.
* [ ] Verify foliage is not generated for leafless species.
* [ ] Verify fruit is only generated on compatible species.
* [ ] Verify fruit requires appropriate maturity.
* [ ] Verify seasonal states are valid.
* [ ] Verify branch counts stay within performance budgets.
* [ ] Verify collision remains valid at all LODs.
* [ ] Verify mandatory trunk geometry is never missing.
* [ ] Verify branch geometry does not contain invalid numbers.
* [ ] Verify generated meshes stay within expected bounds.
* [ ] Verify LOD complexity decreases consistently.
* [ ] Verify tree generation stays under target time.
* [ ] Verify forests stay under triangle/draw-call budgets.

# Suggested Plugin Architecture

I wouldn't make this:

```text
OakGenerator
PineGenerator
MapleGenerator
CherryGenerator
AppleGenerator
...
```

with every implementation reinventing every feature.

I'd structure it more like:

```text
TreeGeneratorCore
│
├── trunk generation
├── branch generation strategies
├── foliage utilities
├── LOD generation
├── collision
├── wind
├── attachment system
├── seasonal state
├── wildlife hooks
└── damage/state system
        │
        ▼
TreeFamilyPlugin
│
├── DeciduousTreeGenerator
│      ├── Oak
│      ├── Maple
│      ├── Beech
│      └── Elm
│
├── FruitTreeGenerator
│      ├── Apple
│      ├── Pear
│      └── Cherry
│
├── ConiferGenerator
│      ├── Pine
│      ├── Fir
│      └── Spruce
│
└── SpecialTreeGenerator
       ├── Willow
       ├── Palm
       └── Fantasy trees
```

Then something like an oak definition can mostly be **data + selective overrides**:

```ts
const oak: TreeSpeciesDefinition = {
  family: "deciduous",

  height: [15, 30],
  lifespan: [150, 800],

  trunk: {
    thickness: "heavy",
    irregularity: 0.7,
  },

  branches: {
    strategy: "spreading",
    density: 0.75,
    horizontalBias: 0.65,
  },

  canopy: {
    shape: "broad-irregular",
    density: 0.8,
  },

  supports: {
    fruit: false,
    nuts: true,
    flowers: false,
    hollows: true,
    carvings: true,
    wildlife: true,
  },
};
```

Whereas cherry might use much of the same machinery but supply:

```text
smaller trunk
different branch distribution
rounder canopy
spring blossoms
fruit
different leaf colors
shorter lifespan
```

The especially important separation is:

```text
TREE INSTANCE
    │
    ├── identity
    │     species
    │     age
    │     seed
    │
    ├── biological state
    │     health
    │     season
    │     fruit
    │     disease
    │
    ├── persistent history
    │     carvings
    │     fire damage
    │     broken limbs
    │     attached objects
    │
    ├── inhabitants
    │     nest
    │     owl
    │     squirrel
    │     insects
    │
    └── renderer decides
          LOD 0 / 1 / 2 / 3
```

That prevents the tree from effectively becoming “whatever collection of meshes happened to be generated.” The **tree is the data and history; the mesh is merely its current representation**.

The same 200-year-old oak with `LM + JM` carved into its trunk, an owl occupying its hollow, a broken eastern limb, and an arrow containing a quest note can appear consistently in **text, 2D, close-up 3D, distant 3D, winter, summer, or after being damaged** without those becoming separate trees.
