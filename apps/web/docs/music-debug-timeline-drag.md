## Music Debug Timeline Drag

The music debug timeline now supports pointer dragging in the full-song view.
The page keeps a temporary drag offset separate from live playback state so the
playhead, section buttons, and current-time labels stay locked to the pointer
until release.

Track-label clicks still bypass drag startup. That preserves the existing mute
toggle interaction on the left rail while allowing normal click-to-seek and
drag-to-scrub behavior everywhere else on the timeline canvas.
