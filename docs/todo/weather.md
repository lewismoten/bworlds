- [X] Add procedural weather conditions - Heavy Rain, Light Rain, Fog, Wind, Clouds, Snow, Hail. 
- [X] Change frequency/duration of weather based on time of year and region.
- [X] Add atmospheric effects to indicate possible weather conditions. (Red light at dawn, sailers warn, red light at night, sailors delight)
- [X] Add wind effects to different POI
  - [X] Tree foliage & sound
  - [X] Any POI that has a flag or banner (town & dungeon)
- [X] Weather fronts are procedurally generated
- [X] A seven day forecast can be displayed for the area ( this can be handy for fishing / gardening later )

# Plug-In Weather
A weather-system TODO list built around a **plugin architecture**, regional climate simulation, forecasts, rendering effects, event subscriptions, and debug controls.

## Core Weather Architecture

* [ ] Create a common `WeatherPlugin` interface.
* [ ] Give each weather plugin a stable unique ID.
* [ ] Give each weather plugin a display name.
* [ ] Give each weather plugin a description.
* [ ] Allow weather plugins to declare supported climates.
* [ ] Allow weather plugins to declare supported biomes.
* [ ] Allow weather plugins to declare required conditions.
* [ ] Allow weather plugins to expose optional capabilities.
* [ ] Add `supports()` for weather plugin capabilities.
* [ ] Keep older plugins valid as weather features expand.
* [ ] Allow weather plugins to inherit from other plugins.
* [ ] Allow weather plugins to extend base weather behavior.
* [ ] Allow weather plugins to override rendering only.
* [ ] Allow weather plugins to override simulation only.
* [ ] Allow weather plugins to override event behavior only.
* [ ] Allow weather plugins to register forecast rules.
* [ ] Allow multiple weather effects to coexist.
* [ ] Resolve conflicts between incompatible weather effects.
* [ ] Make weather generation deterministic from world state.
* [ ] Use seeded randomness for local weather variation.

## Weather State Model

* [ ] Define a common weather state structure.
* [ ] Track current temperature.
* [ ] Track feels-like temperature.
* [ ] Track relative humidity.
* [ ] Track atmospheric pressure.
* [ ] Track wind speed.
* [ ] Track wind gust speed.
* [ ] Track wind direction.
* [ ] Track cloud cover.
* [ ] Track precipitation rate.
* [ ] Track precipitation type.
* [ ] Track visibility.
* [ ] Track UV index.
* [ ] Track dew point.
* [ ] Track frost potential.
* [ ] Track storm severity.
* [ ] Track lightning potential.
* [ ] Track snow accumulation.
* [ ] Track ground wetness.
* [ ] Track drought level.
* [ ] Track air quality.
* [ ] Track ash or dust concentration.
* [ ] Track solar storm intensity.

## Regional Climate

* [ ] Define climate properties per biome.
* [ ] Define normal temperature ranges per biome.
* [ ] Define normal humidity ranges per biome.
* [ ] Define normal pressure ranges per biome.
* [ ] Define normal wind ranges per biome.
* [ ] Define seasonal rainfall patterns per biome.
* [ ] Define seasonal snow patterns per biome.
* [ ] Define drought probability per biome.
* [ ] Define storm probability per biome.
* [ ] Define fog probability per biome.
* [ ] Define hail probability per biome.
* [ ] Define tornado probability per biome.
* [ ] Define tropical storm probability per biome.
* [ ] Define dust storm probability per biome.
* [ ] Define volcanic ash probability per biome.
* [ ] Allow fantasy climates to override real-world norms.

## Latitude and Global Position

* [ ] Track latitude-equivalent position in the world.
* [ ] Support colder polar regions.
* [ ] Support warmer equatorial regions.
* [ ] Support different north/south seasonal behavior.
* [ ] Vary daylight-driven temperatures by latitude.
* [ ] Vary snow frequency by latitude.
* [ ] Vary storm tracks by latitude.
* [ ] Vary tropical storm zones by latitude.
* [ ] Vary UV intensity by latitude.
* [ ] Allow world shape to alter climate rules.

## Altitude and Terrain

* [ ] Lower temperatures with increasing altitude.
* [ ] Increase snow likelihood at high altitude.
* [ ] Let mountains block or redirect weather systems.
* [ ] Add rain-shadow effects behind mountain ranges.
* [ ] Increase wind on exposed ridges.
* [ ] Increase fog in valleys.
* [ ] Increase frost in sheltered low areas.
* [ ] Let terrain channel strong winds.
* [ ] Let coastal cliffs increase local wind.
* [ ] Let large lakes affect nearby humidity.

## Oceans and Coastal Weather

* [ ] Increase coastal humidity.
* [ ] Moderate coastal temperature swings.
* [ ] Generate sea breezes.
* [ ] Generate offshore winds.
* [ ] Support coastal fog.
* [ ] Support tropical storm formation over warm oceans.
* [ ] Require sufficient ocean area for hurricanes.
* [ ] Track ocean temperature influence.
* [ ] Allow storms to strengthen over warm water.
* [ ] Allow storms to weaken over land.
* [ ] Allow coastal storms to produce storm surge.
* [ ] Increase waves during strong winds.
* [ ] Expose marine weather to boat systems.

## Pressure Systems

* [ ] Model high-pressure systems.
* [ ] Model low-pressure systems.
* [ ] Give pressure systems position and radius.
* [ ] Give pressure systems movement direction.
* [ ] Give pressure systems movement speed.
* [ ] Let pressure gradients create wind.
* [ ] Let low pressure increase clouds and precipitation.
* [ ] Let high pressure favor clearer conditions.
* [ ] Let pressure systems grow and weaken.
* [ ] Let pressure systems merge.
* [ ] Let pressure systems split.
* [ ] Let pressure systems move across regions.
* [ ] Generate forecasts from pressure movement.
* [ ] Expose pressure systems to debug tools.

## Fronts

* [ ] Support cold fronts.
* [ ] Support warm fronts.
* [ ] Support stationary fronts.
* [ ] Support occluded fronts.
* [ ] Move fronts between pressure systems.
* [ ] Raise storm chances along fronts.
* [ ] Change temperature when fronts pass.
* [ ] Change wind direction when fronts pass.
* [ ] Change pressure as fronts approach.
* [ ] Add cloud changes ahead of fronts.
* [ ] Allow thunderstorms along strong fronts.
* [ ] Allow snow or sleet near winter fronts.

## Temperature

* [ ] Generate daily temperature curves.
* [ ] Generate daily high temperature.
* [ ] Generate daily low temperature.
* [ ] Warm temperatures after sunrise.
* [ ] Cool temperatures after sunset.
* [ ] Delay daily high until afternoon.
* [ ] Delay daily low until near sunrise.
* [ ] Modify temperature using cloud cover.
* [ ] Modify temperature using wind.
* [ ] Modify temperature using humidity.
* [ ] Modify temperature using elevation.
* [ ] Modify temperature using water proximity.
* [ ] Modify temperature using season.
* [ ] Modify temperature using incoming fronts.
* [ ] Track heat waves.
* [ ] Track cold waves.

## Humidity and Dew Point

* [ ] Generate humidity from biome and weather state.
* [ ] Increase humidity near water.
* [ ] Reduce humidity during dry weather.
* [ ] Calculate dew point.
* [ ] Generate dew when overnight conditions allow.
* [ ] Generate frost when dew forms below freezing.
* [ ] Increase morning fog near high humidity.
* [ ] Let humidity affect perceived temperature.
* [ ] Let humidity affect fire risk.
* [ ] Let humidity affect drying speed.

## Wind

* [ ] Generate sustained wind speed.
* [ ] Generate gust speed.
* [ ] Generate wind direction.
* [ ] Let pressure gradients influence wind.
* [ ] Let terrain alter wind direction.
* [ ] Let buildings create local wind shelter.
* [ ] Let forests reduce ground-level wind.
* [ ] Increase wind above treelines.
* [ ] Generate variable gust timing.
* [ ] Expose wind vectors to rendering systems.
* [ ] Expose wind vectors to physics systems.
* [ ] Expose wind vectors to sailing systems.
* [ ] Expose wind vectors to audio systems.

## Cloud Systems

* [ ] Track cloud coverage percentage.
* [ ] Track cloud altitude.
* [ ] Track cloud thickness.
* [ ] Track cloud movement.
* [ ] Generate clouds from humidity and pressure.
* [ ] Support clear skies.
* [ ] Support scattered clouds.
* [ ] Support overcast skies.
* [ ] Support storm clouds.
* [ ] Support low fog-like clouds.
* [ ] Darken lighting beneath thick clouds.
* [ ] Let clouds affect UV index.
* [ ] Let clouds affect temperatures.
* [ ] Let clouds cast optional moving shadows.

## Rain

* [ ] Create a rain weather plugin.
* [ ] Support light rain.
* [ ] Support moderate rain.
* [ ] Support heavy rain.
* [ ] Support torrential rain.
* [ ] Vary drop density by intensity.
* [ ] Vary rain angle with wind.
* [ ] Add rain impact effects.
* [ ] Add rain sound.
* [ ] Add roof-specific rain sound.
* [ ] Add water ripples from rain.
* [ ] Increase ground wetness.
* [ ] Reduce visibility in heavy rain.
* [ ] Increase river flow after prolonged rain.
* [ ] Allow flooding after extreme rain.

## Snow

* [ ] Create a snow weather plugin.
* [ ] Support light snow.
* [ ] Support moderate snow.
* [ ] Support heavy snow.
* [ ] Support blizzard conditions.
* [ ] Vary snow direction with wind.
* [ ] Accumulate snow on ground.
* [ ] Accumulate snow on roofs.
* [ ] Accumulate snow on trees.
* [ ] Reduce snow accumulation near heat.
* [ ] Melt snow when temperatures rise.
* [ ] Reduce visibility in heavy snow.
* [ ] Alter footsteps on snow.
* [ ] Slow movement in deep snow.
* [ ] Let snow affect roads and travel.

## Sleet and Freezing Rain

* [ ] Create a sleet weather plugin.
* [ ] Create a freezing-rain weather plugin.
* [ ] Require near-freezing temperatures.
* [ ] Add icy precipitation visuals.
* [ ] Add icy surface accumulation.
* [ ] Make roads slippery.
* [ ] Make bridges freeze first.
* [ ] Add ice to trees and structures.
* [ ] Allow ice buildup to break branches.
* [ ] Reduce traction for vehicles.

## Hail

* [ ] Create a hail weather plugin.
* [ ] Generate hailstone sizes.
* [ ] Generate hail intensity.
* [ ] Add hail impact sounds.
* [ ] Let hail bounce from surfaces.
* [ ] Let large hail damage crops.
* [ ] Let large hail damage fragile objects.
* [ ] Reduce visibility during severe hail.
* [ ] Tie hail to strong thunderstorms.

## Thunderstorms

* [ ] Create a thunderstorm weather plugin.
* [ ] Generate lightning probability.
* [ ] Generate lightning strike positions.
* [ ] Delay thunder based on strike distance.
* [ ] Generate varied thunder sounds.
* [ ] Increase wind gusts.
* [ ] Increase rain intensity.
* [ ] Darken cloud cover.
* [ ] Allow lightning-induced fires.
* [ ] Allow lightning to damage trees.
* [ ] Allow lightning to damage structures.
* [ ] Expose lightning events to POIs.

## Tornadoes

* [ ] Create a tornado weather plugin.
* [ ] Require suitable severe storm conditions.
* [ ] Generate tornado start location.
* [ ] Generate tornado path.
* [ ] Generate tornado movement speed.
* [ ] Generate tornado width.
* [ ] Generate tornado severity.
* [ ] Add rotating debris visuals.
* [ ] Add tornado audio.
* [ ] Apply extreme localized wind.
* [ ] Damage structures along the path.
* [ ] Uproot or break trees.
* [ ] Move lightweight objects.
* [ ] Expose tornado warnings to NPC systems.
* [ ] Expose tornado events to POIs.

## Hurricanes and Tropical Storms

* [ ] Create a tropical storm plugin.
* [ ] Create a hurricane plugin.
* [ ] Form storms over sufficiently warm oceans.
* [ ] Track storm center.
* [ ] Track storm radius.
* [ ] Track storm intensity.
* [ ] Track storm movement.
* [ ] Track central pressure.
* [ ] Generate spiral rain bands.
* [ ] Generate extreme coastal winds.
* [ ] Generate storm surge.
* [ ] Generate heavy rainfall.
* [ ] Generate flooding.
* [ ] Weaken storms after landfall.
* [ ] Allow storms to regain strength over water.
* [ ] Provide multi-day storm forecasts.

## Fog

* [ ] Create a fog weather plugin.
* [ ] Support light mist.
* [ ] Support moderate fog.
* [ ] Support dense fog.
* [ ] Reduce draw distance.
* [ ] Reduce visibility smoothly.
* [ ] Increase fog near water.
* [ ] Increase morning fog.
* [ ] Burn off fog as temperatures rise.
* [ ] Allow valley fog.
* [ ] Allow coastal fog.
* [ ] Expose fog visibility to AI.
* [ ] Expose fog events to lighthouses.

## Dust and Sand Storms

* [ ] Create a dust storm plugin.
* [ ] Create a sandstorm plugin.
* [ ] Restrict storms to dry regions.
* [ ] Require sufficiently strong winds.
* [ ] Reduce visibility.
* [ ] Add airborne dust particles.
* [ ] Add wind-driven debris.
* [ ] Add dust storm audio.
* [ ] Reduce solar brightness.
* [ ] Increase respiratory hazard if supported.
* [ ] Deposit dust on nearby surfaces.
* [ ] Affect travel and navigation.

## Volcanic Ash

* [ ] Create a volcanic ash weather plugin.
* [ ] Connect ash events to volcanic activity.
* [ ] Track ash cloud location.
* [ ] Track ash cloud movement.
* [ ] Track ash concentration.
* [ ] Reduce sunlight.
* [ ] Reduce visibility.
* [ ] Add falling ash particles.
* [ ] Accumulate ash on surfaces.
* [ ] Affect air quality.
* [ ] Affect crops.
* [ ] Affect machinery if applicable.
* [ ] Allow distant regions to receive ash.

## Frost

* [ ] Create a frost weather effect.
* [ ] Require cold surface temperatures.
* [ ] Increase frost after clear calm nights.
* [ ] Add frost to vegetation.
* [ ] Add frost to roofs.
* [ ] Add frost to windows.
* [ ] Melt frost after warming.
* [ ] Let frost affect crops.
* [ ] Let frost affect morning traction.

## Morning Dew

* [ ] Create a morning dew effect.
* [ ] Require humid overnight conditions.
* [ ] Add subtle moisture to vegetation.
* [ ] Add moisture to exposed surfaces.
* [ ] Increase morning ground wetness.
* [ ] Evaporate dew after warming.
* [ ] Add sparkling highlights when appropriate.

## Heat Waves

* [ ] Create a heat wave state.
* [ ] Require prolonged high temperatures.
* [ ] Increase drought risk.
* [ ] Increase fire risk.
* [ ] Increase NPC thirst.
* [ ] Reduce daytime work activity.
* [ ] Create heat-haze rendering.
* [ ] Increase water demand.
* [ ] Affect crops and animals.

## Cold Waves

* [ ] Create a cold wave state.
* [ ] Require prolonged low temperatures.
* [ ] Increase freezing risk.
* [ ] Freeze shallow water.
* [ ] Increase heating needs.
* [ ] Reduce NPC outdoor activity.
* [ ] Affect crops and animals.
* [ ] Increase snow persistence.

## Solar Storms

* [ ] Create a solar storm plugin.
* [ ] Track solar storm intensity.
* [ ] Generate aurora effects.
* [ ] Increase aurora visibility near polar regions.
* [ ] Allow unusual sky colors.
* [ ] Affect magical systems if appropriate.
* [ ] Affect technology if appropriate.
* [ ] Expose solar storm events to observatories.
* [ ] Include solar storms in special forecasts.

## Weather Transitions

* [ ] Transition weather gradually.
* [ ] Avoid instant clear-to-storm changes.
* [ ] Interpolate temperature changes.
* [ ] Interpolate humidity changes.
* [ ] Interpolate wind changes.
* [ ] Interpolate cloud cover.
* [ ] Ramp precipitation intensity.
* [ ] Fade weather particles smoothly.
* [ ] Crossfade weather audio.
* [ ] Allow abrupt changes only for valid severe events.

## Weather Regions

* [ ] Divide the world into weather simulation regions.
* [ ] Give regions independent local conditions.
* [ ] Allow weather systems to span multiple regions.
* [ ] Move weather systems across region boundaries.
* [ ] Blend conditions near region boundaries.
* [ ] Avoid visible weather seams.
* [ ] Simulate nearby regions in more detail.
* [ ] Simulate distant regions at lower frequency.
* [ ] Cache regional forecast data.

## Forecast System

* [ ] Generate a current weather summary.
* [ ] Generate today's high temperature.
* [ ] Generate today's low temperature.
* [ ] Generate today's precipitation chance.
* [ ] Generate today's expected wind.
* [ ] Generate today's UV index.
* [ ] Generate a seven-day forecast.
* [ ] Generate daily high/low temperatures.
* [ ] Generate daily weather summaries.
* [ ] Generate daily precipitation probabilities.
* [ ] Generate daily wind forecasts.
* [ ] Generate severe weather risks.
* [ ] Decrease forecast certainty with time.
* [ ] Allow forecasts to be imperfect.
* [ ] Keep forecasts deterministic for the same simulation state.

## Weather Forecast Accuracy

* [ ] Give forecasts a confidence level.
* [ ] Make short-term forecasts more accurate.
* [ ] Make distant forecasts less precise.
* [ ] Allow unexpected storm development.
* [ ] Allow storm tracks to shift.
* [ ] Allow forecast high/low errors.
* [ ] Improve forecasts using better weather stations.
* [ ] Allow magic or technology to improve forecasts.

## Weather Display UI

* [ ] Show current temperature.
* [ ] Show feels-like temperature.
* [ ] Show today's high.
* [ ] Show today's low.
* [ ] Show humidity.
* [ ] Show pressure.
* [ ] Show wind speed.
* [ ] Show wind gusts.
* [ ] Show wind direction.
* [ ] Show UV index.
* [ ] Show visibility.
* [ ] Show current weather description.
* [ ] Show precipitation chance.
* [ ] Show seven-day forecast.
* [ ] Show severe weather warnings.
* [ ] Show sunrise and sunset with weather data.

## Weather Icons

* [ ] Define clear weather icon.
* [ ] Define partly cloudy icon.
* [ ] Define cloudy icon.
* [ ] Define rain icon.
* [ ] Define thunderstorm icon.
* [ ] Define snow icon.
* [ ] Define sleet icon.
* [ ] Define hail icon.
* [ ] Define fog icon.
* [ ] Define tornado icon.
* [ ] Define hurricane icon.
* [ ] Define dust storm icon.
* [ ] Define volcanic ash icon.
* [ ] Allow plugins to supply custom weather icons.

## Weather Event Bus

* [ ] Create a common weather event bus.
* [ ] Emit weather-start events.
* [ ] Emit weather-stop events.
* [ ] Emit intensity-change events.
* [ ] Emit temperature-threshold events.
* [ ] Emit wind-threshold events.
* [ ] Emit precipitation events.
* [ ] Emit lightning events.
* [ ] Emit tornado events.
* [ ] Emit hurricane events.
* [ ] Emit flood events.
* [ ] Emit freeze events.
* [ ] Emit fog events.
* [ ] Emit solar storm events.
* [ ] Scope events by affected region.
* [ ] Let POIs subscribe to regional weather events.

## POI Weather Reactions

* [ ] Let houses subscribe to severe wind events.
* [ ] Let houses close windows during severe storms.
* [ ] Let houses close shutters during hurricanes.
* [ ] Let lighthouses respond to dense fog.
* [ ] Let lighthouses respond to severe daytime storms.
* [ ] Let boats respond to marine warnings.
* [ ] Let boats seek docks before major storms.
* [ ] Let docks prepare for storm conditions.
* [ ] Let shops close during severe weather.
* [ ] Let markets clear during dangerous weather.
* [ ] Let farms react to frost warnings.
* [ ] Let mines react to flooding risks.
* [ ] Let observatories react to solar storms.
* [ ] Let towns activate emergency behaviors.

## NPC Weather Reactions

* [ ] Let NPCs seek shelter during heavy rain.
* [ ] Let NPCs seek shelter during hail.
* [ ] Let NPCs flee tornado paths.
* [ ] Let NPCs prepare for hurricanes.
* [ ] Let NPCs wear warmer clothing in cold weather.
* [ ] Let NPCs wear lighter clothing in hot weather.
* [ ] Let NPCs use umbrellas if available.
* [ ] Let NPCs avoid flooded routes.
* [ ] Let NPCs alter work schedules during storms.
* [ ] Let NPCs react to severe weather warnings.

## Animal Weather Reactions

* [ ] Reduce bird activity during severe storms.
* [ ] Let animals seek shelter.
* [ ] Let livestock return to barns.
* [ ] Let pets seek owners during storms.
* [ ] Let wildlife react before severe weather arrives.
* [ ] Let migration respond to seasonal weather.
* [ ] Let insects react to temperature and humidity.

## Sailing and Boats

* [ ] Let wind affect sailing speed.
* [ ] Let wind direction affect sailing routes.
* [ ] Let waves increase with wind.
* [ ] Let storms increase wave danger.
* [ ] Let fog reduce navigation visibility.
* [ ] Let lightning threaten exposed vessels.
* [ ] Let tropical storms create dangerous seas.
* [ ] Let boats seek harbor before severe weather.
* [ ] Let captains use forecasts.
* [ ] Let lighthouses assist ships during poor visibility.

## Roads and Travel

* [ ] Let heavy rain reduce road quality temporarily.
* [ ] Let floods block low roads.
* [ ] Let snow slow road travel.
* [ ] Let ice reduce traction.
* [ ] Let fallen trees block storm-damaged roads.
* [ ] Let dust storms reduce travel speed.
* [ ] Let severe wind affect exposed routes.
* [ ] Recalculate routes around weather hazards.

## Agriculture

* [ ] Let rainfall influence crop growth.
* [ ] Let drought reduce crop yields.
* [ ] Let frost damage sensitive crops.
* [ ] Let hail damage crops.
* [ ] Let flooding damage fields.
* [ ] Let heat waves damage crops.
* [ ] Let snow protect some dormant crops.
* [ ] Let weather influence harvest timing.

## Fire Behavior

* [ ] Let dry weather raise wildfire risk.
* [ ] Let heat waves raise wildfire risk.
* [ ] Let wind accelerate fire spread.
* [ ] Let rain suppress fires.
* [ ] Let snow suppress fires.
* [ ] Let lightning start wildfires.
* [ ] Expose fire-weather conditions to fire systems.

## Rivers and Flooding

* [ ] Increase river flow after heavy rain.
* [ ] Increase river flow after snowmelt.
* [ ] Track soil saturation.
* [ ] Generate localized flooding.
* [ ] Flood low terrain first.
* [ ] Let prolonged rain raise water levels.
* [ ] Let drought lower river levels.
* [ ] Expose flood events to nearby POIs.

## Snowmelt

* [ ] Track stored snowpack.
* [ ] Melt snow based on temperature.
* [ ] Increase runoff during rapid warming.
* [ ] Increase flood risk after heavy snow.
* [ ] Feed streams from mountain snowmelt.
* [ ] Reduce snowpack gradually by altitude.

## Seasonal Climate

* [ ] Shift temperature ranges by season.
* [ ] Shift storm frequency by season.
* [ ] Shift rainfall frequency by season.
* [ ] Shift snow probability by season.
* [ ] Shift hurricane probability by season.
* [ ] Shift tornado probability by season.
* [ ] Shift fog frequency by season.
* [ ] Shift UV levels by season.

## Weather Rendering Interface

* [ ] Let each weather plugin supply 2D effects.
* [ ] Let each weather plugin supply 3D effects.
* [ ] Let plugins supply sky effects.
* [ ] Let plugins supply particle effects.
* [ ] Let plugins supply lighting changes.
* [ ] Let plugins supply fog settings.
* [ ] Let plugins supply post-processing effects.
* [ ] Let plugins supply surface effects.
* [ ] Let plugins supply audio effects.
* [ ] Let plugins supply camera effects.
* [ ] Respect graphics quality and render budgets.

## 2D Weather Rendering

* [ ] Render rain streaks.
* [ ] Render snow particles.
* [ ] Render fog overlays.
* [ ] Render lightning flashes.
* [ ] Render hail.
* [ ] Render dust overlays.
* [ ] Render ash fall.
* [ ] Render ground wetness.
* [ ] Render snow accumulation.
* [ ] Render frost overlays.

## 3D Weather Rendering

* [ ] Use pooled precipitation particles.
* [ ] Spawn precipitation near the camera only.
* [ ] Move precipitation volume with the player.
* [ ] Avoid generating weather over the entire map.
* [ ] Render rain with wind direction.
* [ ] Render snow with turbulence.
* [ ] Render hail with limited physics.
* [ ] Render fog volumetrically where affordable.
* [ ] Render tornado debris with strict particle caps.
* [ ] Render ash and dust with LOD controls.

## Weather Audio

* [ ] Let each weather plugin provide audio.
* [ ] Add light rain loops.
* [ ] Add heavy rain loops.
* [ ] Add wind loops.
* [ ] Add gust sounds.
* [ ] Add thunder.
* [ ] Add hail impacts.
* [ ] Add blizzard ambience.
* [ ] Add tornado ambience.
* [ ] Add hurricane ambience.
* [ ] Add dust storm ambience.
* [ ] Crossfade audio as conditions change.
* [ ] Change weather audio indoors.
* [ ] Change rain audio based on roof material.

## Indoor Weather Handling

* [ ] Reduce outdoor weather particles indoors.
* [ ] Reduce wind audio indoors.
* [ ] Keep rain audible through roofs and windows.
* [ ] Let open windows transmit weather sounds.
* [ ] Let open doors transmit weather sounds.
* [ ] Let weather light changes affect windows.
* [ ] Prevent indoor rain unless structure is damaged.
* [ ] Allow leaks in damaged buildings.

## Weather Damage

* [ ] Let high winds damage weak structures.
* [ ] Let tornadoes damage structures.
* [ ] Let hurricanes damage coastal structures.
* [ ] Let hail damage fragile surfaces.
* [ ] Let lightning damage structures.
* [ ] Let flooding damage interiors.
* [ ] Let heavy snow stress roofs.
* [ ] Let ice damage trees and wires if applicable.
* [ ] Scale damage by structure resilience.

## Severe Weather Warnings

* [ ] Generate severe thunderstorm warnings.
* [ ] Generate tornado watches.
* [ ] Generate tornado warnings.
* [ ] Generate hurricane watches.
* [ ] Generate hurricane warnings.
* [ ] Generate flood warnings.
* [ ] Generate blizzard warnings.
* [ ] Generate heat warnings.
* [ ] Generate freeze warnings.
* [ ] Let warnings propagate through towns and NPCs.

## Weather Stations

* [ ] Allow weather stations as POIs.
* [ ] Let stations record local weather.
* [ ] Let stations improve forecast accuracy.
* [ ] Let players inspect weather instruments.
* [ ] Let stations provide historical climate data.
* [ ] Allow damaged stations to reduce forecast quality.
* [ ] Allow observatories to provide solar forecasts.

## Weather History

* [ ] Record daily high and low temperatures.
* [ ] Record daily precipitation.
* [ ] Record major storm events.
* [ ] Record snowfall totals.
* [ ] Record extreme wind.
* [ ] Record drought periods.
* [ ] Record flood events.
* [ ] Keep history bounded by retention rules.
* [ ] Allow weather records to support quests or research.

## Weather Persistence

* [ ] Persist active pressure systems.
* [ ] Persist active storms.
* [ ] Persist snow accumulation.
* [ ] Persist flood state.
* [ ] Persist drought state.
* [ ] Persist major storm damage.
* [ ] Persist forecast inputs across save/load.
* [ ] Restore deterministic weather after loading.

## Performance

* [ ] Simulate weather by region, not by tile.
* [ ] Update distant weather regions less often.
* [ ] Avoid recalculating forecasts every frame.
* [ ] Cache forecast results.
* [ ] Pool weather particles.
* [ ] Cap weather particles by quality tier.
* [ ] Cull precipitation outside camera range.
* [ ] Avoid thousands of individual weather audio sources.
* [ ] Use shared weather shaders and materials.
* [ ] Yield long weather calculations through generators.
* [ ] Move large forecast calculations to workers if needed.
* [ ] Track weather CPU time in debug snapshots.

## Weather Debug Panel

* [ ] Show current weather plugin.
* [ ] Show current temperature.
* [ ] Show humidity.
* [ ] Show pressure.
* [ ] Show wind speed.
* [ ] Show wind direction.
* [ ] Show gust speed.
* [ ] Show cloud cover.
* [ ] Show precipitation rate.
* [ ] Show visibility.
* [ ] Show UV index.
* [ ] Show dew point.
* [ ] Show current weather region.
* [ ] Show active pressure systems.
* [ ] Show active fronts.
* [ ] Show seven-day forecast.
* [ ] Show severe weather risk.
* [ ] Show subscribed POI event counts.

## Debug Weather Controls

* [ ] Add force-clear-weather control.
* [ ] Add force-rain control.
* [ ] Add force-heavy-rain control.
* [ ] Add force-snow control.
* [ ] Add force-blizzard control.
* [ ] Add force-hail control.
* [ ] Add force-sleet control.
* [ ] Add force-fog control.
* [ ] Add force-thunderstorm control.
* [ ] Add force-tornado control.
* [ ] Add force-hurricane control.
* [ ] Add force-dust-storm control.
* [ ] Add force-volcanic-ash control.
* [ ] Add force-heat-wave control.
* [ ] Add force-cold-wave control.
* [ ] Add force-solar-storm control.
* [ ] Add temperature override.
* [ ] Add humidity override.
* [ ] Add pressure override.
* [ ] Add wind speed override.
* [ ] Add wind direction override.
* [ ] Add weather simulation speed control.
* [ ] Add clear-all-overrides control.

## Debug Visualization

* [ ] Draw pressure-system centers.
* [ ] Draw pressure-system radii.
* [ ] Draw front lines.
* [ ] Draw wind vectors.
* [ ] Draw storm tracks.
* [ ] Draw hurricane forecast cones.
* [ ] Draw tornado paths.
* [ ] Draw precipitation regions.
* [ ] Draw temperature regions.
* [ ] Draw humidity regions.
* [ ] Draw fog regions.
* [ ] Draw weather-region boundaries.
* [ ] Show subscribed POIs on the map.

## Plugin Testing

* [ ] Test weather plugin registration.
* [ ] Test plugin inheritance.
* [ ] Test unsupported capabilities use fallbacks.
* [ ] Test deterministic weather from the same seed.
* [ ] Test biome weather restrictions.
* [ ] Test latitude climate effects.
* [ ] Test altitude temperature effects.
* [ ] Test pressure-system movement.
* [ ] Test front movement.
* [ ] Test forecast generation.
* [ ] Test event subscriptions.
* [ ] Test POI reactions.
* [ ] Test severe weather transitions.
* [ ] Test save/load persistence.
* [ ] Test weather generation time limits.

## Automated Weather Validation

* [ ] Reject snow at impossible temperatures unless plugin allows it.
* [ ] Reject tropical storms far from valid water regions.
* [ ] Reject tornadoes without suitable parent storms.
* [ ] Prevent negative humidity.
* [ ] Clamp humidity to valid ranges.
* [ ] Clamp UV index to configured ranges.
* [ ] Clamp precipitation rates.
* [ ] Validate wind direction.
* [ ] Validate forecast day ordering.
* [ ] Validate sunrise/sunset weather transitions.
* [ ] Validate active plugins against biome capabilities.

A useful architectural split is **climate → weather system → local weather → effect**.
Climate defines what *can* happen, pressure/front systems determine what is
*developing*, local weather describes what is happening *here now*, and each
weather plugin decides how that state looks, sounds, affects gameplay, and emits
events to POIs.
