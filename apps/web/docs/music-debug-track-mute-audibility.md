## Music Debug Track Mute Audibility

The music debug page now treats hidden timeline roles as audible mutes, not
just visual filters. The playback-role selection is resolved through the same
persisted `hiddenRoles` state that drives the timeline and track controls.

When a track is hidden while playback is already running, the page restarts the
current playback region with the filtered role list. That keeps the transport
position stable while making the mute change audible immediately.
