## Music Debug Track Label Toggle

The music debug timeline now treats the left track-label column as an
interactive mute-toggle target.

Clicking a label reuses the existing hidden-role state that already drives the
separate visibility buttons, so the timeline gets both behaviors together:

- clicking a track name toggles that role on or off
- the label immediately shifts to the muted visual state
