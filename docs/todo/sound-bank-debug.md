# Sound Bank Debug Page

## Page Setup

- [x] Create a sound bank debug page.
- [x] Add the page to the debug navigation.
- [x] Add a clear page title and description.
- [x] Split the page into small reusable panels.
- [x] Keep audio state separate from page layout.
- [x] Stop active notes when leaving the page.
- [x] Dispose temporary audio nodes on page cleanup.
- [x] Show an error panel for audio failures.
- [x] Add a reset-all-controls button.
- [x] Add a compact and expanded layout option.

## Audio Startup

- [x] Create the audio context after user interaction.
- [x] Add a button to start the audio context.
- [x] Show the current audio context state.
- [x] Add a button to resume a suspended context.
- [x] Warn when browser audio is unavailable.
- [x] Warn when audio output is muted.
- [x] Show the current sample rate.
- [x] Show the current output latency.
- [x] Add a master mute button.
- [x] Add a master gain control.

## Sound Bank Registry

- [x] Define a common sound bank instrument interface.
- [x] Give each instrument a stable unique ID.
- [x] Store the General MIDI program number.
- [x] Store the General MIDI instrument name.
- [x] Store the General MIDI family name.
- [x] Store supported musical roles.
- [x] Store the recommended MIDI note range.
- [x] Store the preferred MIDI note range.
- [x] Store the default velocity.
- [x] Store the default note duration.
- [ ] Let plugins register sound bank instruments.
- [ ] Reject duplicate instrument IDs.
- [ ] Reject duplicate program mappings.
- [ ] Validate instrument definitions on registration.
- [ ] Show invalid instruments in a warning list.

## General MIDI Instruments

- [ ] Add all 128 General MIDI program names.
- [ ] Group instruments by General MIDI family.
- [ ] Show program numbers from 0 to 127.
- [ ] Add a search field for instrument names.
- [ ] Add a filter for instrument families.
- [ ] Add a filter for musical roles.
- [ ] Add a filter for playable note ranges.
- [ ] Sort instruments by program number.
- [ ] Allow sorting instruments by name.
- [ ] Allow sorting instruments by family.
- [ ] Highlight the selected instrument.
- [ ] Show unavailable programs as disabled.
- [ ] Mark programs using placeholder patches.
- [ ] Mark programs with custom patches.
- [ ] Add previous and next instrument buttons.

## General MIDI Families

- [ ] Add the Piano family.
- [ ] Add the Chromatic Percussion family.
- [ ] Add the Organ family.
- [ ] Add the Guitar family.
- [ ] Add the Bass family.
- [ ] Add the Strings family.
- [ ] Add the Ensemble family.
- [ ] Add the Brass family.
- [ ] Add the Reed family.
- [ ] Add the Pipe family.
- [ ] Add the Synth Lead family.
- [ ] Add the Synth Pad family.
- [ ] Add the Synth Effects family.
- [ ] Add the Ethnic family.
- [ ] Add the Percussive family.
- [ ] Add the Sound Effects family.

## Percussion Browser

- [ ] Create a separate percussion browser.
- [ ] Use General MIDI percussion note mappings.
- [ ] Show the MIDI note for each drum sound.
- [ ] Show percussion names beside note numbers.
- [ ] Group related percussion sounds.
- [ ] Add a filter for drum families.
- [ ] Add a button to play each percussion sound.
- [ ] Add a small drum pad grid.
- [ ] Add keyboard shortcuts for drum pads.
- [ ] Show missing percussion patches.
- [ ] Prevent percussion from using pitched controls.
- [ ] Add a percussion range audition.
- [ ] Add a standard drum pattern audition.
- [ ] Add a quiet percussion pattern audition.

## Instrument Details

- [ ] Show the selected instrument ID.
- [ ] Show the MIDI program number.
- [ ] Show the General MIDI name.
- [ ] Show the instrument family.
- [ ] Show supported musical roles.
- [ ] Show the preferred note range.
- [ ] Show the full playable note range.
- [ ] Show the current patch variant.
- [ ] Show the patch source plugin.
- [ ] Show whether the patch is generated.
- [ ] Show whether the patch uses samples.
- [ ] Show whether the patch uses synthesis.
- [ ] Show the current polyphony limit.
- [ ] Show the estimated patch complexity.
- [ ] Show instrument validation warnings.

## Oscillator Controls

- [ ] Show the primary oscillator type.
- [ ] Allow changing the primary oscillator type.
- [ ] Show the harmonic oscillator type.
- [ ] Allow changing the harmonic oscillator type.
- [ ] Add a primary oscillator gain control.
- [ ] Add a harmonic oscillator gain control.
- [ ] Add a harmonic frequency ratio control.
- [ ] Add a harmonic detune control.
- [ ] Add a primary detune control.
- [ ] Add an oscillator phase control if supported.
- [ ] Add a noise source amount control.
- [ ] Show active oscillator count.
- [ ] Add a button to disable each oscillator.
- [ ] Add a button to solo each oscillator.
- [ ] Prevent invalid oscillator values.

## Supported Waveforms

- [ ] Add a sine waveform option.
- [ ] Add a square waveform option.
- [ ] Add a sawtooth waveform option.
- [ ] Add a triangle waveform option.
- [ ] Add a custom periodic waveform option.
- [ ] Add a white noise option.
- [ ] Add a pink noise option if supported.
- [ ] Add a brown noise option if supported.
- [ ] Show a preview of the selected waveform.
- [ ] Show the harmonic content of each waveform.

## Envelope Controls

- [ ] Add an attack time control.
- [ ] Add a decay time control.
- [ ] Add a sustain level control.
- [ ] Add a release time control.
- [ ] Add an attack curve selector.
- [ ] Add a decay curve selector.
- [ ] Add a release curve selector.
- [ ] Show envelope values in milliseconds.
- [ ] Show sustain as a normalized value.
- [ ] Add a visual ADSR envelope.
- [ ] Update the envelope preview live.
- [ ] Warn when attack is unusually long.
- [ ] Warn when release is unusually long.
- [ ] Prevent negative envelope values.
- [ ] Add an envelope reset button.

## Filter Controls

- [ ] Show the current filter type.
- [ ] Add a filter type selector.
- [ ] Add a filter cutoff control.
- [ ] Add a filter resonance control.
- [ ] Add a filter gain control when supported.
- [ ] Add a filter detune control.
- [ ] Add a filter envelope amount control.
- [ ] Add a filter attack control.
- [ ] Add a filter decay control.
- [ ] Add a filter sustain control.
- [ ] Add a filter release control.
- [ ] Show the filter response curve.
- [ ] Update the response curve live.
- [ ] Add a filter bypass button.
- [ ] Warn about unstable resonance values.

## Gain and Stereo Controls

- [ ] Add an instrument gain control.
- [ ] Add an instrument pan control.
- [ ] Show gain in decibels.
- [ ] Show pan as left, center, or right.
- [ ] Add a mono output toggle.
- [ ] Add a stereo output toggle.
- [ ] Add a stereo width control.
- [ ] Add a phase inversion test.
- [ ] Warn when gain may cause clipping.
- [ ] Add a normalize-preview option.

## Effects Controls

- [ ] Add a dry signal gain control.
- [ ] Add a wet signal gain control.
- [ ] Add a reverb amount control.
- [ ] Add a reverb decay control.
- [ ] Add a reverb pre-delay control.
- [ ] Add a delay amount control.
- [ ] Add a delay time control.
- [ ] Add a delay feedback control.
- [ ] Add a chorus amount control.
- [ ] Add a chorus rate control.
- [ ] Add a chorus depth control.
- [ ] Add a distortion amount control.
- [ ] Add an effects bypass button.
- [ ] Add a reset-effects button.
- [ ] Prevent unsafe feedback values.

## Virtual Keyboard

- [ ] Add a clickable piano keyboard.
- [ ] Show white and black keys.
- [ ] Support mouse input.
- [ ] Support touch input.
- [ ] Support computer keyboard input.
- [ ] Show pressed key states.
- [ ] Show note names on keys.
- [ ] Show MIDI note numbers on keys.
- [ ] Add a note label toggle.
- [ ] Add a MIDI number toggle.
- [ ] Add octave-down and octave-up buttons.
- [ ] Show the current keyboard octave.
- [ ] Add a keyboard range selector.
- [ ] Add a velocity control.
- [ ] Add a sustain control.
- [ ] Add a note duration control.
- [ ] Support holding multiple notes.
- [ ] Stop notes when pointer input ends.
- [ ] Stop notes when keyboard focus is lost.
- [ ] Add an all-notes-off button.

## Recommended Range Display

- [ ] Mark the full playable range on the keyboard.
- [ ] Mark the preferred range on the keyboard.
- [ ] Dim notes outside the playable range.
- [ ] Warn when playing outside the playable range.
- [ ] Show the lowest recommended note.
- [ ] Show the highest recommended note.
- [ ] Allow range warnings to be disabled.
- [ ] Show range differences between variants.

## Chord Controls

- [ ] Add a major triad button.
- [ ] Add a minor triad button.
- [ ] Add a diminished triad button.
- [ ] Add an augmented triad button.
- [ ] Add a suspended second button.
- [ ] Add a suspended fourth button.
- [ ] Add a dominant seventh button.
- [ ] Add a major seventh button.
- [ ] Add a minor seventh button.
- [ ] Add chord inversion controls.
- [ ] Add a root note selector.
- [ ] Show the notes in the selected chord.
- [ ] Add a stop-chord button.
- [ ] Warn about notes outside the patch range.

## Scale Controls

- [ ] Add a chromatic scale audition.
- [ ] Add a major scale audition.
- [ ] Add a natural minor scale audition.
- [ ] Add a harmonic minor scale audition.
- [ ] Add a melodic minor scale audition.
- [ ] Add a pentatonic scale audition.
- [ ] Add a blues scale audition.
- [ ] Add a Dorian scale audition.
- [ ] Add a Mixolydian scale audition.
- [ ] Add a root note selector.
- [ ] Add ascending and descending options.
- [ ] Add a scale tempo control.
- [ ] Show the notes in the selected scale.
- [ ] Add a stop-scale button.

## Audition Patterns

- [ ] Add a single middle note audition.
- [ ] Add a single low note audition.
- [ ] Add a single high note audition.
- [ ] Add a full-range note sweep.
- [ ] Add a velocity sweep.
- [ ] Add a short-note repetition test.
- [ ] Add a long sustained note test.
- [ ] Add a repeated eighth-note test.
- [ ] Add a repeated quarter-note test.
- [ ] Add a major arpeggio test.
- [ ] Add a minor arpeggio test.
- [ ] Add a sustained major chord test.
- [ ] Add a sustained minor chord test.
- [ ] Add a standard melody test.
- [ ] Add a bass pattern test.
- [ ] Add a harmony pad test.
- [ ] Add a lead phrase test.
- [ ] Add a percussion groove test.
- [ ] Use the same tests for every patch.
- [ ] Add a stop-audition button.

## Test Pattern Settings

- [ ] Add an audition tempo control.
- [ ] Add an audition root note control.
- [ ] Add an audition octave control.
- [ ] Add an audition velocity control.
- [ ] Add an audition duration control.
- [ ] Add an audition gate length control.
- [ ] Add an audition repeat count control.
- [ ] Add an audition loop toggle.
- [ ] Show the active audition pattern.
- [ ] Show the current audition step.

## Waveform Display

- [ ] Add a time-domain waveform display.
- [ ] Draw the live output waveform.
- [ ] Add a waveform pause button.
- [ ] Add a waveform clear button.
- [ ] Add a waveform zoom control.
- [ ] Add a waveform time-scale control.
- [ ] Show the waveform sample count.
- [ ] Show positive and negative peak levels.
- [ ] Mark clipped samples.
- [ ] Add a zero-amplitude guide line.
- [ ] Add an envelope overlay.
- [ ] Resize the graph with the page.

## Oscillator Waveform Display

- [ ] Show the primary oscillator waveform.
- [ ] Show the harmonic oscillator waveform.
- [ ] Show the combined oscillator waveform.
- [ ] Add one-cycle and multi-cycle views.
- [ ] Update waveform previews after parameter changes.
- [ ] Label the waveform axes.
- [ ] Show the waveform period.
- [ ] Show the waveform frequency.

## Spectrum Display

- [ ] Add a frequency spectrum display.
- [ ] Show frequency on the horizontal axis.
- [ ] Show level on the vertical axis.
- [ ] Add linear frequency scaling.
- [ ] Add logarithmic frequency scaling.
- [ ] Mark the expected fundamental frequency.
- [ ] Mark detected harmonic peaks.
- [ ] Show the strongest frequency peak.
- [ ] Show the current analyzer FFT size.
- [ ] Add an FFT size selector.
- [ ] Add spectrum smoothing control.
- [ ] Add a spectrum freeze button.
- [ ] Add a spectrum clear button.

## Spectrogram

- [ ] Add a scrolling spectrogram.
- [ ] Show time on one axis.
- [ ] Show frequency on one axis.
- [ ] Show intensity using brightness.
- [ ] Add a spectrogram pause button.
- [ ] Add a spectrogram clear button.
- [ ] Add a spectrogram time range control.
- [ ] Add a spectrogram frequency range control.
- [ ] Mark the played MIDI note.
- [ ] Mark note start and stop times.

## Level Meters

- [ ] Add a peak level meter.
- [ ] Add an RMS level meter.
- [ ] Show level values in decibels.
- [ ] Add a clipping indicator.
- [ ] Add a peak hold marker.
- [ ] Add a reset-peak button.
- [ ] Show left and right channel levels.
- [ ] Show the dry signal level.
- [ ] Show the processed signal level.
- [ ] Warn when output is too quiet.
- [ ] Warn when output is clipping.

## Patch Editing

- [ ] Allow editing all patch parameters.
- [ ] Mark values changed from defaults.
- [ ] Add an undo button.
- [ ] Add a redo button.
- [ ] Add a restore-defaults button.
- [ ] Add a revert-to-loaded button.
- [ ] Add a copy-patch button.
- [ ] Add a paste-patch button.
- [ ] Validate pasted patch data.
- [ ] Show patch validation errors.
- [ ] Prevent invalid values from being saved.
- [ ] Preview changes without reloading the page.

## Patch Variants

- [ ] Allow multiple variants per MIDI program.
- [ ] Add a variant selector.
- [ ] Add a create-variant button.
- [ ] Add a duplicate-variant button.
- [ ] Add a rename-variant button.
- [ ] Add a delete-variant button.
- [ ] Prevent deleting the required default variant.
- [ ] Add biome tags to variants.
- [ ] Add culture tags to variants.
- [ ] Add location tags to variants.
- [ ] Add mood tags to variants.
- [ ] Add encounter tags to variants.
- [ ] Show why a variant was selected.
- [ ] Compare variants using one audition pattern.

## Patch Import and Export

- [ ] Export the selected patch as JSON.
- [ ] Export all patches as JSON.
- [ ] Import one patch from JSON.
- [ ] Import a full sound bank from JSON.
- [ ] Validate imported patch versions.
- [ ] Show import errors without crashing.
- [ ] Warn before replacing existing patches.
- [ ] Copy patch JSON to the clipboard.
- [ ] Paste patch JSON from a text field.
- [ ] Include the patch schema version.
- [ ] Include the source plugin ID.
- [ ] Include the MIDI program mapping.

## A/B Comparison

- [ ] Add patch A and patch B slots.
- [ ] Load the current patch into slot A.
- [ ] Load another patch into slot B.
- [ ] Add an instant A/B switch.
- [ ] Use the same audition pattern for both slots.
- [ ] Match output volume before comparison.
- [ ] Show parameter differences.
- [ ] Highlight changed parameter values.
- [ ] Compare current and default patches.
- [ ] Compare current and previous patches.
- [ ] Compare dry and processed signals.
- [ ] Add a blind comparison mode.
- [ ] Add a clear-comparison button.

## Reference Patches

- [ ] Create a small known-good patch library.
- [ ] Add a known-good piano patch.
- [ ] Add a known-good bass patch.
- [ ] Add a known-good string patch.
- [ ] Add a known-good flute patch.
- [ ] Add a known-good brass patch.
- [ ] Add a known-good synth lead patch.
- [ ] Add a known-good synth pad patch.
- [ ] Add a known-good percussion kit.
- [ ] Mark reference patches as read-only.
- [ ] Allow generated patches to compare with references.

## WAV Rendering

- [ ] Add offline audio rendering.
- [ ] Render a single note to WAV.
- [ ] Render a sustained note to WAV.
- [ ] Render a chord to WAV.
- [ ] Render a scale to WAV.
- [ ] Render an arpeggio to WAV.
- [ ] Render the standard melody to WAV.
- [ ] Render a velocity sweep to WAV.
- [ ] Render a full-range sweep to WAV.
- [ ] Render dry audio to WAV.
- [ ] Render processed audio to WAV.
- [ ] Show rendering progress.
- [ ] Allow cancelling a WAV render.
- [ ] Include the patch name in the filename.
- [ ] Include the MIDI note in note filenames.
- [ ] Validate the generated WAV file.

## MIDI Rendering

- [ ] Export the audition pattern as MIDI.
- [ ] Export the selected scale as MIDI.
- [ ] Export the selected chord as MIDI.
- [ ] Export the standard melody as MIDI.
- [ ] Include the selected program number.
- [ ] Include the selected tempo.
- [ ] Include note velocity values.
- [ ] Include note duration values.
- [ ] Add MIDI track names.
- [ ] Validate exported MIDI timing.

## Song Track Testing

- [ ] Load a generated song for patch testing.
- [ ] Select one song track for playback.
- [ ] Play bass only.
- [ ] Play harmony only.
- [ ] Play lead only.
- [ ] Play percussion only.
- [ ] Play all tracks together.
- [ ] Mute individual tracks.
- [ ] Solo individual tracks.
- [ ] Swap one track's instrument patch.
- [ ] Render one track to WAV.
- [ ] Render the full song to WAV.
- [ ] Render the song without effects.
- [ ] Render the song with effects.
- [ ] Show the patch used by each track.

## Environmental Testing

- [ ] Add a forest ambience test.
- [ ] Add a town ambience test.
- [ ] Add a cave ambience test.
- [ ] Add a dungeon ambience test.
- [ ] Add a rain ambience test.
- [ ] Add a wind ambience test.
- [ ] Add an ocean ambience test.
- [ ] Add an indoor ambience test.
- [ ] Add an outdoor ambience test.
- [ ] Add environmental volume controls.
- [ ] Test the patch against environmental sounds.
- [ ] Warn when the patch is masked by ambience.

## Mix Testing

- [ ] Add a simple bass backing track.
- [ ] Add a simple harmony backing track.
- [ ] Add a simple percussion backing track.
- [ ] Add a full backing mix.
- [ ] Add backing track gain controls.
- [ ] Add a selected patch gain control.
- [ ] Show frequency overlap with backing tracks.
- [ ] Warn about heavy register overlap.
- [ ] Warn when the patch disappears in the mix.
- [ ] Warn when the patch dominates the mix.
- [ ] Add a mono mix compatibility test.

## Instrument Range Validation

- [ ] Warn when a note is below the playable range.
- [ ] Warn when a note is above the playable range.
- [ ] Warn when a bass patch is unusually high.
- [ ] Warn when a lead patch is unusually low.
- [ ] Warn when a pad covers too much range.
- [ ] Warn when percussion uses pitched mappings.
- [ ] Test volume across the full playable range.
- [ ] Report the quietest tested note.
- [ ] Report the loudest tested note.
- [ ] Report large volume changes between notes.

## Automatic Patch Checks

- [ ] Detect clipped output.
- [ ] Detect output that is too quiet.
- [ ] Detect output with no audible signal.
- [ ] Detect excessive attack time.
- [ ] Detect excessive release time.
- [ ] Detect notes that fail to stop.
- [ ] Detect excessive low-frequency energy.
- [ ] Detect excessive high-frequency energy.
- [ ] Detect a weak fundamental frequency.
- [ ] Detect inconsistent volume by octave.
- [ ] Detect inconsistent velocity response.
- [ ] Detect polyphonic clipping.
- [ ] Detect invalid filter frequencies.
- [ ] Detect unsafe filter resonance.
- [ ] Detect unsafe delay feedback.
- [ ] Detect invalid oscillator ratios.
- [ ] Detect unsupported waveform values.
- [ ] Detect invalid playable ranges.
- [ ] Detect missing required patch values.
- [ ] Show checks as pass, warning, or failure.

## Polyphony Testing

- [ ] Add a two-note polyphony test.
- [ ] Add a three-note polyphony test.
- [ ] Add a four-note polyphony test.
- [ ] Add an eight-note polyphony test.
- [ ] Add a dense chord test.
- [ ] Show active voice count.
- [ ] Show the configured voice limit.
- [ ] Show voice stealing events.
- [ ] Warn when voice stealing is audible.
- [ ] Warn when polyphony causes clipping.
- [ ] Add a release-tail stress test.
- [ ] Add an all-notes-off recovery test.

## Velocity Testing

- [ ] Add a low-velocity note test.
- [ ] Add a medium-velocity note test.
- [ ] Add a high-velocity note test.
- [ ] Add a full velocity sweep.
- [ ] Show output level by velocity.
- [ ] Show timbre changes by velocity.
- [ ] Warn about weak velocity response.
- [ ] Warn about extreme velocity jumps.
- [ ] Allow velocity curves to be edited.
- [ ] Show the active velocity curve.

## Performance Monitoring

- [ ] Show audio node count.
- [ ] Show active voice count.
- [ ] Show analyzer node count.
- [ ] Show estimated CPU usage.
- [ ] Show render duration.
- [ ] Show offline render duration.
- [ ] Show dropped audio events.
- [ ] Show late note events.
- [ ] Show the longest audio callback delay.
- [ ] Warn when patch complexity is too high.
- [ ] Add a low-quality preview mode.
- [ ] Add a normal-quality preview mode.
- [ ] Add a high-quality preview mode.

## Patch Complexity Limits

- [ ] Set a maximum oscillator count.
- [ ] Set a maximum filter count.
- [ ] Set a maximum effects count.
- [ ] Set a maximum polyphony value.
- [ ] Set a maximum release duration.
- [ ] Set a maximum delay feedback value.
- [ ] Show the current complexity score.
- [ ] Reject patches above hard limits.
- [ ] Warn about patches near soft limits.
- [ ] Allow debug overrides for limits.

## Playback State

- [ ] Show the current MIDI note.
- [ ] Show the current note name.
- [ ] Show the current velocity.
- [ ] Show the current frequency.
- [ ] Show the current note duration.
- [ ] Show the current audition pattern.
- [ ] Show whether sustain is active.
- [ ] Show whether effects are active.
- [ ] Show the number of active notes.
- [ ] Add an emergency stop button.

## Preset Management

- [ ] Add a save-preset button.
- [ ] Add a load-preset selector.
- [ ] Add a rename-preset button.
- [ ] Add a duplicate-preset button.
- [ ] Add a delete-preset button.
- [ ] Warn before deleting a preset.
- [ ] Mark built-in presets as read-only.
- [ ] Show when a preset has unsaved changes.
- [ ] Add a discard-changes button.
- [ ] Store preset schema versions.

## Debug Information

- [ ] Show the selected instrument object.
- [ ] Show the resolved patch object.
- [ ] Show the generated audio graph.
- [ ] Show active audio node connections.
- [ ] Show patch selection rules.
- [ ] Show plugin contribution details.
- [ ] Show fallback patch usage.
- [ ] Show audio initialization errors.
- [ ] Show note scheduling errors.
- [ ] Show offline rendering errors.
- [ ] Add a copy-debug-report button.
- [ ] Add a download-debug-report button.

## Accessibility

- [ ] Add accessible labels to all controls.
- [ ] Support full keyboard navigation.
- [ ] Show visible keyboard focus.
- [ ] Add text values beside sliders.
- [ ] Avoid relying only on color for warnings.
- [ ] Add reduced-motion graph settings.
- [ ] Add a high-contrast graph option.
- [ ] Add a screen-reader status region.
- [ ] Announce the selected instrument.
- [ ] Announce validation failures.

## Responsive Layout

- [ ] Support desktop layouts.
- [ ] Support tablet layouts.
- [ ] Support narrow mobile layouts.
- [ ] Make the keyboard horizontally scrollable.
- [ ] Stack panels on narrow screens.
- [ ] Keep playback controls visible.
- [ ] Keep the emergency stop visible.
- [ ] Resize graphs without losing data.
- [ ] Avoid overflowing long instrument names.

## Page Persistence

- [ ] Remember the selected instrument.
- [ ] Remember the selected patch variant.
- [ ] Remember the keyboard octave.
- [ ] Remember audition settings.
- [ ] Remember graph settings.
- [ ] Remember the selected family filter.
- [ ] Remember the selected quality mode.
- [ ] Restore settings without starting audio.
- [ ] Clear saved debug settings on request.

## Unit Tests

- [ ] Test General MIDI program registration.
- [ ] Test duplicate program rejection.
- [ ] Test patch validation.
- [ ] Test oscillator setting validation.
- [ ] Test envelope setting validation.
- [ ] Test filter setting validation.
- [ ] Test effect setting validation.
- [ ] Test playable range validation.
- [ ] Test percussion note mapping.
- [ ] Test note-name conversion.
- [ ] Test MIDI note frequency conversion.
- [ ] Test WAV filename generation.
- [ ] Test MIDI filename generation.
- [ ] Test patch import and export.
- [ ] Test preset version migration.
- [ ] Test all-notes-off behavior.

## Integration Tests

- [ ] Test selecting every General MIDI program.
- [ ] Test playing every virtual keyboard note.
- [ ] Test switching instruments during playback.
- [ ] Test switching variants during playback.
- [ ] Test dry and processed playback.
- [ ] Test every audition pattern.
- [ ] Test WAV rendering.
- [ ] Test MIDI rendering.
- [ ] Test song track isolation.
- [ ] Test A/B comparison.
- [ ] Test audio context suspension.
- [ ] Test audio context recovery.
- [ ] Test page cleanup with active notes.
- [ ] Test imported invalid patch data.

## Performance Tests

- [ ] Measure initial page load time.
- [ ] Measure instrument switch time.
- [ ] Measure first-note startup time.
- [ ] Measure graph rendering cost.
- [ ] Measure an eight-note chord.
- [ ] Measure the full-range sweep.
- [ ] Measure WAV rendering speed.
- [ ] Measure rapid instrument changes.
- [ ] Measure repeated note scheduling.
- [ ] Measure high-polyphony playback.
- [ ] Verify the page releases audio resources.
- [ ] Verify repeated visits do not leak nodes.

## Initial Delivery

- [ ] Create the page shell.
- [ ] Add the instrument registry.
- [ ] Add the General MIDI program list.
- [ ] Add basic instrument selection.
- [ ] Add a one-octave virtual keyboard.
- [ ] Play one note with the selected patch.
- [ ] Add an all-notes-off button.
- [ ] Show the selected patch parameters.
- [ ] Add basic ADSR controls.
- [ ] Add a simple waveform display.
- [ ] Add a single-note WAV export.
- [ ] Add basic patch JSON export.

## Second Delivery

- [ ] Add all keyboard octaves.
- [ ] Add instrument family filters.
- [ ] Add chord and scale auditions.
- [ ] Add spectrum and level meters.
- [ ] Add filter and effects controls.
- [ ] Add automatic clipping checks.
- [ ] Add playable range warnings.
- [ ] Add patch import support.
- [ ] Add patch variants.
- [ ] Add A/B comparison.

## Third Delivery

- [ ] Add the percussion browser.
- [ ] Add standard melody auditions.
- [ ] Add song track testing.
- [ ] Add environmental testing.
- [ ] Add full-song WAV rendering.
- [ ] Add the spectrogram.
- [ ] Add detailed patch validation.
- [ ] Add performance monitoring.
- [ ] Add reference patches.
- [ ] Add integration and performance tests.
