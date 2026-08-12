# One-Child Group Diagnostics

`collectSceneResourceStats(...)` now splits one-child `Group` nodes into three
investigation buckets:

- `oneChildGroupPlainWrapperCount`
- `oneChildGroupTransformCount`
- `oneChildGroupTaggedCount`

The intent is to separate likely no-op wrappers from groups that probably serve
an actual purpose.

Current heuristics:

- a plain wrapper has one child, no non-identity local transform, and no
  `userData` keys
- a transform group has one child and any non-default position, rotation, or
  scale
- a tagged group has one child and at least one `userData` key

These categories are exposed through the renderer debug stats and the web debug
snapshot/panel so scene-graph cleanup can target likely removable wrappers
first instead of collapsing semantic pivots such as observatory domes or other
animated anchors.

Visible-tile diagnostics now also summarize those transform-pivot and tagged-
group buckets by plugin owner, alongside the existing total one-child-group and
plain-wrapper summaries. That lets runtime captures answer "which plugin is
still creating transform pivots?" without having to infer ownership from only
the raw global counts.

Renderer-owned semantic container groups now also mark themselves through
`userData.renderSceneSemanticGroup`, so visible-tile shells and persistent sky /
world layer roots do not inflate the plain-wrapper bucket when they temporarily
hold only one child.
