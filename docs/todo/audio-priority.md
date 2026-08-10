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
- [ ] Use contour targets as ranges, not exact pitch jumps.
- [ ] Smooth the path between contour target points.
- [ ] Keep the flute within a narrower active register.
- [x] Score average and maximum lead leap before export.

## Bass Movement

- [x] Generate bass from the active chord root.
- [x] Keep strong bass beats on roots or fifths.
- [x] Reduce repeated 10, 12, 17, and 22 semitone jumps.
- [x] Keep most bass motion within five semitones.
- [ ] Use octave movement only as a deliberate pattern.
- [ ] Repeat a stable bass figure across related measures.
- [ ] Change bass patterns only at phrase boundaries.
- [ ] Keep the tuba within a consistent low register.
- [x] Validate bass notes against each active chord.
- [x] Reject bass lines with excessive leap averages.

## Harmony Output

- [x] Make the strings play simultaneous chord tones.
- [x] Generate at least three notes for normal triads.
- [ ] Sustain chords across meaningful harmonic spans.
- [x] Use inversions to reduce chord-to-chord motion.
- [ ] Keep common chord tones between changes.
- [ ] Avoid octave jumping as the main harmony motion.
- [x] Separate chord voices into stable registers.
- [ ] Match harmony notes to the 1-5-6-1 progression.
- [x] Validate that harmony polyphony exceeds one.
- [ ] Reject a harmony track containing only single notes.

## Chord Progression

- [ ] Resolve scale-degree chords within G Mixolydian.
- [ ] Document whether chord 6 is major, minor, or modal.
- [ ] Generate chord pitches before arranging tracks.
- [ ] Give all tracks the same active chord timeline.
- [ ] Mark chord changes in the debug MIDI.
- [ ] Keep chord changes aligned with strong beats.
- [ ] Add a dominant-like setup before answer cadences.
- [ ] Strengthen harmony during the Return section.
- [ ] Simplify harmony during the stated lighter B section.
- [ ] Verify the progression is audible in the bass.

## Motif Translation

- [ ] Render 1-3-5-3 as G-B-D-B in the selected mode.
- [ ] Confirm motif notes use degrees rather than semitones.
- [ ] Give the motif one recognizable rhythm.
- [ ] State the motif clearly during Section A.
- [ ] Repeat the motif clearly during Section A'.
- [ ] Vary only one motif element at a time.
- [ ] Transpose motifs using chord-aware scale degrees.
- [ ] Keep the motif rhythm recognizable after transposition.
- [ ] Use motif fragments during B and Variation.
- [ ] Return to the original motif near the ending.

## Lead Contour

- [x] Map contour values to a bounded melodic register.
- [ ] Avoid mapping contour values directly to octave leaps.
- [ ] Interpolate notes between contour checkpoints.
- [ ] Place the climax near the planned section peak.
- [ ] Keep the climax pitch unique within the song.
- [ ] Descend gradually after the climax.
- [ ] Resolve the final contour value to the tonic.
- [ ] Validate actual pitches against the planned contour.
- [ ] Export planned and actual contour values for review.

## Cadences

- [ ] Replace excess neutral cadences with directed endings.
- [ ] Give the question phrase a clearly unstable ending.
- [ ] Give the answer phrase a clear tonic resolution.
- [ ] Add weaker cadences at interior section boundaries.
- [ ] Add a strong cadence before the loop point.
- [ ] Make the Outro cadence resolve rather than drift.
- [ ] Coordinate melody and bass during each cadence.
- [ ] Validate cadence pitches against active harmony.

## Rhythm and Spacing

- [ ] Reduce the long silent gaps between pitched notes.
- [ ] Lengthen string notes beyond their current short values.
- [ ] Let bass notes support more of each harmonic span.
- [ ] Give the flute connected phrase-level rhythms.
- [ ] Quantize notes to a clear rhythmic subdivision.
- [ ] Define flowing rhythm as reusable note patterns.
- [ ] Keep rhythmic variation inside phrase templates.
- [ ] Add rests at phrase ends instead of between all notes.
- [ ] Use legato articulation for suitable flute phrases.
- [x] Validate note occupancy by track and section.

## Percussion

- [ ] Add a low drum or kick role to support the pulse.
- [ ] Use snare accents on consistent metric positions.
- [ ] Replace the isolated snare pattern with a groove.
- [ ] Repeat percussion patterns by measure.
- [ ] Add fills only before structural changes.
- [x] Keep percussion absent during the Intro.
- [x] Thin percussion during the Variation section.
- [x] Remove percussion during the Outro.
- [ ] Align drum accents with chord changes.
- [ ] Validate percussion section rules before export.

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

- [ ] Set note-density targets per track and section.
- [ ] Avoid placing 307 notes without phrase-based density rules.
- [ ] Increase density toward the planned climax.
- [ ] Reduce density during Intro and Outro.
- [ ] Avoid all tracks entering after unrelated random delays.
- [ ] Coordinate rests between lead and accompaniment.
- [ ] Keep at least one harmonic anchor during lead rests.
- [ ] Report sounding-time percentage for each track.

## Accidentals

- [x] Define what the reported 226 accidentals represent.
- [x] Distinguish chromatic notes from MIDI black-key notes.
- [ ] Count accidentals relative to G Mixolydian.
- [x] Report accidental counts separately by track.
- [ ] Permit accidentals only through named embellishments.
- [ ] Limit chromatic passing tones in exploration music.
- [ ] Resolve chromatic notes by step.
- [ ] Reject chromatic leaps without harmonic support.
- [x] Show accidental reasons in note-level debug output.

## Shared Track Context

- [ ] Build one harmonic timeline before generating tracks.
- [ ] Build one rhythmic grid before generating tracks.
- [ ] Pass section state to every track generator.
- [ ] Pass phrase state to every track generator.
- [ ] Pass active chord to every track generator.
- [ ] Pass motif state to every track generator.
- [ ] Prevent tracks from selecting independent tonal centers.
- [ ] Validate all tracks against shared SongDNA.

## MIDI Export Validation

- [x] Compare intended BPM with exported MIDI tempo.
- [x] Compare intended duration with exported MIDI duration.
- [x] Compare planned measures with exported measures.
- [ ] Compare scheduled notes with exported notes.
- [x] Compare planned sections with MIDI markers.
- [x] Compare planned layers with actual track activity.
- [ ] Compare intended mode with exported pitch classes.
- [ ] Compare intended motifs with exported note sequences.
- [ ] Compare cadence plans with final phrase notes.
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
