## Music Debug Cadence Hover

The music debug timeline now gives cadence markers the same tooltip path that
note bars already use.

The hover resolver checks the compact hit boxes around `Q` and `A` cadence
labels before scanning note bars, so the page can surface:

- section and measure details for cadence checkpoints
- phrase identity for each cadence marker
- cadence failure summaries when a marker also carries a warning badge
