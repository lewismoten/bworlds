# Minigame Catalog

Legend:

- `Solo` means one human player.
- `Multi` means multiple human players.
- `NPC` means computer opponents may participate.
- `World` means the game may reflect or affect world state.

## Gathering and Survival

### Fishing

Mode: Solo, Multi, NPC optional, World.

World interaction:

- Query nearby river, lake, or ocean context.
- Report that the player is fishing.
- Query bait, rods, and inventory.
- Award verified catches through the server.
- Let weather and season influence available fish.
- Show a fishing avatar in-world when useful.

- [ ] Build a simple timing-based fishing prototype.
- [ ] Add local static practice mode.
- [ ] Add API-backed catch rewards.
- [ ] Add local water and weather modifiers.
- [ ] Add multiplayer fishing contests.
- [ ] Add fishing achievements.

### Mining

Mode: Solo, Multi optional, World.

World interaction:

- Query local geology and mine type.
- Query tools and inventory.
- Award verified ores and materials.

- [ ] Build a timing and pattern mining game.
- [ ] Add local static practice mode.
- [ ] Add geology-based resource tables.
- [ ] Add server-verified resource rewards.

### Foraging

Mode: Solo, World.

World interaction:

- Query biome, season, weather, and vegetation.
- Award herbs, fruit, mushrooms, and materials.

- [ ] Build a visual identification game.
- [ ] Add biome-aware item pools.
- [ ] Add poisonous look-alike challenges.
- [ ] Add server-verified inventory rewards.

### Hunting and Tracking

Mode: Solo, Multi optional, World.

World interaction:

- Query local species and weather.
- Follow tracks generated from world fauna.
- Award materials through server validation.

- [ ] Build a track identification game.
- [ ] Build a trail-following game.
- [ ] Add weather effects on track visibility.
- [ ] Add cooperative tracking later.

### Farming

Mode: Solo, Multi cooperative, World.

World interaction:

- Query season, rainfall, soil, and settlement demand.
- Submit crop progress through server-owned state.

- [ ] Build a crop timing game.
- [ ] Add soil and weather modifiers.
- [ ] Add harvest quality scoring.
- [ ] Add cooperative farm plots later.

## Settlement and Planning

### Settlement Zoning

Mode: Solo, Multi collaborative, World.

World interaction:

- Load a settlement parcel or district.
- Zone housing, commerce, industry, and parks.
- Submit proposals to the world service.
- Let approved plans influence settlement growth.

- [ ] Build a zoning board prototype.
- [ ] Add road and utility constraints.
- [ ] Add population and budget goals.
- [ ] Add collaborative planning mode.
- [ ] Add world proposal validation.

### Town Builder

Mode: Solo, Multi collaborative, World.

World interaction:

- Use real settlement terrain.
- Place approved buildings and services.
- Feed verified outcomes into settlement simulation.

- [ ] Build a small grid builder.
- [ ] Add terrain and water constraints.
- [ ] Add budget constraints.
- [ ] Add building upgrade chains.
- [ ] Add server-approved world changes.

### Public Works

Mode: Solo, Multi collaborative, World.

World interaction:

- Plan roads, water lines, parks, and facilities.
- Solve limited settlement infrastructure problems.

- [ ] Build road connection puzzles.
- [ ] Build water network puzzles.
- [ ] Build traffic flow puzzles.
- [ ] Add settlement efficiency rewards.

### Traffic Planning

Mode: Solo, Multi collaborative, World.

World interaction:

- Load simplified real road graphs.
- Improve travel flow without changing roads directly.

- [ ] Build intersection timing puzzles.
- [ ] Add traffic volume scenarios.
- [ ] Add road closure scenarios.
- [ ] Add planning skill rewards.

## Defense and Combat

### Tower Defense

Mode: Solo, Multi cooperative, World optional.

World interaction:

- Use a settlement, road, bridge, or pass as the map.
- Let world events provide enemy themes.
- Report outcomes without direct world mutation.

- [ ] Build a static tower defense prototype.
- [ ] Add world-derived maps.
- [ ] Add cooperative defense.
- [ ] Add achievement rewards.

### Arena Survival

Mode: Solo, Multi cooperative, NPC, World optional.

World interaction:

- Use simplified local terrain.
- Represent active tournaments in-world.

- [ ] Build a lightweight combat arena.
- [ ] Add NPC waves.
- [ ] Add cooperative waves.
- [ ] Add tournament leaderboards.

### Tactical Defense

Mode: Solo, Multi cooperative, NPC, World.

World interaction:

- Protect a town, bridge, dock, or route.
- Use simplified versions of world locations.

- [ ] Build turn-based tactical defense.
- [ ] Add bridge defense scenarios.
- [ ] Add town defense scenarios.
- [ ] Add cooperative planning later.

### Archery Range

Mode: Solo, Multi competitive, World optional.

World interaction:

- Represent a range or festival event in-world.
- Award verified accuracy achievements.

- [ ] Build mouse and touch aiming.
- [ ] Add wind influence.
- [ ] Add timed rounds.
- [ ] Add multiplayer score rounds.

## Racing and Transport

### Road Racing

Mode: Solo, Multi, NPC, World.

World interaction:

- Use real roads or a simplified race copy.
- Publish race positions for world spectators.
- Award verified racing achievements.
- Keep rendering lighter than the full world.

- [ ] Build low-detail road race rendering.
- [ ] Build NPC racing.
- [ ] Add server checkpoints.
- [ ] Add multiplayer synchronization.
- [ ] Add spectator position updates.
- [ ] Add race achievements.

### Rally Racing

Mode: Solo, Multi, NPC, World.

World interaction:

- Use rural roads, trails, weather, and terrain.
- Run time trials through world route segments.

- [ ] Build point-to-point time trials.
- [ ] Add weather and surface effects.
- [ ] Add ghost replay support.
- [ ] Add multiplayer rally starts.

### Boat Racing

Mode: Solo, Multi, NPC, World.

World interaction:

- Use lakes, rivers, and coastal routes.
- Query currents, weather, and wind.

- [ ] Build lightweight boat physics.
- [ ] Add river checkpoint races.
- [ ] Add lake circuits.
- [ ] Add multiplayer support.

### Horse Racing

Mode: Solo, Multi, NPC, World.

World interaction:

- Use settlement tracks or suitable world routes.
- Represent races as local world events.

- [ ] Build simple horse pacing mechanics.
- [ ] Add stamina management.
- [ ] Add NPC racers.
- [ ] Add multiplayer races.

### Rail Dispatch

Mode: Solo, Multi cooperative, World.

World interaction:

- Use real rail graphs.
- Schedule trains and avoid conflicts.
- Improve freight or passenger efficiency.

- [ ] Build a rail dispatch board.
- [ ] Add signals and blocks.
- [ ] Add timetable goals.
- [ ] Add collaborative dispatch later.

### Ferry Dispatch

Mode: Solo, Multi cooperative, World.

World interaction:

- Use real docks, crossings, and settlement demand.
- Schedule ferries around weather and traffic.

- [ ] Build a ferry timetable game.
- [ ] Add passenger demand.
- [ ] Add weather delays.
- [ ] Add route efficiency scoring.

## Trade and Economy

### Trade Routes

Mode: Solo, Multi competitive, World.

World interaction:

- Query real settlements and route distances.
- Buy and sell goods using controlled game markets.
- Feed verified results into player progression.

- [ ] Build a route planning interface.
- [ ] Add distance and risk calculations.
- [ ] Add cargo capacity.
- [ ] Add market price variation.
- [ ] Add multiplayer competition.

### Merchant Game

Mode: Solo, Multi optional, World.

World interaction:

- Query settlement demand.
- Buy and sell limited virtual inventory.
- Train commerce-related skills.

- [ ] Build a simple buy and sell game.
- [ ] Add negotiation mechanics.
- [ ] Add settlement demand modifiers.
- [ ] Add commerce achievements.

### Auction Game

Mode: Solo with NPCs, Multi, World optional.

World interaction:

- Use fictional goods from world categories.
- Keep real player inventory separate unless verified.

- [ ] Build NPC bidding.
- [ ] Add multiplayer bidding.
- [ ] Add bluff and valuation mechanics.
- [ ] Add anti-collusion monitoring.

### Shipping Logistics

Mode: Solo, Multi competitive, World.

World interaction:

- Query ports, rivers, roads, rail, and cargo demand.
- Build efficient multi-modal shipping plans.

- [ ] Build cargo routing puzzles.
- [ ] Add deadlines and capacity limits.
- [ ] Add weather and closure events.
- [ ] Add logistics skill rewards.

## Navigation and Knowledge

### Cartography

Mode: Solo, World.

World interaction:

- Use hidden or partial world maps.
- Reward recognition of terrain and landmarks.
- Train exploration-related skills.

- [ ] Build landmark matching.
- [ ] Build contour reading.
- [ ] Build route plotting.
- [ ] Add world-region challenges.

### Orienteering

Mode: Solo, Multi race, World.

World interaction:

- Use real local maps.
- Find checkpoints from terrain clues.
- Publish race progress for spectators.

- [ ] Build map and compass controls.
- [ ] Add timed checkpoints.
- [ ] Add multiplayer races.
- [ ] Add world-derived courses.

### Weather Forecasting

Mode: Solo, Multi competitive, World.

World interaction:

- Query real simulated climate inputs.
- Predict upcoming simulated weather.

- [ ] Build pressure map challenges.
- [ ] Add cloud and wind interpretation.
- [ ] Score forecast accuracy.
- [ ] Add forecasting achievements.

### Geography Quiz

Mode: Solo, Multi, World.

World interaction:

- Ask about generated rivers, regions, towns, and ranges.
- Build questions from canonical world data.

- [ ] Build world geography questions.
- [ ] Add map location questions.
- [ ] Add timed multiplayer rounds.
- [ ] Add exploration skill rewards.

## Craft and Skill Games

### Blacksmithing

Mode: Solo, World optional.

World interaction:

- Query materials and tools.
- Request verified crafted outcomes.

- [ ] Build heat timing mechanics.
- [ ] Add hammer rhythm mechanics.
- [ ] Add material quality modifiers.
- [ ] Add server-verified crafting results.

### Cooking

Mode: Solo, Multi optional, World.

World interaction:

- Query ingredients and local recipes.
- Request verified food rewards.

- [ ] Build timing-based cooking.
- [ ] Build recipe memory challenges.
- [ ] Add ingredient quality.
- [ ] Add cooking achievements.

### Alchemy

Mode: Solo, Multi optional, World.

World interaction:

- Query gathered ingredients.
- Solve mixture and sequence puzzles.

- [ ] Build ingredient combination puzzles.
- [ ] Add temperature and timing.
- [ ] Add discovery achievements.
- [ ] Keep valuable hidden formulas server-side.

### Lockpicking

Mode: Solo, World optional.

World interaction:

- Use as an optional skill challenge.
- Keep server state authoritative for real locks.

- [ ] Build tactile lock puzzles.
- [ ] Add difficulty tiers.
- [ ] Add server challenge seeds.
- [ ] Add lockpicking achievements.

### Carpentry

Mode: Solo, World optional.

World interaction:

- Query wood types and building needs.
- Award verified crafted parts.

- [ ] Build measuring puzzles.
- [ ] Add cut planning.
- [ ] Add material waste scoring.
- [ ] Add carpentry skill rewards.

## Logic and Engineering

### Circuit Repair

Mode: Solo, Multi cooperative.

World interaction:

- Repair machines, signals, or settlement equipment.

- [ ] Build connection puzzles.
- [ ] Add timed repair challenges.
- [ ] Add cooperative puzzle boards.
- [ ] Add engineering skill rewards.

### Pipe and Water Networks

Mode: Solo, Multi cooperative, World.

World interaction:

- Solve settlement water distribution problems.

- [ ] Build pipe rotation puzzles.
- [ ] Add pressure constraints.
- [ ] Add limited-resource scenarios.
- [ ] Add public works achievements.

### Signal Routing

Mode: Solo, Multi cooperative, World.

World interaction:

- Route rail, radio, power, or communication signals.

- [ ] Build node routing puzzles.
- [ ] Add congestion constraints.
- [ ] Add timed failures.
- [ ] Add engineering rewards.

### Bridge Design

Mode: Solo, Multi collaborative, World optional.

World interaction:

- Use simplified real river and canyon spans.
- Score designs without changing world geometry directly.

- [ ] Build beam placement puzzles.
- [ ] Add load simulation.
- [ ] Add material budgets.
- [ ] Add engineering achievements.

## Social and Party Games

### Trivia

Mode: Solo, Multi.

World interaction:

- Use world lore, geography, and generated history.
- Keep general trivia packs independent from world state.

- [ ] Build static trivia mode.
- [ ] Add world lore questions.
- [ ] Add multiplayer rounds.
- [ ] Add category achievements.

### Card Games

Mode: Solo with NPCs, Multi.

World interaction:

- Place card tables in inns or settlements.
- Keep gameplay independently runnable.

- [ ] Add a generic turn-based card API.
- [ ] Add NPC players.
- [ ] Add private multiplayer tables.
- [ ] Add spectator support later.

### Dice Games

Mode: Solo with NPCs, Multi.

World interaction:

- Place games in taverns or festivals.
- Use server randomness for trusted outcomes.

- [ ] Build generic dice mechanics.
- [ ] Add server-secure random rolls.
- [ ] Add multiplayer tables.
- [ ] Add non-wagering modes by default.

### Board Games

Mode: Solo with NPCs, Multi.

World interaction:

- Place boards in inns, homes, clubs, or festivals.
- Let world cultures define visual themes.

- [ ] Build a generic turn engine.
- [ ] Add deterministic board state.
- [ ] Add NPC strategy adapters.
- [ ] Add private multiplayer rooms.

## Creative Games

### Music Performance

Mode: Solo, Multi collaborative, World.

World interaction:

- Perform in settlements.
- Let nearby players see performance presence.
- Integrate generated instruments and music later.

- [ ] Build rhythm input.
- [ ] Add instrument selection.
- [ ] Add group performances.
- [ ] Add performance achievements.

### Painting and Heraldry

Mode: Solo, World optional.

World interaction:

- Create decorative assets or heraldic patterns.
- Require moderation before public display.

- [ ] Build constrained drawing tools.
- [ ] Add heraldry templates.
- [ ] Add local-only creation mode.
- [ ] Add moderated world publishing later.

### Map Annotation

Mode: Solo, Multi collaborative, World.

World interaction:

- Let players mark discovered places on personal maps.
- Keep canonical geography separate from annotations.

- [ ] Build personal map markers.
- [ ] Add notes and categories.
- [ ] Add shared expedition maps.
- [ ] Add moderation for public annotations.

## Science and Observation

### Astronomy

Mode: Solo, Multi optional, World.

World interaction:

- Use the generated sky, season, and observation location.
- Let observatories unlock better observation conditions.

- [ ] Build constellation identification.
- [ ] Build telescope aiming challenges.
- [ ] Add comet and meteor observations.
- [ ] Add astronomy achievements.

### Wildlife Observation

Mode: Solo, Multi cooperative, World.

World interaction:

- Query local species and habitats.
- Reward observation without requiring hunting.

- [ ] Build species identification.
- [ ] Add photography-style challenges.
- [ ] Add rare sighting events.
- [ ] Add naturalist achievements.

### Archaeology

Mode: Solo, Multi cooperative, World.

World interaction:

- Use generated ruins and historical regions.
- Award knowledge and artifacts after verification.

- [ ] Build excavation grid puzzles.
- [ ] Add artifact identification.
- [ ] Add context-preservation scoring.
- [ ] Add archaeology achievements.

## Festival and Casual Games

### Carnival Target Game

Mode: Solo, Multi competitive, World optional.

- [ ] Build a static target game.
- [ ] Add timed rounds.
- [ ] Add multiplayer scoreboards.
- [ ] Add festival-themed world presence.

### Memory Match

Mode: Solo, Multi competitive.

- [ ] Build a fully static memory game.
- [ ] Add world-themed card sets.
- [ ] Add timed multiplayer rounds.
- [ ] Add cognitive skill rewards if desired.

### Maze

Mode: Solo, Multi race, World optional.

- [ ] Build seeded maze generation.
- [ ] Add static offline mode.
- [ ] Add multiplayer maze races.
- [ ] Add world festival themes.

### Rhythm Game

Mode: Solo, Multi competitive, World optional.

- [ ] Use generated music tracks when suitable.
- [ ] Add keyboard and touch input.
- [ ] Add verified score timing.
- [ ] Add multiplayer score races.

## Recommended First Games

- [ ] Build fishing as the first API-aware solo game.
- [ ] Build trivia as the first fully static game.
- [ ] Build racing as the first multiplayer world game.
- [ ] Build zoning as the first world-planning game.
- [ ] Build tower defense as the first cooperative game.
