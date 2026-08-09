The blueprint is already fairly sophisticated. The problem is that the **MIDI output does not appear to honor much of that blueprint correctly**.

What stands out in this specific file:

* The MIDI plays at about **260 BPM**, despite describing an easy tempo.
* The file lasts about **1:04**, not the reported **2:18**.
* The section plan totals 88 measures, but the MIDI contains about 69 measures.
* The string “harmony” is monophonic; it never plays a chord.
* The tuba averages an **8.8-semitone leap** between notes.
* The flute averages a **10.8-semitone leap** and reaches 31 semitones.
* Most bass and lead notes fall outside G Mixolydian.
* Harmony mostly follows G Mixolydian, unlike the bass and lead.
* Note durations are short, with large empty gaps between notes.
* The shared motif exists in metadata but is not clearly audible.
* The four tracks seem to interpret scale degrees differently.
* The snare plays one repeated sound without a broader groove.

The primary issue looks less like missing composition concepts and more like
**incorrect translation from SongDNA into pitches, timing, and MIDI events**.


The first issue I would investigate is the **scale-degree-to-MIDI conversion**.
The strings mostly occupy the intended G Mixolydian pitch classes, while the
bass and flute mostly do not. That strongly suggests the track generators are
using different pitch conversion paths, or that melodic intervals are being
added directly as semitones instead of moving through the selected scale.

## Highest-Priority Corrections

* [x] Fix scale-degree conversion for every pitched track.
* [x] Make all tracks use the same root and mode mapping.
* [ ] Verify G Mixolydian maps to G A B C D E F.
* [ ] Test scale degrees across several octaves.
* [ ] Reject unexpected chromatic notes before MIDI export.
* [ ] Trace why bass notes center on G-sharp and F-sharp.
* [ ] Trace why lead notes center on G-sharp and C-sharp.
* [ ] Verify motif degrees are not treated as semitone offsets.
* [ ] Verify preferred intervals use one documented unit.
* [ ] Separate scale degrees from semitone intervals.

## Root and Mode

* [ ] Derive MIDI root note directly from the 196 Hz root.
* [ ] Verify 196 Hz resolves to MIDI note G3.
* [ ] Store the root as a MIDI note before composing.
* [ ] Store mode pitch offsets once per song.
* [ ] Share one mode definition across all tracks.
* [ ] Log each note's scale degree and resulting MIDI pitch.
* [ ] Count out-of-mode notes by track.
* [ ] Fail validation when accidental counts exceed limits.
* [ ] Explain every accidental through a named rule.
* [ ] Lower the accidental budget for ambient plains music.

## Tempo and Duration

* [x] Fix the mismatch between reported and exported tempo.
* [x] Export the intended BPM instead of about 260 BPM.
* [x] Show the resolved BPM beside the tempo multiplier.
* [x] Calculate song length from exported MIDI timing.
* [ ] Verify the MIDI length matches the reported 2:18.
* [ ] Verify the loop range exists within the exported file.
* [ ] Calculate section ticks before generating notes.
* [ ] Make all section lengths use the same meter.
* [ ] Validate total measures against the blueprint.
* [ ] Reject exports with metadata and timing mismatches.

## Section Timing

* [ ] Assign exact start and end measures to each section.
* [ ] Mark every section boundary in the MIDI file.
* [ ] Ensure Intro receives all eight planned measures.
* [ ] Ensure A and A' each receive sixteen measures.
* [ ] Ensure B and Variation each receive sixteen measures.
* [ ] Ensure Return and Outro each receive eight measures.
* [ ] Keep note events inside their assigned sections.
* [ ] Verify section note counts match layer plans.
* [ ] Apply layer changes exactly at section boundaries.
* [ ] Export section names as MIDI markers.

## Lead Leap Control

* [ ] Reduce lead maximum leap from 31 semitones.
* [ ] Cap normal lead leaps near seven semitones.
* [ ] Reserve octave leaps for rare structural accents.
* [ ] Penalize leaps larger than a perfect fifth.
* [ ] Require recovery after every large leap.
* [ ] Keep most lead motion stepwise or by thirds.
* [ ] Use contour targets as ranges, not exact pitch jumps.
* [ ] Smooth the path between contour target points.
* [ ] Keep the flute within a narrower active register.
* [ ] Score average and maximum lead leap before export.

## Bass Movement

* [ ] Generate bass from the active chord root.
* [ ] Keep strong bass beats on roots or fifths.
* [ ] Reduce repeated 10, 12, 17, and 22 semitone jumps.
* [ ] Keep most bass motion within five semitones.
* [ ] Use octave movement only as a deliberate pattern.
* [ ] Repeat a stable bass figure across related measures.
* [ ] Change bass patterns only at phrase boundaries.
* [ ] Keep the tuba within a consistent low register.
* [ ] Validate bass notes against each active chord.
* [ ] Reject bass lines with excessive leap averages.

## Harmony Output

* [ ] Make the strings play simultaneous chord tones.
* [ ] Generate at least three notes for normal triads.
* [ ] Sustain chords across meaningful harmonic spans.
* [ ] Use inversions to reduce chord-to-chord motion.
* [ ] Keep common chord tones between changes.
* [ ] Avoid octave jumping as the main harmony motion.
* [ ] Separate chord voices into stable registers.
* [ ] Match harmony notes to the 1-5-6-1 progression.
* [ ] Validate that harmony polyphony exceeds one.
* [ ] Reject a harmony track containing only single notes.

## Chord Progression

* [ ] Resolve scale-degree chords within G Mixolydian.
* [ ] Document whether chord 6 is major, minor, or modal.
* [ ] Generate chord pitches before arranging tracks.
* [ ] Give all tracks the same active chord timeline.
* [ ] Mark chord changes in the debug MIDI.
* [ ] Keep chord changes aligned with strong beats.
* [ ] Add a dominant-like setup before answer cadences.
* [ ] Strengthen harmony during the Return section.
* [ ] Simplify harmony during the stated lighter B section.
* [ ] Verify the progression is audible in the bass.

## Motif Translation

* [ ] Render 1-3-5-3 as G-B-D-B in the selected mode.
* [ ] Confirm motif notes use degrees rather than semitones.
* [ ] Give the motif one recognizable rhythm.
* [ ] State the motif clearly during Section A.
* [ ] Repeat the motif clearly during Section A'.
* [ ] Vary only one motif element at a time.
* [ ] Transpose motifs using chord-aware scale degrees.
* [ ] Keep the motif rhythm recognizable after transposition.
* [ ] Use motif fragments during B and Variation.
* [ ] Return to the original motif near the ending.

## Lead Contour

* [ ] Map contour values to a bounded melodic register.
* [ ] Avoid mapping contour values directly to octave leaps.
* [ ] Interpolate notes between contour checkpoints.
* [ ] Place the climax near the planned section peak.
* [ ] Keep the climax pitch unique within the song.
* [ ] Descend gradually after the climax.
* [ ] Resolve the final contour value to the tonic.
* [ ] Validate actual pitches against the planned contour.
* [ ] Export planned and actual contour values for review.

## Cadences

* [ ] Replace excess neutral cadences with directed endings.
* [ ] Give the question phrase a clearly unstable ending.
* [ ] Give the answer phrase a clear tonic resolution.
* [ ] Add weaker cadences at interior section boundaries.
* [ ] Add a strong cadence before the loop point.
* [ ] Make the Outro cadence resolve rather than drift.
* [ ] Coordinate melody and bass during each cadence.
* [ ] Validate cadence pitches against active harmony.

## Rhythm and Spacing

* [ ] Reduce the long silent gaps between pitched notes.
* [ ] Lengthen string notes beyond their current short values.
* [ ] Let bass notes support more of each harmonic span.
* [ ] Give the flute connected phrase-level rhythms.
* [ ] Quantize notes to a clear rhythmic subdivision.
* [ ] Define flowing rhythm as reusable note patterns.
* [ ] Keep rhythmic variation inside phrase templates.
* [ ] Add rests at phrase ends instead of between all notes.
* [ ] Use legato articulation for suitable flute phrases.
* [ ] Validate note occupancy by track and section.

## Percussion

* [ ] Add a low drum or kick role to support the pulse.
* [ ] Use snare accents on consistent metric positions.
* [ ] Replace the isolated snare pattern with a groove.
* [ ] Repeat percussion patterns by measure.
* [ ] Add fills only before structural changes.
* [ ] Keep percussion absent during the Intro.
* [ ] Thin percussion during the Variation section.
* [ ] Remove percussion during the Outro.
* [ ] Align drum accents with chord changes.
* [ ] Validate percussion section rules before export.

## Layer Plan Enforcement

* [ ] Verify Intro has no percussion.
* [ ] Verify Intro uses a deliberately thin bass part.
* [ ] Make Section A contain the full layer stack.
* [ ] Move the lead forward during Section A'.
* [ ] Reduce harmony density during Section B.
* [ ] Stretch lead durations during Variation.
* [ ] Thin percussion during Variation.
* [ ] Restore all layers during Return.
* [ ] Fade the lead during Outro.
* [ ] Export actual layer activity by section.

## Density

* [ ] Set note-density targets per track and section.
* [ ] Avoid placing 307 notes without phrase-based density rules.
* [ ] Increase density toward the planned climax.
* [ ] Reduce density during Intro and Outro.
* [ ] Avoid all tracks entering after unrelated random delays.
* [ ] Coordinate rests between lead and accompaniment.
* [ ] Keep at least one harmonic anchor during lead rests.
* [ ] Report sounding-time percentage for each track.

## Accidentals

* [ ] Define what the reported 226 accidentals represent.
* [ ] Distinguish chromatic notes from MIDI black-key notes.
* [ ] Count accidentals relative to G Mixolydian.
* [ ] Report accidental counts separately by track.
* [ ] Permit accidentals only through named embellishments.
* [ ] Limit chromatic passing tones in exploration music.
* [ ] Resolve chromatic notes by step.
* [ ] Reject chromatic leaps without harmonic support.
* [ ] Show accidental reasons in note-level debug output.

## Shared Track Context

* [ ] Build one harmonic timeline before generating tracks.
* [ ] Build one rhythmic grid before generating tracks.
* [ ] Pass section state to every track generator.
* [ ] Pass phrase state to every track generator.
* [ ] Pass active chord to every track generator.
* [ ] Pass motif state to every track generator.
* [ ] Prevent tracks from selecting independent tonal centers.
* [ ] Validate all tracks against shared SongDNA.

## MIDI Export Validation

* [ ] Compare intended BPM with exported MIDI tempo.
* [ ] Compare intended duration with exported MIDI duration.
* [ ] Compare planned measures with exported measures.
* [ ] Compare scheduled notes with exported notes.
* [ ] Compare planned sections with MIDI markers.
* [ ] Compare planned layers with actual track activity.
* [ ] Compare intended mode with exported pitch classes.
* [ ] Compare intended motifs with exported note sequences.
* [ ] Compare cadence plans with final phrase notes.
* [ ] Block export when critical mismatches are found.

## Debug Report Improvements

* [ ] Show the resolved BPM rather than only 1.04x.
* [ ] Show total measures calculated from the MIDI.
* [ ] Show note range for each track.
* [ ] Show average leap for each track.
* [ ] Show maximum leap for each track.
* [ ] Show out-of-mode notes for each track.
* [ ] Show maximum harmony polyphony.
* [ ] Show average note duration by track.
* [ ] Show average silence between notes by track.
* [ ] Show motif match counts by section.
* [ ] Show actual chords detected in the harmony track.
* [ ] Flag metadata that differs from MIDI output.

## Specific Regression Tests

* [ ] Verify a 196 Hz root exports as MIDI G3.
* [ ] Verify degree 1 exports as G in every track.
* [ ] Verify degree 3 exports as B in every track.
* [ ] Verify degree 5 exports as D in every track.
* [ ] Verify motif 1-3-5-3 exports as G-B-D-B.
* [ ] Verify G Mixolydian uses G-A-B-C-D-E-F.
* [ ] Verify harmony contains simultaneous notes.
* [ ] Verify lead leaps stay within configured limits.
* [ ] Verify the exported file lasts about 2:18.
* [ ] Verify the exported BPM matches the easy tempo.
* [ ] Verify all 88 planned measures are exported.
* [ ] Verify each section follows its layer plan.
