# Route Rendering

The route package now supports progressive model builds through
`create3DModelProgressive(...)` on the `road`, `bridge`, and `dock` tiles so the
renderer can spread heavier crossing work across multiple frames instead of
building every route crossing in one flush.

Current road progressive phases:

- isolated stubs: `stub-shoulder`, `stub-road`
- straight runs: `center-patch`, `shoulder-ribbon`, `road-ribbon`
- junctions: `center-patch`, then one `branch-N` phase per connected branch

Low-detail road builds now drop shoulder ribbons entirely, and low-detail
junctions also drop the shoulder center patch. That keeps three-way junctions
under the low-detail tile draw-call cap instead of building decorative road
trim only to prune or reject it later.

Low-detail straight roads now use the road ribbon mesh itself as the tile root
and attach the center patch beneath it. That removes one static wrapper
`Group` from each visible low-detail straight road while preserving the same
surface marker and patch placement.

Road shoulder meshes are tagged as optional render-budget parts. When a dense
road junction crosses the per-tile draw-call cap, `render3d` can prune shoulder
strips first and keep the core road surface instead of rejecting the entire
tile model and forcing a visible LOD recovery failure.

Current bridge progressive phases:

- forest-log bridges: `trunk`, `supports`
- standard bridges: `deck`, `railings-or-parapets`, plus optional `cover`,
  `drawbridge`, and `pillars` phases when the regional bridge style uses them

Current dock progressive phases:

- `deck-and-piles`
- `boat`
- `route-sign`

Dock surface materials now resolve through a host-level palette cache instead of
staying scoped to one dock cluster key. Separate dock clusters in the same
renderer can reuse the same deck, rail, pile, boat, sail, and trim materials
when their effective palette matches.

Standard bridge appearance builders also reuse the untextured trim and post
materials through a host-level cache keyed by effective color/roughness/
metalness values. Region-specific bridge textures still vary where needed, but
equivalent solid accent materials no longer duplicate per bridge appearance.

Forest-log bridges now use the fallen trunk mesh itself as the tile root and
attach the repeated support posts beneath it. That removes one static wrapper
`Group` from each visible forest-log bridge while preserving the same support
placement and traversal marker metadata.

Standard bridges now use the deck mesh as the tile root and attach the
railings/parapets, optional cover, optional drawbridge details, and optional
pillars beneath it. That removes one static wrapper `Group` from each visible
standard bridge tile while preserving the same local bridge-part placement.

Dock tiles now use the deck mesh as the tile root and attach the repeated
rails, piles, optional boat, and optional route sign beneath it. That removes
one static wrapper `Group` from each visible dock tile while preserving the
same local placements and route signage behavior.

The synchronous `create3DModel()` path still exhausts the same generator so the
progressive and eager dock builds stay structurally aligned.
