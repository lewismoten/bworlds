# Route Profile Caching

`createRoadsideRouteProfile(...)` now caches two things for the lifetime of one
profile calculation:

- terrain signal reads by coordinate
- predicted route presence by coordinate
- nearest-town and bridge-snap route-path lookups by coordinate

This keeps repeated junction and span scans from rediscovering the same nearby
route cells and terrain samples over and over while preserving deterministic
results and the existing public API.

The implementation now uses nested numeric coordinate caches for both lookups
instead of allocating temporary composite string keys like ```${x}:${y}``` for
every hot-path read during one roadside profile scan.
