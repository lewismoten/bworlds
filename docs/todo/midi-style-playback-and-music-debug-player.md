# MIDI-Style Playback and Music Debug Player

## Playback Architecture

- [ ] Create one shared music playback engine for game and debug use.
- [ ] Make debug playback use the same engine as in-world playback.
- [ ] Keep MIDI export and live playback driven by the same note data.
- [ ] Keep timing conversion shared between MIDI and live playback.
- [ ] Keep track volume and pan data shared with MIDI export.
- [ ] Keep program and instrument choices shared with MIDI export.
- [ ] Keep articulation data shared with MIDI export when possible.
- [ ] Add a playback snapshot for the currently sounding song.

## MIDI Timing

- [ ] Schedule notes from musical ticks instead of ad hoc delays.
- [ ] Use one tempo map for all playback tracks.
- [ ] Use one meter map for all playback tracks.
- [ ] Keep note starts aligned to the shared transport clock.
- [ ] Keep note ends aligned to the shared transport clock.
- [ ] Schedule ahead with a short rolling playback window.
- [ ] Avoid creating notes only when animation frames arrive.
- [ ] Keep audio scheduling independent from render frame rate.
- [ ] Measure live timing drift against MIDI event times.
- [ ] Warn when live playback drifts beyond a small threshold.

## Instrument Program Mapping

- [ ] Give every pitched track a sound bank program ID.
- [ ] Map program IDs to available sound bank patches.
- [ ] Keep one selected patch per active track.
- [ ] Fall back to a known-good patch when one is unavailable.
- [ ] Show the selected patch name beside every track.
- [ ] Show the intended General MIDI instrument name.
- [ ] Show the actual internal patch used for playback.
- [ ] Warn when the selected patch is only an approximation.

## Instrument Switching

- [ ] Add an instrument selector to every pitched track.
- [ ] List only patches compatible with the track role.
- [ ] Allow browsing all patches when debug mode is enabled.
- [ ] Group available patches by instrument family.
- [ ] Show the current patch before opening the selector.
- [ ] Switch patches without regenerating the composition.
- [ ] Keep playback position when changing instruments.
- [ ] Apply patch changes at the next safe note boundary.
- [ ] Add a restore-generated-instrument button.
- [ ] Add a random-compatible-instrument button.
- [ ] Add an A/B instrument comparison button.
- [ ] Save manual patch overrides in debug state only.

## Percussion Playback

- [ ] Treat percussion as a drum kit instead of one instrument.
- [ ] Map each percussion MIDI note to its own drum patch.
- [ ] Keep kick, snare, tom, hat, cymbal, and shaker distinct.
- [ ] Let each drum voice have its own gain and pan.
- [ ] Let each drum voice have its own envelope.
- [ ] Let each drum voice use its own synthesis recipe.
- [ ] Keep drum timing on the shared MIDI transport.
- [ ] Add per-drum mute and solo controls.
- [ ] Show drum names beside active percussion notes.

## Velocity

- [ ] Use MIDI velocity to control note loudness.
- [ ] Map velocity through a configurable response curve.
- [ ] Let velocity affect timbre when the patch supports it.
- [ ] Let velocity affect filter brightness when appropriate.
- [ ] Let velocity affect attack strength when appropriate.
- [ ] Preserve exported MIDI velocity in live playback.
- [ ] Show note velocity in the debug timeline.
- [ ] Warn when a track uses an overly narrow velocity range.

## Expression

- [ ] Support track volume automation.
- [ ] Support MIDI expression automation.
- [ ] Support modulation for suitable instruments.
- [ ] Support sustain pedal behavior where appropriate.
- [ ] Support pitch bend where the patch allows it.
- [ ] Support pan automation when musically appropriate.
- [ ] Support crescendo and diminuendo curves.
- [ ] Support sustained-note swells.
- [ ] Keep expression curves optional by instrument family.

## Articulation

- [ ] Support normal articulation.
- [ ] Support legato articulation.
- [ ] Support staccato articulation.
- [ ] Support accented articulation.
- [ ] Support sustained articulation.
- [ ] Support vibrato for suitable sustained notes.
- [ ] Support tremolo where suitable.
- [ ] Let patches define supported articulations.
- [ ] Ignore unsupported articulations safely.
- [ ] Show articulation names in debug note details.

## Note Lifecycle

- [ ] Separate note-on and note-off behavior.
- [ ] Keep active voices alive until proper note-off.
- [ ] Avoid cutting notes off at render frame boundaries.
- [ ] Apply release envelopes after note-off.
- [ ] Handle overlapping notes on the same pitch correctly.
- [ ] Handle repeated notes without cutting the prior release.
- [ ] Add voice stealing only when polyphony limits require it.
- [ ] Prefer stealing quiet or old voices first.
- [ ] Add an all-notes-off safety command.

## Patch Quality

- [ ] Create known-good patches for common MIDI families.
- [ ] Tune patches against familiar MIDI playback expectations.
- [ ] Avoid using raw oscillator tones as final instruments.
- [ ] Add richer harmonic profiles to common instruments.
- [ ] Add attack transients to struck instruments.
- [ ] Add breath noise to wind instruments.
- [ ] Add bow texture to string instruments.
- [ ] Add body resonance to acoustic-style instruments.
- [ ] Add velocity-dependent timbre to expressive patches.
- [ ] Keep patch behavior stable across the playable range.

## Internal Sound Bank

- [ ] Assign every patch a stable sound bank ID.
- [ ] Store a General MIDI program number when applicable.
- [ ] Store the instrument family for every patch.
- [ ] Store supported track roles for every patch.
- [ ] Store supported pitch ranges for every patch.
- [ ] Store supported articulations for every patch.
- [ ] Store whether the patch supports sustain.
- [ ] Store whether the patch supports pitch bend.
- [ ] Store whether the patch supports modulation.
- [ ] Store whether the patch is recommended or experimental.

## Mix Behavior

- [ ] Set a default gain target per track role.
- [ ] Keep lead above harmony when the arrangement requests it.
- [ ] Keep bass centered by default.
- [ ] Pan harmony slightly wider than bass.
- [ ] Pan percussion voices individually.
- [ ] Give each track an independent gain control.
- [ ] Give each track an independent pan control.
- [ ] Give each track an independent reverb send.
- [ ] Give each track an independent effects bypass.
- [ ] Prevent track gains from clipping the master output.
- [ ] Add a master limiter for safety.
- [ ] Keep the limiter transparent under normal playback.

## Reverb and Effects

- [ ] Use one shared room reverb bus for the ensemble.
- [ ] Let each track choose its reverb send amount.
- [ ] Keep bass reverb lower by default.
- [ ] Keep percussion reverb controlled by drum role.
- [ ] Avoid adding full effects chains to every note.
- [ ] Apply shared effects at the track or bus level.
- [ ] Add dry and wet playback comparison.
- [ ] Add a master effects bypass.

## Debug Player Layout

- [ ] Keep play, pause, seek, and volume controls always visible.
- [ ] Keep basic listening controls simple by default.
- [ ] Put advanced MIDI details behind optional toggles.
- [ ] Add a compact and expanded debug player mode.
- [ ] Keep the timeline as the main visualization.
- [ ] Keep track controls aligned with their timeline lanes.
- [ ] Keep instrument selectors beside track names.
- [ ] Keep advanced automation lanes collapsed by default.

## Timeline Basics

- [ ] Show section boundaries.
- [ ] Show measure numbers.
- [ ] Show beat subdivisions when zoomed in.
- [ ] Show note pitch vertically.
- [ ] Show note duration horizontally.
- [ ] Show track colors consistently.
- [ ] Show the current playhead.
- [ ] Allow clicking the timeline to seek.
- [ ] Allow dragging the playhead.
- [ ] Add whole-song and rolling-window views.

## Rolling Playback View

- [ ] Add a fixed playhead rolling mode.
- [ ] Keep the playhead stationary near the center.
- [ ] Slide track content under the fixed playhead.
- [ ] Show a configurable number of measures around playback.
- [ ] Add a toggle between full-song and rolling views.
- [ ] Preserve zoom when switching timeline modes.
- [ ] Keep section labels visible in rolling mode.

## Note Visualization

- [ ] Show note velocity using brightness or a small marker.
- [ ] Show muted notes with reduced emphasis.
- [ ] Show selected notes with a clear outline.
- [ ] Show active sounding notes with a highlight.
- [ ] Show note names on hover.
- [ ] Show MIDI note numbers on hover.
- [ ] Show note start, duration, and velocity on hover.
- [ ] Show the active chord on note hover when available.

## MIDI Editor Overlays

- [ ] Add a toggle for the piano-roll pitch grid.
- [ ] Add a toggle for measure and beat lines.
- [ ] Add a toggle for chord labels.
- [ ] Add a toggle for motif markers.
- [ ] Add a toggle for cadence markers.
- [ ] Add a toggle for section labels.
- [ ] Add a toggle for velocity markers.
- [ ] Add a toggle for articulation markers.
- [ ] Add a toggle for automation lanes.
- [ ] Add a toggle for percussion voice labels.
- [ ] Keep all optional overlays off in simple mode.

## Automation Lanes

- [ ] Add an optional velocity lane.
- [ ] Add an optional track volume lane.
- [ ] Add an optional expression lane.
- [ ] Add an optional pan lane.
- [ ] Add an optional modulation lane.
- [ ] Add an optional pitch bend lane.
- [ ] Add an optional sustain lane.
- [ ] Show automation curves beneath their track.
- [ ] Allow each automation lane to be hidden independently.

## Track Controls

- [ ] Add mute control per track.
- [ ] Add solo control per track.
- [ ] Add volume control per track.
- [ ] Add pan control per track.
- [ ] Add instrument selector per track.
- [ ] Add reset instrument button per track.
- [ ] Add track effects bypass per track.
- [ ] Add collapse control per track.
- [ ] Show the current program and patch name.

## Transport Controls

- [ ] Add play and pause.
- [ ] Add stop.
- [ ] Add jump to start.
- [ ] Add jump to next section.
- [ ] Add jump to previous section.
- [ ] Add loop section control.
- [ ] Add loop selected range control.
- [ ] Add playback position display.
- [ ] Add BPM display.
- [ ] Add time signature display.
- [ ] Add current section display.
- [ ] Add current measure and beat display.

## Instrument Audition

- [ ] Add a preview button beside every available patch.
- [ ] Play the same test phrase for every patch.
- [ ] Add single-note patch audition.
- [ ] Add chord patch audition.
- [ ] Add scale patch audition.
- [ ] Add short melody patch audition.
- [ ] Stop the current audition before starting another.
- [ ] Keep audition playback separate from song playback.

## Comparison With MIDI Export

- [ ] Add a known-reference MIDI playback comparison test.
- [ ] Compare live note timing to exported MIDI timing.
- [ ] Compare live velocities to exported MIDI velocities.
- [ ] Compare live instrument choices to MIDI program choices.
- [ ] Compare live note lengths to exported MIDI note lengths.
- [ ] Report playback differences in the debug page.
- [ ] Add a playback parity score for each track.
- [ ] Fail tests when live playback differs unexpectedly.

## Playback Diagnostics

- [ ] Report late note starts.
- [ ] Report early note starts.
- [ ] Report missed note-offs.
- [ ] Report voice stealing events.
- [ ] Report peak active voices.
- [ ] Report per-track polyphony.
- [ ] Report timing drift by track.
- [ ] Report average velocity by track.
- [ ] Report track gain and pan values.
- [ ] Report the active patch for every track.

## Performance

- [ ] Avoid allocating a new synth graph for every note.
- [ ] Reuse track-level audio buses.
- [ ] Pool reusable voice components where safe.
- [ ] Cache reusable patch data.
- [ ] Limit active voices per patch.
- [ ] Keep debug visualization off the audio timing path.
- [ ] Throttle UI updates without throttling audio events.
- [ ] Keep audio scheduling independent from React renders.

## Tests

- [ ] Test live note start times against MIDI ticks.
- [ ] Test live note durations against MIDI events.
- [ ] Test velocity affects playback gain.
- [ ] Test velocity affects timbre when supported.
- [ ] Test track volume automation.
- [ ] Test expression automation.
- [ ] Test sustain behavior.
- [ ] Test pitch bend behavior.
- [ ] Test pan behavior.
- [ ] Test instrument switching during playback.
- [ ] Test instrument switching preserves song position.
- [ ] Test percussion uses distinct drum patches.
- [ ] Test muted tracks produce no audio.
- [ ] Test solo tracks mute competing tracks.
- [ ] Test live playback and MIDI export share note data.
- [ ] Test audio timing remains stable during low frame rates.
- [ ] Test all-notes-off clears every active voice.
