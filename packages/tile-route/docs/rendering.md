# Route Rendering

The route package now supports progressive model builds through
`create3DModelProgressive(...)` on the `road`, `bridge`, and `dock` tiles so the
renderer can spread heavier crossing work across multiple frames instead of
building every route crossing in one flush.

Current road progressive phases:

- isolated stubs: `stub-shoulder`, `stub-road`
- straight runs: `center-patch`, `shoulder-ribbon`, `road-ribbon`
- junctions: `center-patch`, then one `branch-N` phase per connected branch

Current bridge progressive phases:

- forest-log bridges: `trunk`, `supports`
- standard bridges: `deck`, `railings-or-parapets`, plus optional `cover`,
  `drawbridge`, and `pillars` phases when the regional bridge style uses them

Current dock progressive phases:

- `deck-and-piles`
- `boat`
- `route-sign`

The synchronous `create3DModel()` path still exhausts the same generator so the
progressive and eager dock builds stay structurally aligned.
