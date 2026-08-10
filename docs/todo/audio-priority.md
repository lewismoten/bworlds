# Highest Priority

# Improve Procedural Music Quality

## Critical Validation

- [x] Fail songs whose final cadence does not reach the tonic.
- [x] Fail songs whose lead contour misses its required ending.
- [x] Fail songs whose climax occurs in the wrong phrase.
- [x] Fail songs whose bass roots drift from the chord plan.
- [x] Fail songs whose harmony drifts from the chord plan.
- [x] Treat cadence drift as an export failure.
- [x] Do not mark a MIDI audit valid when warnings are critical.
- [ ] Regenerate only the failed phrase before rebuilding the song.
- [ ] Report the exact measure and note for each failure.
- [ ] Visualization of tracks should show only the bar instead of a dot, and the bar is shorter, and at the level at which the notes are being played (where the dot is now). bars are semi-transparent, in that if multiple notes are playing, they can overlap and become more opaque.

## Instrument Patch Foundation

- [ ] Stop deriving every instrument from one generic patch shape.
- [ ] Define a distinct recipe for each instrument family.
- [ ] Give flute patches a breath-noise layer.
- [ ] Give strings a bowed attack and sustained body.
- [ ] Give bass patches a clear fundamental and short upper harmonics.
- [ ] Give struck instruments a separate attack transient.
- [ ] Change timbre across low, middle, and high registers.
- [ ] Change timbre based on note velocity.
- [ ] Limit random patch values to family-safe ranges.
- [ ] Add one known-good patch for each core song role.
- [ ] Compare generated patches against known-good patches.
- [ ] Reject patches that sound nearly identical across roles.

## Percussion Kit

- [ ] Create a separate recipe for every used drum note.
- [ ] Map MIDI drum notes to named percussion voices.
- [ ] Give kicks a low pitch sweep and short noise click.
- [ ] Give snares a body tone and filtered noise burst.
- [ ] Give toms distinct pitches based on drum size.
- [ ] Give hi-hats short metallic noise envelopes.
- [ ] Give cymbals longer metallic noise envelopes.
- [ ] Give shakers repeated short filtered noise bursts.
- [ ] Give tambourines noise plus small metallic transients.
- [ ] Give bongos different pitches and decay lengths.
- [ ] Show the drum name for every percussion event.
- [ ] Show drum-note counts in the song report.
- [ ] Reject drum tracks using only one percussion voice.
- [ ] Require at least three drum roles in a full groove.
- [ ] Export a solo WAV for each drum voice.

## Percussion Composition

- [ ] Assign kick, accent, pulse, and texture roles.
- [ ] Build grooves from roles instead of random drum notes.
- [ ] Keep a stable pulse across related measures.
- [ ] Place low drums on structurally strong beats.
- [ ] Place light percussion between strong beats.
- [ ] Use cymbals mainly at section boundaries.
- [ ] Use fills only before meaningful transitions.
- [ ] Vary groove patterns once per phrase.
- [ ] Keep ambient percussion quieter than pitched tracks.
- [ ] Reduce percussion density during calm sections.
- [ ] Make drum velocity follow the section energy curve.
- [ ] Prevent identical drum hits from repeating mechanically.

## Melody Shape

- [ ] Build each melody from two or more related phrases.
- [ ] Give every phrase a clear opening gesture.
- [ ] Give every phrase a clear closing gesture.
- [ ] Make motif notes more prominent than filler notes.
- [ ] Repeat the motif before introducing a variation.
- [ ] Change only one motif feature in each variation.
- [ ] Keep filler notes connected to nearby motif notes.
- [ ] Place phrase peaks near planned contour checkpoints.
- [ ] Reserve the song's highest note for the main climax.
- [ ] Descend gradually after the main climax.
- [ ] End answer phrases on stable chord tones.
- [ ] End the final phrase on scale degree one.

## Harmony and Bass

- [ ] Build harmony directly from the shared chord timeline.
- [ ] Build bass directly from the shared chord timeline.
- [ ] Verify each chord at every planned chord boundary.
- [ ] Keep chord changes aligned with strong beats.
- [ ] Use inversions only when they improve voice movement.
- [ ] Keep harmony below the lead's main register.
- [ ] Reduce harmony activity during important lead phrases.
- [ ] Let bass sustain through more of each chord.
- [ ] Make bass rhythm repeat across related phrases.
- [ ] Add passing bass notes only between planned roots.
- [ ] Make cadences coordinate bass, harmony, and lead.
- [ ] Reject cadences that conflict with active harmony.

## Rhythm and Phrasing

- [ ] Create a small library of phrase rhythm templates.
- [ ] Assign one rhythm identity to each song section.
- [ ] Repeat rhythms before adding variation.
- [ ] Place rests mainly at phrase boundaries.
- [ ] Avoid constant note activity in every layer.
- [ ] Avoid every layer resting at the same time.
- [ ] Give the bass a stable recurring pulse.
- [ ] Let lead notes connect into short musical sentences.
- [ ] Use longer notes near phrase endings.
- [ ] Use shorter notes when building toward a climax.
- [ ] Make section changes audible through rhythm changes.
- [ ] Quantize first, then apply controlled humanization.

## Humanization

- [ ] Add small timing offsets by instrument role.
- [ ] Add small velocity changes within each phrase.
- [ ] Keep one humanization profile per virtual performer.
- [ ] Stagger harmony notes by a few milliseconds.
- [ ] Let bass play slightly ahead or behind the beat.
- [ ] Let percussion timing vary within strict limits.
- [ ] Avoid randomizing every note independently.
- [ ] Keep repeated phrases similar enough to recognize.
- [ ] Change articulation at musical phrase boundaries.
- [ ] Add subtle vibrato only to suitable sustained notes.

## Mixing

- [ ] Set a loudness target for each song role.
- [ ] Measure each track before applying the final mix.
- [ ] Keep bass centered and below the harmony register.
- [ ] Keep lead clear of the harmony's strongest frequencies.
- [ ] Reduce harmony gain while important motifs play.
- [ ] Pan percussion voices instead of the whole kit.
- [ ] Use one shared room reverb for the ensemble.
- [ ] Give each instrument a controlled reverb send.
- [ ] Prevent long releases from blurring chord changes.
- [ ] Test the mix in mono.
- [ ] Test the mix through laptop speakers.
- [ ] Export dry and processed versions for comparison.

## Debugging Workflow

- [ ] Add solo controls for every drum voice.
- [ ] Add mute controls for every drum voice.
- [ ] Add a drum-kit audition pattern.
- [ ] Add a melody-only playback option.
- [ ] Add a bass-and-harmony playback option.
- [ ] Add a dry full-song playback option.
- [ ] Show planned and detected chords by measure.
- [ ] Show planned and actual contour on one graph.
- [ ] Highlight cadence notes that conflict with harmony.
- [ ] Highlight unexpected percussion substitutions.
- [ ] Save a report for each rejected song.
- [ ] Keep several known-good seeds for regression tests.

* [x] When changing input parameters, apply to the song immediately, and let it continue playing
* [x] Panel to input parameters and click buttons is clipped on the right.
* [x] Fix natural minor offsets to 0, 2, 3, 5, 7, 8, 10.
* [x] Reject mode definitions with duplicate scale degrees.
* [x] Reject seven-note modes with fewer than seven unique offsets.
* [x] Make lead interval weights affect actual note selection.
* [x] Penalize repeated minor-sixth jumps in the lead.
* [x] Limit ordinary lead motion to three semitones.
* [x] Allow larger leaps only once per phrase.
* [x] Require stepwise recovery after every large lead leap.
* [x] Generate an eight-measure melody before full arrangement.
* [x] State the lead motif clearly in the first A phrase.
* [x] Require at least two exact motif matches in Section A.
* [x] Require motif variation rather than unrelated notes in A'.
* [x] Regenerate any section with zero expected motif matches.
* [x] Give the lead two to six note attacks per measure.
* [x] Prevent repeated one-note-per-measure lead patterns.
* [x] Build reusable lead rhythm templates by phrase.
* [x] Add rests at phrase boundaries rather than every measure.
* [x] End each eight-measure phrase on a planned cadence.
* [x] Resolve the final cadence to scale degree 1.
* [x] Build one chord timeline before generating any tracks.
* [x] Assign each chord an exact measure range.
* [x] Make bass, harmony, and lead read the same chord timeline.
* [x] Verify detected chords follow the planned progression order.
* [x] Fix unresolved chromatic notes before MIDI export.
* [x] Regenerate a phrase containing unresolved chromatic notes.
* [x] Lower harmony occupancy when the lead is active.
* [x] Make each section satisfy its configured layer-emphasis rules. (ie - Make A' more lead-forward than Section A.)
* [x] Validate actual layer occupancy against the section blueprint.occupancy. (ie - Make B harmony lighter than Section A.)
* [x] Make A' lead prominence exceed Section A.
* [x] Make B harmony prominence lower than Section A.
* [x] Measure prominence using density, velocity, and register.
* [x] Account for competing layers when scoring prominence.
* [x] Add a soft repeating rhythmic pulse for forest music.
* [x] Use percussion patterns instead of isolated cymbal events.
* [x] Compare intended intervals with actual interval counts.
* [x] Report exact and varied motif matches separately.
* [x] Score phrase repetition and phrase-level similarity.
* [x] Reject songs whose configured motif never appears.
* [x] Add a melody-only MIDI export for rapid evaluation.
* [x] Add a harmony-and-bass-only MIDI export for review.
* [x] Test eight measures before generating all measures.
* [x] Percussion should be made of multiple percussion instruments (drum set), preferably noise related
* [x] Let me download the MIDI, instrument WAV, and parameter report JSON, as a zip file.
* [x] Sections should be embedded in MIDI meta/control flow to help indicate which notes belong to what section (Intro, Section A, section A', Section B, Variation, Retrun, Outro, etc.)
* [x] Add a [Sound Bank Debug Page](./sound-bank-debug.md)

# Medium Priority

The blueprint is already fairly sophisticated. The problem is that the **MIDI output does not appear to honor much of that blueprint correctly**.

What stands out in this specific file:

- The MIDI plays at about **260 BPM**, despite describing an easy tempo.
- The file lasts about **1:04**, not the reported **2:18**.
- The section plan totals 88 measures, but the MIDI contains about 69 measures.
- The string “harmony” is monophonic; it never plays a chord.
- The tuba averages an **8.8-semitone leap** between notes.
- The flute averages a **10.8-semitone leap** and reaches 31 semitones.
- Most bass and lead notes fall outside G Mixolydian.
- Harmony mostly follows G Mixolydian, unlike the bass and lead.
- Note durations are short, with large empty gaps between notes.
- The shared motif exists in metadata but is not clearly audible.
- The four tracks seem to interpret scale degrees differently.
- The snare plays one repeated sound without a broader groove.

The primary issue looks less like missing composition concepts and more like
**incorrect translation from SongDNA into pitches, timing, and MIDI events**.

The first issue I would investigate is the **scale-degree-to-MIDI conversion**.
The strings mostly occupy the intended G Mixolydian pitch classes, while the
bass and flute mostly do not. That strongly suggests the track generators are
using different pitch conversion paths, or that melodic intervals are being
added directly as semitones instead of moving through the selected scale.

## Highest-Priority Corrections

- [x] Fix scale-degree conversion for every pitched track.
- [x] Make all tracks use the same root and mode mapping.
- [x] Verify G Mixolydian maps to G A B C D E F.
- [x] Test scale degrees across several octaves.
- [x] Reject unexpected chromatic notes before MIDI export.
- [x] Trace why bass notes center on G-sharp and F-sharp.
- [x] Trace why lead notes center on G-sharp and C-sharp.
- [x] Verify motif degrees are not treated as semitone offsets.
- [x] Verify preferred intervals use one documented unit.
- [x] Separate scale degrees from semitone intervals.

## Root and Mode

- [x] Derive MIDI root note directly from the 196 Hz root.
- [x] Verify 196 Hz resolves to MIDI note G3.
- [x] Store the root as a MIDI note before composing.
- [x] Store mode pitch offsets once per song.
- [x] Share one mode definition across all tracks.
- [x] Log each note's scale degree and resulting MIDI pitch.
- [x] Count out-of-mode notes by track.
- [x] Fail validation when accidental counts exceed limits.
- [x] Explain every accidental through a named rule.
- [x] Lower the accidental budget for ambient plains music.

## Tempo and Duration

- [x] Fix the mismatch between reported and exported tempo.
- [x] Export the intended BPM instead of about 260 BPM.
- [x] Show the resolved BPM beside the tempo multiplier.
- [x] Calculate song length from exported MIDI timing.
- [x] Verify the MIDI length matches the reported 2:18.
- [x] Verify the loop range exists within the exported file.
- [x] Calculate section ticks before generating notes.
- [x] Make all section lengths use the same meter.
- [x] Validate total measures against the blueprint.
- [x] Reject exports with metadata and timing mismatches.

## Section Timing

- [x] Assign exact start and end measures to each section.
- [x] Mark every section boundary in the MIDI file.
- [x] Ensure Intro receives all eight planned measures.
- [x] Ensure A and A' each receive sixteen measures.
- [x] Ensure B and Variation each receive sixteen measures.
- [x] Ensure Return and Outro each receive eight measures.
- [x] Keep note events inside their assigned sections.
- [x] Verify section note counts match layer plans.
- [x] Apply layer changes exactly at section boundaries.
- [x] Export section names as MIDI markers.

## Lead Leap Control

- [x] Reduce lead maximum leap from 31 semitones.
- [x] Cap normal lead leaps near seven semitones.
- [x] Reserve octave leaps for rare structural accents.
- [x] Penalize leaps larger than a perfect fifth.
- [x] Require recovery after every large leap.
- [x] Keep most lead motion stepwise or by thirds.
- [x] Use contour targets as ranges, not exact pitch jumps.
- [x] Smooth the path between contour target points.
- [x] Keep the flute within a narrower active register.
- [x] Score average and maximum lead leap before export.

## Bass Movement

- [x] Generate bass from the active chord root.
- [x] Keep strong bass beats on roots or fifths.
- [x] Reduce repeated 10, 12, 17, and 22 semitone jumps.
- [x] Keep most bass motion within five semitones.
- [x] Use octave movement only as a deliberate pattern.
- [x] Repeat a stable bass figure across related measures.
- [x] Change bass patterns only at phrase boundaries.
- [x] Keep the tuba within a consistent low register.
- [x] Validate bass notes against each active chord.
- [x] Reject bass lines with excessive leap averages.

## Harmony Output

- [x] Make the strings play simultaneous chord tones.
- [x] Generate at least three notes for normal triads.
- [x] Sustain chords across meaningful harmonic spans.
- [x] Use inversions to reduce chord-to-chord motion.
- [x] Keep common chord tones between changes.
- [x] Avoid octave jumping as the main harmony motion.
- [x] Separate chord voices into stable registers.
- [x] Match harmony notes to the 1-5-6-1 progression.
- [x] Validate that harmony polyphony exceeds one.
- [x] Reject a harmony track containing only single notes.

## Chord Progression

- [x] Resolve scale-degree chords within G Mixolydian.
- [x] Document whether chord 6 is major, minor, or modal.
- [x] Generate chord pitches before arranging tracks.
- [x] Give all tracks the same active chord timeline.
- [x] Mark chord changes in the debug MIDI.
- [x] Keep chord changes aligned with strong beats.
- [x] Add a dominant-like setup before answer cadences.
- [x] Strengthen harmony during the Return section.
- [x] Simplify harmony during the stated lighter B section.
- [x] Verify the progression is audible in the bass.

## Motif Translation

- [x] Render 1-3-5-3 as G-B-D-B in the selected mode.
- [x] Confirm motif notes use degrees rather than semitones.
- [x] Give the motif one recognizable rhythm.
- [x] State the motif clearly during Section A.
- [x] Repeat the motif clearly during Section A'.
- [x] Vary only one motif element at a time.
- [x] Transpose motifs using chord-aware scale degrees.
- [x] Keep the motif rhythm recognizable after transposition.
- [x] Use motif fragments during B and Variation.
- [x] Return to the original motif near the ending.

## Lead Contour

- [x] Map contour values to a bounded melodic register.
- [x] Avoid mapping contour values directly to octave leaps.
- [x] Interpolate notes between contour checkpoints.
- [x] Place the climax near the planned section peak.
- [x] Keep the climax pitch unique within the song.
- [x] Descend gradually after the climax.
- [x] Resolve the final contour value to the tonic.
- [x] Validate actual pitches against the planned contour.
- [x] Export planned and actual contour values for review.

## Cadences

- [x] Replace excess neutral cadences with directed endings.
- [x] Give the question phrase a clearly unstable ending.
- [x] Give the answer phrase a clear tonic resolution.
- [x] Add weaker cadences at interior section boundaries.
- [x] Add a strong cadence before the loop point.
- [x] Make the Outro cadence resolve rather than drift.
- [x] Coordinate melody and bass during each cadence.
- [x] Validate cadence pitches against active harmony.

## Rhythm and Spacing

- [x] Reduce the long silent gaps between pitched notes.
- [x] Lengthen string notes beyond their current short values.
- [x] Let bass notes support more of each harmonic span.
- [x] Give the flute connected phrase-level rhythms.
- [x] Quantize notes to a clear rhythmic subdivision.
- [x] Define flowing rhythm as reusable note patterns.
- [x] Keep rhythmic variation inside phrase templates.
- [x] Add rests at phrase ends instead of between all notes.
- [x] Use legato articulation for suitable flute phrases.
- [x] Validate note occupancy by track and section.

## Percussion

- [x] Add a low drum or kick role to support the pulse.
- [x] Use snare accents on consistent metric positions.
- [x] Replace the isolated snare pattern with a groove.
- [x] Repeat percussion patterns by measure.
- [x] Add fills only before structural changes.
- [x] Keep percussion absent during the Intro.
- [x] Thin percussion during the Variation section.
- [x] Remove percussion during the Outro.
- [x] Align drum accents with chord changes.
- [x] Validate percussion section rules before export.

## Layer Plan Enforcement

- [x] Verify Intro has no percussion.
- [x] Verify Intro uses a deliberately thin bass part.
- [x] Make Section A contain the full layer stack.
- [x] Move the lead forward during Section A'.
- [x] Reduce harmony density during Section B.
- [x] Stretch lead durations during Variation.
- [x] Thin percussion during Variation.
- [x] Restore all layers during Return.
- [x] Fade the lead during Outro.
- [x] Export actual layer activity by section.

## Density

- [x] Set note-density targets per track and section.
- [x] Avoid placing 307 notes without phrase-based density rules.
- [x] Increase density toward the planned climax.
- [x] Reduce density during Intro and Outro.
- [ ] Avoid all tracks entering after unrelated random delays.
- [x] Coordinate rests between lead and accompaniment.
- [x] Keep at least one harmonic anchor during lead rests.
- [x] Report sounding-time percentage for each track.

## Accidentals

- [x] Define what the reported 226 accidentals represent.
- [x] Distinguish chromatic notes from MIDI black-key notes.
- [ ] Count accidentals relative to G Mixolydian.
- [x] Report accidental counts separately by track.
- [x] Permit accidentals only through named embellishments.
- [x] Limit chromatic passing tones in exploration music.
- [x] Resolve chromatic notes by step.
- [x] Reject chromatic leaps without harmonic support.
- [x] Show accidental reasons in note-level debug output.

## Shared Track Context

- [x] Build one harmonic timeline before generating tracks.
- [x] Build one rhythmic grid before generating tracks.
- [x] Pass section state to every track generator.
- [x] Pass phrase state to every track generator.
- [x] Pass active chord to every track generator.
- [x] Pass motif state to every track generator.
- [x] Prevent tracks from selecting independent tonal centers.
- [x] Validate all tracks against shared SongDNA.

## MIDI Export Validation

- [x] Compare intended BPM with exported MIDI tempo.
- [x] Compare intended duration with exported MIDI duration.
- [x] Compare planned measures with exported measures.
- [x] Compare scheduled notes with exported notes.
- [x] Compare planned sections with MIDI markers.
- [x] Compare planned layers with actual track activity.
- [x] Compare intended mode with exported pitch classes.
- [x] Compare intended motifs with exported note sequences.
- [x] Compare cadence plans with final phrase notes.
- [x] Block export when critical mismatches are found.

## Debug Report Improvements

- [x] Show the resolved BPM rather than only 1.04x.
- [x] Show total measures calculated from the MIDI.
- [x] Show note range for each track.
- [x] Show average leap for each track.
- [x] Show maximum leap for each track.
- [x] Show out-of-mode notes for each track.
- [x] Show maximum harmony polyphony.
- [x] Show average note duration by track.
- [x] Show average silence between notes by track.
- [x] Show motif match counts by section.
- [x] Show actual chords detected in the harmony track.
- [x] Flag metadata that differs from MIDI output.

## Specific Regression Tests

- [x] Verify a 196 Hz root exports as MIDI G3.
- [x] Verify degree 1 exports as G in every track.
- [x] Verify degree 3 exports as B in every track.
- [x] Verify degree 5 exports as D in every track.
- [x] Verify motif 1-3-5-3 exports as G-B-D-B.
- [x] Verify G Mixolydian uses G-A-B-C-D-E-F.
- [x] Verify harmony contains simultaneous notes.
- [x] Verify lead leaps stay within configured limits.
- [x] Verify the exported file lasts about 2:18.
- [x] Verify the exported BPM matches the easy tempo.
- [x] Verify all 88 planned measures are exported.
- [x] Verify each section follows its layer plan.
