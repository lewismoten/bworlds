## Music Debug Section Jumps

The music debug transport exposes section buttons from
`resolveMusicDebugSectionJumpTargets()`, and the page routes those button
offsets back through the same playback restart path used by timeline seeking.

That means a section jump during active playback is not a special-case UI path:
it restarts the current song from the target section offset while preserving the
current loop mode and playback-role filters.
