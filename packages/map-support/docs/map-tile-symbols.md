`@bworlds/map-support` now exposes one small shared 2D tile-symbol contract for
2D and 3D parity:

- `getMapTileSymbolGlyph(...)`
- `getMapTileReliefStrength(...)`
- `resolveMapTileSymbolDescriptor(...)`

## Purpose

`render2d` already reads shared decorated tile state such as:

- `kind`
- `surfaceHeight`
- `train`
- `boat`

The tile-symbol helpers keep that interpretation in one shared place so 2D text
or mini-map style products can reflect the same visible tile state that 3D
systems already expose, instead of hard-coding their own separate symbol rules.

## Symbol Descriptors

`resolveMapTileSymbolDescriptor(...)` returns:

- `glyph`
- `color`
- optional `annotation`
- `reliefStrength`

The descriptor intentionally stays small so callers can reuse it across text
viewports, debug panels, or future map overlays without coupling it to one
specific renderer.

## Representative State

The current shared descriptor keeps 2D symbols aware of several 3D-visible
states:

- active rail traffic yields `TRN`
- active dock or watercraft traffic yields `BOT`
- visible non-water relief yields `RLF`

That gives 2D map products one shared path for staying representative of
surface relief and active vehicle traffic instead of relying on renderer-local
symbol heuristics.
