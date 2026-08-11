# Tile LOD Recovery

The visible-tile LOD recovery path in `packages/render3d/src/index.ts` is optimized to avoid replacing a working model with a fallback shell during upgrades.

## Visible Tile Recovery Chain

When `syncTileModelDetailLevels` decides a visible tile should rebuild, it uses `buildRecoverableVisibleTileModelDetailEntry` instead of swapping directly to the requested detail.

The recovery chain is:

1. If the renderer requested `full` detail and the tile last succeeded at `low`, try that cached `low` detail first.
2. Try the requested detail level.
3. If the requested `full` build still fails and no cached `low` recovery has already been tried, try `low`.
4. Only keep a fallback-only entry when every recovery attempt has failed.

`shouldReplaceVisibleTileModelDetailEntry` then prevents a fallback-only rebuild from replacing an existing visible model that still has a real `modelRoot`.

## Cached Successful Detail

`lastSuccessfulVisibleTileDetailLevels` records the last visible detail level that produced a real model for each tile key.

That cache is used in two places:

- Visible rebuilds can recover through the last successful `low` detail before retrying expensive `full` detail.
- Pending visible builds can prefer a known-good `low` detail while the queue is still catching up.

The cache is only updated when a replacement entry has a real `modelRoot`, so fallback shells do not overwrite the last known-good detail.

## Failure Reasons and Metrics

Visible recovery attempts keep per-attempt `fallbackReason` data so the debug event stream can summarize the full chain that failed.

The renderer also tracks:

- `lowerLodRecoveriesPerSecond`: successful cases where a requested `full` visible tile resolved to `low`.
- `fallbackBoxesPerSecond`: fallback-box appearances recorded by the renderer debug event stream.

These counters are surfaced through the web debug snapshot, debug panel, and exported debug snapshot payload so LOD regressions can be spotted without inspecting logs.

The web debug surfaces also expose the latest visible-tile recovery failure summary and the latest fallback-box reason directly from the renderer's recent debug events.

They also surface recent per-plugin summaries for visible-tile LOD swaps and fallback-box usage, which makes it easier to identify which plugin is causing churn without inspecting the full event log.

For the player's current snapped tile, the web debug panel also exposes the requested visible LOD, the currently rendered LOD, the last cached successful LOD, whether a real model is currently visible, and the current tile fallback reason when one exists.

The debug panel also includes a `Freeze LOD` toggle that stops new visible-tile LOD resync passes while it is active. That makes it easier to inspect a problematic tile without movement immediately retriggering another selection pass.

The text viewport also shows the current rendered visible-tile LOD directly above each tile glyph when the renderer has visible-tile state for that coordinate. It uses compact `F` and `L` labels so LOD churn is visible without opening the debug summary.

## Checklist Coverage

The current implementation already covers these `docs/todo/tile-lod.md` items:

- Prefer the last valid cached LOD before using a fallback box.
- Walk down the LOD chain until a valid model is found.
- Use a box only when no cached or lower LOD can render.
- Keep the old model visible while a new LOD is being built.
- Swap LODs only after the replacement model is ready.
- Cache the last successful LOD for each visible tile.
- Track why each requested LOD failed to build.
- Prefer cached LODs over new high-detail generation.
- Reserve fallback boxes for hard generation failures.
- Log every fallback box with its tile and failure reason.

The existing renderer tests in `packages/render3d/src/index.test.ts` also cover the currently checked fallback-path test items from that checklist.
