# UI

- [x] Add ability to toggle Music
- [x] Add ability to toggle Sound

# Music

- [x] Add procedurally generated music that changes based on region or cluster (deep forest may have different music)
- [x] The time of day may change the tempo/mood of the same song
- [x] Generate "instruments" or a procedurally generated sound bank that allows sounds to be used similar to MIDI.
- [x] As you walk near POI that have there own music, the world music may start to fade away, and the POI music starts to fade in
- [x] Music should usually have 4 instruments/tracks for harmony/chords, rhythm/percussion, bass, and malody/lead
- [x] Meloady is often representative of vocals, lead guitar, violin, flute, trumpet, and synth lead
- [x] Harmony is often representative of piano, guitar, organ, strings, and synth pads
- [x] Bass is often representative of bass guitar, upright bass, bass synth, tuba
- [x] A drum track is made of different instruments of drums, cymbals, shakers, percussion
- [x] Songs can simply swap out different intruments for more variety, speed-up/slow-down tempo, or change the key that could be associated with location, danger, combat, weather, time of day, or NPC activity
- [x] Background music should be 1.5 to 4 minutes
- [x] Exploration or town music should be 2-3 minutes long
- [x] Battle tracks are around 1-2 minutes long
- [x] Major boss themese or cinematic pieces can run 3-6 (or more) minutes
- [x] Songs should support looping
- [x] Song structures should have things like intro (4-8 measures), section a (16-32 measures), section b (16-32 measures), variation (16-32 measures), return (8-16) measures, and loop as an example of a 2 minute range (100-120 BPM 4/4 time)
- [x] lean toward shorter modular layers where rhythm, bass, harmony, melody are each built fromo 16-32 measure phrases, then recombine or mute them dynamically to make 2 minutes feel like 10-20 minutes before repetition is noticed
- [x] A song should choose a key and stay mostly inside it. Outside notes may be used occasionally deliberately
- [x] Choose a chord progression before generating melody so that melody favors chord tones on strong beats (D minor chord: D, F, A feel stable)
- [x] Use motives with recognizable 3-8 note idea, and reuse it.
- [x] Add ability to Repeat with variation so phrase A and B are transposed, change endings, shift on rhythm, reverse a small fragment, or change one or two notes
- [x] Add ability to use question-and-answer phrases so phrase 1 feels unfinished; phrase 2 resolved it
- [x] Respect musical meter where in 4/4 beats 1 and 3 feel stronger. Steble notes and chord tones there more often. Passing tones can happen between them.
- [x] Add ability to create rhythmic motifs so melody has a recognizable rhythm
- [x] Add ability to have rests/silence
- [x] Add ability limit melodic jumps so larger leaps are rare and more often followed by movement back in the oppisite direction
- [x] Add ability for bass to primarily play chord roots, occasionally fifths, octaves, and passing tones
- [x] Generator(s) for the different layers should be aware of each layer, and work with each-other - set tempo + meter, chord progression, bass + harmony, work out melody, then percussion reacts to the structure
- [x] Songs should have structural bluebrints before generating notes (intro 8 bars, A16, A'16, B16, A16, Outro 8)
- [x] Generate a melodic contour before generating pitches (start low, rise gradually, reach climax, descend, resolve)
- [x] Every tile type (forest, ruins, plains) should have a music vocabulary (tempo, mode, instruments, melody range, rhythm density, preferred intervals)
- [x] Larger regions/bioms can influence the vocabulary
- [x] A region/biome may use a common four-note motif, but a town uses it slowly, battle theme is aggressive, kings castle ceremonially, ruins uses it in minor, etc.
- [x] Time of day may influence music - ie night time: removing/lowering percussion, slow melody, higher reverb, soft harmony
- [x] Seasons may influence music - ie winter: same motif, bells, sparser arrangement, higher register
- [x] Compat may influence music - ie same motif, faster rhythm, lower bass, strong percussion, changed harmony
- [x] Music should support different instrument types for the tracks rather than just sine, square, sawtooth

# Debug

- [x] List all debug pages under /debug
- [x] Create a page to generate, visualize, and listen to music - consider the MIDI visualizer from my repo here: https://github.com/lewismoten/Athens-Acropolis-4507/tree/master/soundtrack
- [x] The "Play Song" button should change to "Stop Song" while it is playing, and change back when its not.
- [x] Tracks (other than percussion) should give a visual indication of notes being played on the scale in addition to showing solid bars.
- [x] Add a Download button to download the song as a MIDI file

# Sound Effects

- [x] Add sound effects for walking / jumping
- [x] Add sound effects for walking into a tree
- [x] add sound effects for walking over different types of roads, bridges, etc.
- [x] Sound is played based on position of where it was emitted, and distance
- [x] When items, doors, corpses are opened and closed
- [x] Combat sounds with different weapons / magic
- [x] Skill advancement, level up, etc.
- [x] Allow random ocean tiles to generate ocean sounds as ambiance so only one or two can be heard within the players hearing distance
- [x] Allow the user to toggle ambiance sounds
- [x] All tiles and POI support ambiance. Base tiles have a lower chance of playing ambiance as a sound source so that only 1 or two are within the players hearing distance.

# Development checklist

## Procedurally Generated Sound Effects

### Core Sound Generation

- [ ] Create a reusable procedural sound-effect generator using the Web Audio API.
- [ ] Support deterministic sound generation from a seed so the same event can reproduce the same basic sound.
- [ ] Support controlled randomness so repeated sounds vary without losing their identity.
- [ ] Support multiple oscillator types including sine, triangle, square, and sawtooth waves.
- [ ] Support white, pink, and brown noise sources for natural and textured sounds.
- [ ] Support combining multiple oscillators and noise sources into one sound.
- [ ] Support frequency sweeps for impacts, magic, machinery, movement, and UI effects.
- [ ] Support amplitude envelopes with configurable attack, decay, sustain, and release.
- [ ] Support pitch envelopes independent of volume envelopes.
- [ ] Support filters including low-pass, high-pass, band-pass, and notch filters.
- [ ] Support configurable filter envelopes that change throughout a sound.
- [ ] Support distortion and saturation for impacts, machinery, monsters, and aggressive sounds.
- [ ] Support delay and echo.
- [ ] Support procedural reverb or reusable impulse-response environments.
- [ ] Support tremolo through amplitude modulation.
- [ ] Support vibrato through frequency modulation.
- [ ] Support frequency modulation for metallic, magical, bell-like, and unusual sounds.
- [ ] Support ring modulation for unnatural, technological, and magical sounds.
- [ ] Support layered sounds where individual components start at different times.
- [ ] Support procedural sound duration based on the event producing the sound.
- [ ] Allow generated sounds to be rendered into reusable audio buffers when regeneration is unnecessary.

### Sound Identity

- [ ] Give every sound category a recognizable sonic identity.
- [ ] Define a base recipe for each type of sound rather than generating it completely randomly.
- [ ] Allow small variations in pitch while preserving the recognizable base sound.
- [ ] Allow small variations in timing.
- [ ] Allow small variations in volume.
- [ ] Allow small variations in oscillator parameters.
- [ ] Allow small variations in filtering.
- [ ] Allow variation in individual layers without changing every layer simultaneously.
- [ ] Define acceptable parameter ranges separately for every sound family.
- [ ] Prevent randomization from producing sounds outside the intended character of the source.
- [ ] Allow important objects, creatures, spells, and locations to have their own recurring sound signatures.
- [ ] Allow related objects to inherit characteristics from a common sound family.

### Repetition Prevention

- [ ] Prevent an identical sound variation from playing twice consecutively when alternatives are available.
- [ ] Maintain recent-variation history for frequently repeated sounds.
- [ ] Use weighted variation rather than unrestricted randomization.
- [ ] Increase variation for sounds that occur frequently.
- [ ] Use less variation for sounds that need strong player recognition.
- [ ] Randomize individual sound layers independently.
- [ ] Support round-robin variation sets generated procedurally.
- [ ] Occasionally introduce rare variations for commonly heard sounds.
- [ ] Prevent extreme pitch or timing combinations caused by overlapping random parameters.
- [ ] Ensure procedural variation remains subtle enough that objects retain a consistent audio identity.

---

# Environment and Ambient Sound

### Environmental Soundscapes

- [ ] Generate ambient soundscapes based on biome.
- [ ] Give forests characteristic birds, insects, leaves, branches, and distant wildlife.
- [ ] Give deserts wind, sand, insects, and sparse wildlife.
- [ ] Give mountains stronger winds, echoes, rock movement, and distant animals.
- [ ] Give swamps insects, frogs, water movement, bubbles, and birds.
- [ ] Give coastal areas waves, wind, seabirds, and shoreline movement.
- [ ] Give plains grass movement, insects, birds, and distant animals.
- [ ] Give snowy regions wind, snow movement, cracking ice, and muffled ambience.
- [ ] Give volcanic areas rumbling, cracking stone, steam, and lava activity.
- [ ] Give caves dripping water, distant movement, echoes, rock sounds, and underground wind.
- [ ] Give magical environments their own unnatural ambient layers.
- [ ] Generate ambient density based on how biologically active an area should be.
- [ ] Vary ambient sounds according to altitude.
- [ ] Vary ambient sounds according to nearby terrain.
- [ ] Blend ambience smoothly when traveling between biomes.
- [ ] Avoid abruptly replacing the entire ambient soundscape at biome boundaries.

### Living Ambient Events

- [ ] Generate occasional nearby bird calls.
- [ ] Generate occasional distant bird calls.
- [ ] Generate insect activity appropriate to location and season.
- [ ] Generate branches moving or breaking.
- [ ] Generate distant animal calls.
- [ ] Generate rustling vegetation.
- [ ] Generate falling rocks in mountainous environments.
- [ ] Generate random water splashes near bodies of water.
- [ ] Generate distant unexplained sounds to encourage exploration.
- [ ] Allow rare ambient sounds to hint at nearby creatures, landmarks, or events.

---

# Weather

- [ ] Generate procedural rain sounds.
- [ ] Adjust rain intensity continuously instead of using only preset light/medium/heavy states.
- [ ] Change rain sound depending on the surface surrounding the player.
- [ ] Generate rain impacts on roofs separately from open-air rain.
- [ ] Generate rain impacts on leaves.
- [ ] Generate rain impacts on water.
- [ ] Generate procedural thunder.
- [ ] Calculate thunder delay from lightning distance.
- [ ] Change thunder characteristics according to storm distance.
- [ ] Generate multiple thunder components such as initial crack, rumble, and distant reflections.
- [ ] Generate wind intensity from actual weather conditions.
- [ ] Make trees and vegetation respond audibly to wind intensity.
- [ ] Generate wind whistling around buildings and openings.
- [ ] Generate snowstorm ambience.
- [ ] Generate hail impacts according to surrounding materials.
- [ ] Generate sandstorm ambience.
- [ ] Generate tornado or extreme-wind sounds where applicable.
- [ ] Make weather acoustically quieter inside buildings.
- [ ] Allow weather sounds to enter through open windows and doors.

---

# Time of Day

- [ ] Change ambient wildlife as day becomes night.
- [ ] Generate dawn-specific bird activity.
- [ ] Reduce daytime insect sounds after sunset where appropriate.
- [ ] Increase cricket and nocturnal insect activity at night.
- [ ] Introduce owl and nocturnal animal calls.
- [ ] Change settlement ambience according to time of day.
- [ ] Reduce market and work sounds after businesses close.
- [ ] Introduce tavern and entertainment sounds during evening hours.
- [ ] Reduce village activity late at night.
- [ ] Generate rooster, livestock, bells, or work sounds around dawn.
- [ ] Make nighttime environments noticeably quieter without making them completely silent.

---

# Seasons

- [ ] Change animal sounds according to season.
- [ ] Change insect populations according to season.
- [ ] Change bird populations through migration.
- [ ] Add spring frog and insect activity.
- [ ] Increase summer insects.
- [ ] Add autumn leaf sounds.
- [ ] Generate dry-leaf footsteps during autumn.
- [ ] Generate snow footsteps during winter.
- [ ] Generate ice cracking and frozen-water ambience.
- [ ] Reduce wildlife activity during harsh winter conditions.
- [ ] Generate seasonal storms.
- [ ] Associate certain rare ambient sounds with particular seasons.

---

# Footsteps and Movement

- [ ] Generate footsteps based on terrain material.
- [ ] Support dirt footsteps.
- [ ] Support grass footsteps.
- [ ] Support mud footsteps.
- [ ] Support sand footsteps.
- [ ] Support gravel footsteps.
- [ ] Support rock footsteps.
- [ ] Support wood footsteps.
- [ ] Support metal footsteps.
- [ ] Support stone-floor footsteps.
- [ ] Support snow footsteps.
- [ ] Support shallow-water footsteps.
- [ ] Support vegetation footsteps.
- [ ] Change footsteps based on walking speed.
- [ ] Change footsteps when running.
- [ ] Change footsteps when sneaking.
- [ ] Change footsteps based on character weight.
- [ ] Change footsteps based on footwear.
- [ ] Add equipment movement sounds while walking.
- [ ] Add armor rattling proportional to armor type.
- [ ] Add backpack or inventory movement when appropriate.
- [ ] Generate landing sounds according to fall distance.
- [ ] Generate jumping sounds.
- [ ] Generate climbing sounds based on surface.
- [ ] Generate swimming strokes.
- [ ] Generate wading sounds based on water depth.
- [ ] Synchronize footsteps precisely with animation.
- [ ] Avoid playing footsteps simply based on a timer when the character's feet have not contacted the ground.

---

# Combat

### Melee Combat

- [ ] Generate weapon swing sounds according to weapon size and speed.
- [ ] Generate impact sounds based on weapon material.
- [ ] Generate impact sounds based on target material.
- [ ] Distinguish successful hits from misses.
- [ ] Distinguish blocked attacks from direct hits.
- [ ] Generate shield impacts.
- [ ] Generate weapon-on-weapon impacts.
- [ ] Generate armor impacts.
- [ ] Generate critical-hit accents without making every critical hit identical.
- [ ] Make heavy weapons sound heavier than light weapons.
- [ ] Modify impact intensity based on attack velocity.
- [ ] Generate scrape and glancing-hit sounds separately from direct impacts.
- [ ] Generate weapon breakage sounds.

### Ranged Combat

- [ ] Generate bow draw sounds.
- [ ] Generate bowstring release sounds.
- [ ] Generate arrow flight sounds when sufficiently close.
- [ ] Generate arrow impacts according to target material.
- [ ] Generate crossbow mechanical sounds.
- [ ] Generate sling or thrown-weapon sounds.
- [ ] Generate projectile ricochets where appropriate.

### Damage and Character Reactions

- [ ] Generate nonverbal character exertion sounds.
- [ ] Generate pain reactions appropriate to damage severity.
- [ ] Generate falling and collapse sounds.
- [ ] Generate armor and equipment noise during falls.
- [ ] Prevent character vocal reactions from repeating excessively.
- [ ] Limit vocalization frequency so combat does not become noisy or irritating.

---

# Weapons and Equipment

- [ ] Give each weapon family a distinctive procedural sound profile.
- [ ] Vary weapon sounds according to material.
- [ ] Vary weapon sounds according to size.
- [ ] Vary weapon sounds according to condition.
- [ ] Make damaged weapons sound different from well-maintained weapons.
- [ ] Generate weapon-drawing sounds.
- [ ] Generate weapon-sheathing sounds.
- [ ] Generate shield handling sounds.
- [ ] Generate armor-equipping sounds.
- [ ] Generate clothing-equipping sounds.
- [ ] Generate inventory equipment movement.
- [ ] Allow legendary or magical equipment to have unique subtle audio signatures.

---

# Magic and Abilities

- [ ] Give each school of magic its own sonic vocabulary.
- [ ] Generate spell-charging sounds.
- [ ] Generate spell-release sounds.
- [ ] Generate spell-flight sounds.
- [ ] Generate spell-impact sounds.
- [ ] Generate sustained spell-loop sounds.
- [ ] Tie spell intensity to magical power.
- [ ] Tie spell pitch or complexity to spell level.
- [ ] Generate fire magic using filtered noise, crackling, and low-frequency components.
- [ ] Generate ice magic using brittle, crystalline, and high-frequency components.
- [ ] Generate lightning magic using sharp transients and electrical noise.
- [ ] Generate earth magic using low-frequency impacts and granular textures.
- [ ] Generate wind magic using filtered noise.
- [ ] Generate healing magic with harmonically stable tones.
- [ ] Generate dark or corrupt magic using dissonance and modulation.
- [ ] Generate teleportation arrival and departure sounds separately.
- [ ] Give individual important spells recognizable motifs.
- [ ] Prevent powerful spells from becoming painfully loud compared with ordinary gameplay.

---

# Creatures and Animals

- [ ] Give each species a procedural vocal profile.
- [ ] Generate multiple call types rather than one generic animal sound.
- [ ] Support idle calls.
- [ ] Support warning calls.
- [ ] Support aggressive calls.
- [ ] Support pain sounds.
- [ ] Support attack sounds.
- [ ] Support social communication between creatures.
- [ ] Alter vocal pitch according to creature size.
- [ ] Allow individuals within a species to have slightly different voices.
- [ ] Generate breathing for sufficiently close large creatures.
- [ ] Generate creature footsteps according to anatomy and weight.
- [ ] Generate wing flaps based on creature size.
- [ ] Generate tail or body movement where appropriate.
- [ ] Generate eating and drinking sounds.
- [ ] Let animals react audibly to nearby predators.
- [ ] Let creatures call to one another across distances.
- [ ] Allow some creature sounds to function as gameplay clues.

---

# NPCs and Settlements

- [ ] Generate crowd ambience according to population density.
- [ ] Increase settlement sound activity during business hours.
- [ ] Generate distant conversations without requiring understandable speech.
- [ ] Generate children playing where appropriate.
- [ ] Generate craftsmen working.
- [ ] Generate livestock.
- [ ] Generate carts and wagons.
- [ ] Generate marketplace activity.
- [ ] Generate tavern ambience.
- [ ] Generate festivals.
- [ ] Generate religious ceremonies and bells.
- [ ] Generate guard activity.
- [ ] Make settlement ambience reflect prosperity.
- [ ] Make poor or abandoned settlements noticeably quieter.
- [ ] Make settlement ambience respond to emergencies.
- [ ] Change settlement sounds during attacks or sieges.
- [ ] Allow major NPC activities to contribute audible sounds to the surrounding area.

---

# Buildings and Interactive Objects

- [ ] Generate wooden-door opening and closing sounds.
- [ ] Generate metal-door sounds.
- [ ] Generate stone-door sounds.
- [ ] Generate door creaks based on condition.
- [ ] Generate lock sounds.
- [ ] Generate lock-picking sounds.
- [ ] Generate chest-opening sounds.
- [ ] Generate drawer and cabinet sounds.
- [ ] Generate lever sounds.
- [ ] Generate button and switch sounds.
- [ ] Generate gates and portcullises.
- [ ] Generate elevators or lifts.
- [ ] Generate drawbridges.
- [ ] Generate rope and pulley systems.
- [ ] Generate structural creaks based on building material and age.
- [ ] Generate window sounds.
- [ ] Allow broken or poorly maintained objects to sound different.

---

# Crafting and Professions

- [ ] Generate blacksmith hammer impacts with slight variation.
- [ ] Change blacksmith sounds according to metal and tool.
- [ ] Generate forge and bellows sounds.
- [ ] Generate woodworking sounds.
- [ ] Generate sawing sounds.
- [ ] Generate mining impacts based on rock and ore.
- [ ] Generate stonecutting sounds.
- [ ] Generate cooking sounds.
- [ ] Generate alchemy bubbling and mixing.
- [ ] Generate grinding and milling.
- [ ] Generate weaving and textile-work sounds.
- [ ] Generate farming activity.
- [ ] Generate fishing sounds.
- [ ] Generate construction sounds.
- [ ] Let active professions contribute to settlement ambience.

---

# Destruction and Physics

- [ ] Generate impacts based on object material.
- [ ] Generate breakage based on material.
- [ ] Generate wood cracking and splintering.
- [ ] Generate glass breaking.
- [ ] Generate stone crumbling.
- [ ] Generate metal bending or breaking.
- [ ] Generate pottery breaking.
- [ ] Generate objects rolling based on shape and material.
- [ ] Generate objects bouncing.
- [ ] Generate scraping according to contacting materials.
- [ ] Generate dragging sounds.
- [ ] Scale impact sounds according to mass and velocity.
- [ ] Generate secondary debris impacts after destruction.
- [ ] Limit the number of simultaneous debris sounds.

---

# Water and Fire

### Water

- [ ] Generate flowing-water ambience according to flow speed.
- [ ] Generate streams separately from large rivers.
- [ ] Generate waterfalls based on size and distance.
- [ ] Generate ocean waves.
- [ ] Generate shoreline impacts according to terrain.
- [ ] Generate dripping water.
- [ ] Generate splashes based on object mass.
- [ ] Generate underwater ambience.
- [ ] Apply underwater filtering to external sounds.
- [ ] Generate bubbles and underwater movement.

### Fire

- [ ] Generate procedural crackling.
- [ ] Scale fire sound according to fire size.
- [ ] Generate occasional pops and sparks.
- [ ] Generate low-frequency roar for large fires.
- [ ] Generate burning-material differences.
- [ ] Make burning wood sound different from burning vegetation.
- [ ] Make magical fire distinguishable from normal fire.
- [ ] Generate distant wildfire ambience.

---

# Spatial Audio and Acoustic Environment

- [ ] Position world sounds in 3D space.
- [ ] Apply distance attenuation.
- [ ] Define maximum audible distances by sound category.
- [ ] Avoid calculating inaudible distant sounds unnecessarily.
- [ ] Pan sounds according to listener orientation.
- [ ] Model vertical position where useful.
- [ ] Apply sound occlusion when walls or terrain block the source.
- [ ] Apply partial occlusion instead of simply making sounds disappear.
- [ ] Make sounds behind closed doors quieter and darker.
- [ ] Allow open doors and windows to transmit sound.
- [ ] Apply indoor reverberation.
- [ ] Apply cave reverberation.
- [ ] Apply large-hall reverberation.
- [ ] Apply outdoor echoes in mountains and valleys.
- [ ] Vary reverb according to room size and materials.
- [ ] Crossfade acoustic environments when moving between spaces.
- [ ] Apply underwater acoustic filtering.
- [ ] Allow especially loud sounds to travel substantially farther than ordinary sounds.

---

# Audio Importance and Mixing

- [ ] Establish sound categories such as UI, speech, combat, environment, creatures, and music.
- [ ] Provide separate player volume controls for major audio categories.
- [x] Give critical gameplay sounds higher priority.
- [x] Reduce unimportant ambience when important sounds occur.
- [ ] Duck music slightly during important dialogue.
- [x] Prevent large numbers of identical nearby sounds from overwhelming the mix.
- [ ] Combine very dense environmental events into aggregate ambience where appropriate.
- [x] Limit simultaneous voices through a priority system.
- [x] Stop inaudible low-priority sounds first when reaching voice limits.
- [x] Prevent clipping when many sounds occur simultaneously.
- [ ] Normalize generated sounds to reasonable loudness ranges.
- [ ] Reserve dynamic range for major events.
- [ ] Ensure extremely close sounds do not become painfully loud.

---

# Procedural Audio Performance

- [ ] Pool reusable AudioNodes where practical.
- [ ] Avoid unnecessary allocations during frequently occurring sounds.
- [ ] Cache complex generated AudioBuffers.
- [ ] Generate reusable sound families ahead of time when appropriate.
- [ ] Generate rare sounds only when needed.
- [ ] Limit active procedural oscillators.
- [ ] Stop and disconnect completed AudioNodes.
- [ ] Prevent orphaned Web Audio nodes.
- [ ] Profile AudioContext CPU usage.
- [ ] Profile garbage collection during heavy combat and ambient scenes.
- [ ] Establish a maximum simultaneous procedural-sound budget.
- [ ] Reduce sound complexity dynamically when system performance falls.
- [ ] Suspend audio processing for distant or inactive regions.
- [ ] Avoid generating detailed sounds server-side unless gameplay synchronization requires it.

---

# Multiplayer Sound Behavior

- [ ] Determine which sounds are purely client-side.
- [ ] Determine which sound events must be synchronized by the server.
- [ ] Send event parameters rather than transmitting generated audio.
- [ ] Use deterministic seeds when multiple clients should hear equivalent variations.
- [ ] Allow harmless ambience to differ between clients.
- [ ] Synchronize major world-event sounds.
- [ ] Synchronize important musical transitions when needed.
- [ ] Avoid synchronizing every small environmental sound.
- [ ] Respect player distance when transmitting sound-producing network events.
- [ ] Prevent malicious clients from triggering unlimited audio events.

---

# Accessibility

- [ ] Provide subtitles or visual indicators for gameplay-critical sounds.
- [ ] Indicate the direction of important off-screen sounds when accessibility options enable it.
- [ ] Provide independent music, effects, ambience, and voice volume.
- [ ] Avoid gameplay mechanics that require perfect pitch recognition.
- [ ] Avoid critical information that can only be identified through stereo positioning.
- [ ] Provide alternatives for players using mono audio.
- [ ] Avoid excessive high-frequency sounds.
- [ ] Avoid unexpectedly extreme volume changes.
- [ ] Provide reduced-intensity options for startling sounds.
- [ ] Allow repetitive ambient sounds to be reduced or disabled.

---

# Instrument Sound Generation for Procedural Songs

This should be its **own synthesis system**. Unlike an explosion or footstep, an instrument must produce predictable pitches across potentially many octaves while maintaining a consistent timbre.

## Instrument Architecture

- [ ] Create a common procedural instrument interface.
- [ ] Allow an instrument to play any requested musical note.
- [ ] Convert MIDI note numbers or note names into exact frequencies.
- [ ] Support configurable velocity.
- [ ] Support note duration.
- [ ] Support note-on and note-off events.
- [ ] Support polyphonic instruments.
- [ ] Support monophonic instruments.
- [ ] Support maximum simultaneous voice limits per instrument.
- [ ] Implement voice stealing when polyphony limits are reached.
- [ ] Allow instruments to respond differently at different velocities.
- [ ] Allow instruments to respond differently across pitch ranges.

## Oscillator-Based Instrument Synthesis

- [ ] Support sine-wave oscillators.
- [ ] Support triangle-wave oscillators.
- [ ] Support square-wave oscillators.
- [ ] Support sawtooth-wave oscillators.
- [ ] Support custom periodic waveforms.
- [ ] Allow multiple oscillators per instrument voice.
- [ ] Allow oscillator detuning.
- [ ] Allow octave layering.
- [ ] Allow harmonic layering.
- [ ] Support sub-oscillators.
- [ ] Support oscillator phase variation.
- [ ] Support pulse-width modulation where appropriate.

## Harmonics and Timbre

- [ ] Represent instrument timbre through multiple harmonics rather than only the fundamental frequency.
- [ ] Define harmonic amplitude profiles for each instrument family.
- [ ] Allow harmonic strength to change as a note evolves.
- [ ] Allow timbre to change according to pitch.
- [ ] Allow timbre to change according to velocity.
- [ ] Model stronger high-frequency harmonics on aggressively played notes.
- [ ] Model softer harmonic content for gently played notes.
- [ ] Support slight inharmonicity for bells and metallic instruments.
- [ ] Avoid making every instrument sound like a basic synthesizer oscillator.

## Instrument Envelopes

- [ ] Give every instrument family an appropriate amplitude envelope.
- [ ] Use fast attacks for struck and plucked instruments.
- [ ] Use slower attacks for bowed strings and pads.
- [ ] Use natural decay for piano-like instruments.
- [ ] Support sustained notes for organs and winds.
- [ ] Model release behavior independently from attack and decay.
- [ ] Change envelope characteristics according to note velocity.
- [ ] Allow slightly randomized envelopes for humanized performances.

## Plucked Instruments

- [ ] Implement plucked-string synthesis.
- [ ] Consider Karplus–Strong synthesis for strings.
- [ ] Generate guitar-like instruments.
- [ ] Generate lute-like instruments.
- [ ] Generate harp-like instruments.
- [ ] Generate mandolin-like instruments.
- [ ] Generate banjo-like instruments.
- [ ] Generate fantasy plucked instruments.
- [ ] Vary brightness according to simulated plucking position.
- [ ] Model string damping.
- [ ] Add sympathetic resonance where performance allows.
- [ ] Vary individual string character slightly.

## Bowed Strings

- [ ] Generate violin-like instruments.
- [ ] Generate viola-like instruments.
- [ ] Generate cello-like instruments.
- [ ] Generate bass-string instruments.
- [ ] Model slower onset caused by bowing.
- [ ] Add controlled vibrato.
- [ ] Allow vibrato depth to change over sustained notes.
- [ ] Model bow pressure through harmonic brightness.
- [ ] Model expressive swells.
- [ ] Allow connected notes to behave differently from individually articulated notes.

## Wind Instruments

- [ ] Generate flute-like instruments.
- [ ] Generate recorder-like instruments.
- [ ] Generate whistle-like instruments.
- [ ] Generate reed instruments.
- [ ] Generate horn-like instruments.
- [ ] Add breath-noise components.
- [ ] Vary breath noise according to velocity.
- [ ] Add slight pitch instability.
- [ ] Model natural vibrato.
- [ ] Allow legato phrasing.
- [ ] Prevent unrealistic instantaneous transitions between notes.

## Brass Instruments

- [ ] Generate trumpet-like sounds.
- [ ] Generate horn-like sounds.
- [ ] Generate trombone-like sounds.
- [ ] Generate tuba-like sounds.
- [ ] Increase harmonic brightness with playing intensity.
- [ ] Model breath attack.
- [ ] Add controlled pitch instability.
- [ ] Support expressive swells.
- [ ] Allow brass instruments to become more aggressive at high velocity.

## Keyboards

- [ ] Generate piano-like sounds.
- [ ] Model hammer-strike transient separately from string resonance.
- [ ] Vary piano brightness with velocity.
- [ ] Generate harpsichord-like sounds.
- [ ] Generate organ-like sounds.
- [ ] Support organ drawbar-style harmonic combinations.
- [ ] Generate celesta-like sounds.
- [ ] Generate fantasy keyboard instruments.
- [ ] Support sustain behavior.
- [ ] Model note release where useful.

## Percussion Instruments

- [ ] Generate kick drums.
- [ ] Generate snares.
- [ ] Generate toms.
- [ ] Generate hand drums.
- [ ] Generate frame drums.
- [ ] Generate bongos or similar small drums.
- [ ] Generate cymbals.
- [ ] Generate hi-hats.
- [ ] Generate shakers.
- [ ] Generate tambourines.
- [ ] Generate wood blocks.
- [ ] Generate bells.
- [ ] Generate gongs.
- [ ] Generate triangles.
- [ ] Generate fantasy percussion.
- [ ] Vary drum strike pitch slightly.
- [ ] Vary drum timbre slightly.
- [ ] Vary velocity substantially enough to create musical dynamics.
- [ ] Prevent repeated percussion hits from sounding like a machine gun.

## Bass Instruments

- [ ] Generate plucked acoustic bass.
- [ ] Generate bowed bass.
- [ ] Generate electric-style bass.
- [ ] Generate synthetic bass.
- [ ] Ensure bass maintains clarity on small speakers.
- [ ] Prevent excessive sub-bass from overwhelming the mix.
- [ ] Let bass articulation follow musical context.
- [ ] Support slides and connecting notes where stylistically appropriate.

---

# Instrument Articulation

- [ ] Support staccato.
- [ ] Support legato.
- [ ] Support accents.
- [ ] Support sustained notes.
- [ ] Support crescendos.
- [ ] Support diminuendos.
- [ ] Support vibrato.
- [ ] Support tremolo.
- [ ] Support trills.
- [ ] Support grace notes.
- [ ] Support slides or glissando.
- [ ] Support arpeggiated articulation.
- [ ] Allow articulation choices to depend on instrument type.
- [ ] Prevent articulation combinations that are physically implausible for an instrument.

---

# Humanization

This will make a **huge difference** between something that sounds synthesized and something that sounds performed.

- [ ] Introduce tiny note-timing variations.
- [ ] Introduce small velocity variations.
- [ ] Introduce very small pitch variations where appropriate.
- [ ] Avoid making every chord note begin at exactly the same millisecond.
- [ ] Slightly stagger chord notes according to instrument.
- [ ] Let percussion drift subtly around the perfect grid.
- [ ] Allow some instruments to play slightly ahead of the beat.
- [ ] Allow some instruments to play slightly behind the beat.
- [ ] Keep timing variation small enough that the music remains rhythmically coherent.
- [ ] Give different virtual musicians different humanization profiles.
- [ ] Maintain consistent performance characteristics throughout a song.
- [ ] Avoid independently randomizing every note.
- [ ] Base performance variation partially on surrounding notes and phrases.

---

# Instrument Roles Within Songs

- [ ] Assign each instrument a musical role.
- [ ] Distinguish melody instruments from harmony instruments.
- [ ] Distinguish bass instruments from percussion.
- [ ] Prevent every instrument from competing in the same frequency range.
- [ ] Limit how many instruments play simultaneously.
- [ ] Allow instruments to enter and leave between song sections.
- [ ] Use orchestration changes to create song development.
- [ ] Introduce instruments gradually during buildups.
- [ ] Remove instruments during quieter sections.
- [ ] Reserve some instruments for climactic sections.
- [ ] Change instrument combinations between variations of the same song.
- [ ] Keep the primary melodic identity recognizable when instrumentation changes.

---

# Procedural Composition Rules

- [ ] Choose a key before generating notes.
- [ ] Choose a musical mode.
- [ ] Choose a tempo.
- [ ] Choose a meter.
- [ ] Generate a song structure before generating individual notes.
- [ ] Generate chord progressions before melodies.
- [ ] Define harmonic tension and resolution.
- [ ] Generate recurring melodic motifs.
- [ ] Generate recurring rhythmic motifs.
- [ ] Repeat phrases with controlled variation.
- [ ] Use question-and-answer phrasing.
- [ ] Prefer chord tones on strong beats.
- [ ] Use passing tones primarily between stable notes.
- [ ] Limit excessive melodic leaps.
- [ ] Encourage stepwise melodic movement.
- [ ] Make large leaps occasionally meaningful.
- [ ] Bias movement back toward the established melodic range after large jumps.
- [ ] Establish melodic contour.
- [ ] Give phrases recognizable beginnings and endings.
- [ ] End major sections with appropriate harmonic resolution.
- [ ] Use rests deliberately.
- [ ] Avoid filling every possible beat with a note.
- [ ] Establish tension curves across sections.
- [ ] Establish energy curves across entire songs.
- [ ] Create a recognizable climax.
- [ ] Prevent arbitrary key changes.
- [ ] Make key changes deliberate musical events.
- [ ] Reuse thematic material throughout a song.

---

# Musical Location Identity

This is where procedural music could become particularly valuable in an MMORPG.

- [ ] Give each biome a musical vocabulary.
- [ ] Give each civilization a musical vocabulary.
- [ ] Give each culture characteristic instruments.
- [ ] Give important towns recognizable motifs.
- [ ] Give kingdoms or factions recurring themes.
- [ ] Allow regional songs to share motifs without being identical.
- [ ] Give dangerous regions darker harmonic tendencies.
- [ ] Give peaceful settlements less rhythmically aggressive arrangements.
- [ ] Associate unusual scales or modes with magical areas.
- [ ] Give ruins altered versions of the music associated with their former civilization.
- [ ] Allow musical instrumentation to reflect regional resources and culture.
- [ ] Make nearby settlements musically related when they share history.

---

# Dynamic Music

- [ ] Change musical intensity when enemies approach.
- [ ] Transition into combat without abruptly restarting the music.
- [ ] Preserve the current harmony when adding combat layers.
- [ ] Remove combat layers gradually after danger passes.
- [ ] Create nighttime arrangements from daytime themes.
- [ ] Create seasonal arrangements from existing themes.
- [ ] Alter instrumentation according to weather.
- [ ] Introduce special instrumentation during festivals.
- [ ] Change music during major world events.
- [ ] Change musical intensity according to settlement danger.
- [ ] Reflect prosperity or decline through arrangement.
- [ ] Use corrupted versions of familiar motifs when locations become corrupted.
- [ ] Allow dungeon music to evolve as the player progresses deeper.
- [ ] Reserve special musical elements for discoveries.
- [ ] Introduce musical cues when approaching important landmarks.
- [ ] Allow boss music to incorporate the surrounding region's theme.
- [ ] Transition between music states on measure or phrase boundaries instead of arbitrary milliseconds.

---

# Procedural Song Memory and Identity

- [x] Generate a persistent `SongDNA` description for important songs.
- [x] Store key, mode, tempo, meter, motifs, progression, and instrumentation in the song identity.
- [x] Regenerate the same core song from its seed.
- [x] Allow variations to share the original SongDNA.
- [x] Preserve recognizable melodies across arrangements.
- [x] Generate night versions from the same underlying composition.
- [x] Generate combat versions from the same underlying composition.
- [x] Generate seasonal versions from the same underlying composition.
- [x] Generate historical or ruined versions of familiar themes.
- [x] Let important NPCs have musical motifs that can appear inside other music.
- [x] Let factions have motifs that can be combined when factions interact.
- [x] Allow players to recognize locations from musical themes even when the exact generated performance differs.

---

# Mixing Procedural Instruments

- [x] Place instruments appropriately in the stereo field.
- [x] Give lead instruments enough space in the frequency spectrum.
- [x] Keep bass primarily centered.
- [x] Prevent low-frequency buildup.
- [x] Prevent multiple harmony instruments from masking each other.
- [x] Apply instrument-specific EQ.
- [x] Apply shared room reverb to make instruments sound like they occupy the same space.
- [x] Adjust reverb according to the fictional performance environment.
- [x] Use compression carefully rather than flattening all dynamics.
- [x] Balance procedural music against sound effects.
- [x] Automatically duck music when particularly important gameplay sounds occur.
- [x] Establish consistent loudness across procedurally generated songs.
- [ ] Test mixes through headphones, speakers, laptop speakers, and mono playback.

---

# One Architecture Worth Considering

I would keep the **sound source**, **event**, and **environment** separate. For example:

```ts
interface SoundEvent {
  type: SoundType;
  source: SoundSource;
  material?: Material;
  intensity: number;
  position: Vector3;
  seed: number;
}
```

Then let the audio engine interpret it:

```text
Sword strikes wooden shield
        ↓
Event
  weapon = sword
  target = wood
  velocity = 0.72
  location = x,y,z
        ↓
Sound Recipe
  metallic transient
  wood impact
  low thump
  scrape
        ↓
Variation
  pitch ± small amount
  timing ± small amount
  different transient
        ↓
Environment
  distance
  occlusion
  cave reverb
        ↓
Final Sound
```

And I would do something similar for music:

```text
World state
   ↓
Musical identity / SongDNA
   ↓
Composition
   ├── Harmony
   ├── Bass
   ├── Melody
   └── Rhythm
          ↓
Performance
   ├── Instrument synthesis
   ├── Articulation
   └── Humanization
          ↓
Dynamic arrangement
          ↓
Mix
```

That distinction is important: **composition decides what is played; instrument synthesis decides what the notes sound like; performance decides how those notes are played.**

If you preserve those as separate systems, you'll have much more freedom later to make the same composition sound like a tavern quartet, royal orchestra, creepy abandoned-town version, battle arrangement, or 8-bit-style rendition without having to regenerate the actual song.
