# Music Quality and Debug Priorities

## 0) Musical Expression and Track Dynamics

- [ ] Give every track a section-level volume curve.
- [ ] Give every phrase a small dynamic rise and fall.
- [ ] Increase velocity range for harmony notes.
- [ ] Increase velocity range for bass notes.
- [ ] Keep velocity changes related to phrase position.
- [ ] Make strong beats slightly louder than weak beats.
- [ ] Accent motif notes above nearby filler notes.
- [ ] Reduce accompaniment volume while lead phrases play.
- [ ] Add crescendos approaching important section peaks.
- [ ] Add diminuendos after climaxes and near endings.
- [x] Add MIDI expression changes within sustained phrases.
      Progress: MIDI exports now add first-pass CC11 swells for compatible
      sustained harmony, bass, and expressive lead families, and the MIDI
      audit plus export-structure tests now verify those controller changes
      appear when sustained phrases are present.
- [x] Add modulation control for suitable sustained instruments.
      Progress: MIDI exports now add first-pass CC1 modulation swells for
      compatible sustained families such as strings, pads, winds, brass, and
      vocals, and the MIDI export structure tests now verify those controller
      changes appear on sustained harmony tracks.
- [x] Add subtle vibrato to sustained strings and winds.
      Progress: live Web Audio playback now adds a light sine-LFO vibrato to
      sustained string and wind families such as strings, violin, flute, and
      trumpet once notes are long enough to settle, and the integration tests
      now verify that supported sustained notes create the extra modulation
      path while short notes do not.
- [ ] Add controlled pitch bends for suitable articulations.
- [ ] Add note attack differences by articulation type.
- [ ] Add release differences by articulation type.
- [ ] Add legato behavior for connected melodic notes.
- [ ] Add staccato behavior for short detached notes.
- [ ] Add accents for structurally important notes.
- [ ] Add sustained-note swells for strings and pads.
- [ ] Change filter brightness with note velocity.
- [ ] Change filter brightness across a phrase.
- [ ] Make louder notes slightly brighter when appropriate.
- [ ] Give each track its own expressive performance profile.
- [ ] Keep one performer profile consistent through a song.
- [ ] Add small pan motion only where musically appropriate.
- [ ] Give percussion hits wider velocity variation.
- [ ] Add ghost notes to suitable percussion grooves.
- [ ] Give fills stronger dynamics than normal groove hits.
- [ ] Add cymbal swells before major transitions.
- [ ] Add track automation lanes to the MIDI debug view.
- [ ] Show note velocity as height or brightness in the timeline.
- [ ] Show track volume automation below each track.
- [ ] Show expression automation below each track.
- [ ] Show modulation automation below each track.
- [ ] Show pitch bends as curves over the note lane.
- [ ] Add toggles to hide automation lanes when too busy.
- [ ] Show articulation names when hovering over notes.
- [x] Report velocity min, max, and average by section.
      Progress: the music debug snapshot and export report now include
      per-section velocity summaries for melody, harmony, bass, and percussion,
      and the laboratory summary renders a `Section Velocity` line with min,
      max, and average velocity per role in each section.
- [x] Report dynamic range by track and section.
      Progress: track stats now expose per-role velocity dynamic range beside
      min/max/average values, section velocity summaries now include the same
      `dyn` span per role, and the laboratory summary now shows both track and
      section velocity lines so flat versus expressive sections are visible
      before export.
- [x] Warn when a track uses too few velocity levels.
      Progress: track stats now record min/max/average velocity plus distinct
      velocity-level counts, and the MIDI audit emits a non-critical warning
      when lead, harmony, or bass stays at fewer than three velocity levels
      across a meaningful note count so flat dynamics show up in the debug
      summary before export.
- [x] Warn when sustained tracks have no expression changes.
      Progress: the MIDI audit now flags sustained non-percussion tracks when
      the exported track carries no CC11 expression movement, so long-held
      lead, harmony, or bass parts can fail the musical-expression checklist
      before expression automation lanes are fully visualized in the debug UI.

## 1) Enforce musical correctness first

- [ ] Fail export when harmony notes miss planned chord tones.
- [ ] Fail export when bass roots miss planned chord roots.
- [ ] Fail export when cadence notes miss active harmony.
- [ ] Regenerate only failed measures, then rerun validation.
- [ ] Add a chord-tone score for every measure and track.
- [ ] Add a phrase-intent score for motif, contour, cadence.
- [x] Show pass or fail per section, not only whole-song.
- [x] Block "good" status when any critical musical check fails.

## 2) Make melody feel intentional

- [ ] Limit filler notes between motif anchors per phrase.
- [ ] Reduce repeated pitch bias in lead note selection.
- [ ] Keep lead climax near the planned phrase peak.
- [ ] Reserve the highest note for one main climax only.
- [ ] Force final lead note to tonic or approved cadence tone.
- [ ] Use longer notes at phrase endings.
- [ ] Add clearer call-and-response between phrase pairs.
- [ ] Reuse motif shapes more clearly in Return and Outro.
- [ ] Prefer stepwise motion after large leaps.
- [ ] Reduce random melodic wandering inside a phrase.

## 3) Tighten harmony and bass writing

- [ ] Keep harmony below lead and out of its core register.
- [ ] Prefer chord tones on strong beats.
- [ ] Restrict passing tones to weak beats or approach notes.
- [ ] Add counter-motion rules between bass and melody.
- [ ] Hold bass roots longer at cadence measures.
- [ ] Reduce harmony density during key melody moments.
- [ ] Add section-level tension and release targets.
- [ ] Keep accompaniment patterns more consistent per section.

## 4) Improve instrument identity

- [ ] Map each GM instrument to a hand-tuned patch family.
- [ ] Add reference patches for flute, strings, bass, drums.
- [ ] Compare patches to family spectral targets.
- [ ] Reject patches that fail family similarity checks.
- [ ] Tune lead patches away from thin 8-bit timbres.
- [ ] Add layered oscillators for richer core instruments.
- [ ] Add subtle body resonance to flute and strings.
- [ ] Add timbre shifts by velocity and register.
- [ ] Add patch presets for soft, bright, dark, and distant.
- [ ] Add a "sounds unlike target instrument" warning.

## 5) Improve percussion variety and clarity

- [ ] Give each drum voice its own synth chain.
- [ ] Separate kick, snare, hat, cymbal, tom, shaker roles.
- [ ] Make grooves use at least three drum roles.
- [ ] Add stronger accents on structural beats.
- [ ] Add fills only at section ends or transitions.
- [ ] Pan drum voices slightly for separation.
- [ ] Make shaker and tambourine patches more distinct.
- [ ] Make cymbals longer and hats shorter.
- [x] Add drum role labels to the report and timeline.
- [ ] Export one-shot drum previews for each drum voice.

## 6) Reduce oversized sample exports

- [ ] Trim leading silence from sample exports.
- [ ] Trim trailing silence from sample exports.
- [ ] Normalize preview exports to a short audition phrase.
- [ ] Add one-shot, loop, and full-song export modes.
- [ ] Add max duration caps for preview sample exports.
- [ ] Skip rendering long silent tails for sparse drum solos.
- [ ] Add optional 22kHz preview mode for debug exports.
- [ ] Add optional compressed preview exports.
- [ ] Show export duration and size before download.
- [ ] Warn when a preview export exceeds size limits.

## 7) Improve the timeline layout

- [ ] Add whole-song and rolling-window timeline modes.
- [ ] Keep a fixed playhead in rolling-window mode.
- [ ] Add zoom for song, section, bar, and beat levels.
- [x] Show measure numbers and beat subdivisions.
- [x] Show chord labels above the timeline.
- [x] Show section labels and cadence markers.
- [x] Section labels should be less overwealming
- [x] Chord labels above the timeline overlap eachother and are not readable
- [x] Show note name and duration on hover.
- [x] Show drum voice name on percussion hover.
- [x] Add per-track eye icons to hide tracks.
- [x] Add per-track ear icons to solo or mute tracks.
- [x] Add per-drum toggles within the percussion lane.
- [ ] Add a mini overview strip for fast scrubbing.
- [ ] Add loop-range drag handles on the timeline.
- [ ] Add snap-to-measure and snap-to-section navigation.
- [x] In full-song view, I should be able to drag the play head with my mouse.
- [x] Clicking a section mode while the music is playing should move the play head to that position.
- [x] I sould be able to toggle each track to be mute by clicking the track name and see a visual indication
- [x] The playhead should only cover the tracks and not extend past them
- [x] Hovering over letters like "Q" and "A" above the tracks should show some details
- [x] Text appears at the top that says "1 min" but is vauge on what that means, as the song is only 2 minutes where 1 min appears 11 times.
- [x] Do not play tracks when they are muted

## 8) Add better diagnostics to the timeline

- [x] Mark out-of-scale notes with a warning color.
- [x] Mark non-chord tones with a warning color.
- [x] Mark failed cadence notes with icons.
- [x] Mark harmony drift at exact measures.
- [x] Mark bass root drift at exact measures.
- [x] Mark motif matches and motif variations.
- [x] Mark the planned and actual climax positions.
- [x] Show current chord under the playhead.
- [x] Show current scale under the playhead.
- [ ] Add density heatmaps behind each lane.
- [ ] Add a legend toggle so overlays can be hidden.
- [ ] Add filter icons for chords, cadence, motif, contour.
- [ ] Move Lead Contour Graph between timeline and instrument samples

## 9) Improve sound bank debug usefulness

- [ ] Add live ADSR controls to the sound bank page.
- [ ] Add filter, noise, and detune controls.
- [ ] Add oscillator enable and solo toggles.
- [ ] Add A/B patch comparison with instant switching.
- [ ] Add dry versus processed playback buttons.
- [ ] Add one-click reference phrase playback per patch.
- [ ] Add waveform, spectrum, and envelope views together.
- [ ] Add a "compare to reference patch" report.
- [ ] Add patch quality warnings before song export.
- [ ] Save known-good patches and lock them as references.
