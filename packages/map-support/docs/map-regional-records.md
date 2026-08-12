`@bworlds/map-support` now exposes one small shared regional-record bridge for
2D and 3D parity:

- `createSettlementMapFeatureRecord(...)`
- `createBorderMapFeatureRecord(...)`
- `createSettlementAnchorMapFeatureGeneratorPlugin(...)`
- `createBorderRecordMapFeatureGeneratorPlugin(...)`
- `createSettlementRecordSampleFromAnchor(...)`

## Purpose

Settlement-like locations already come through the shared overworld anchor
resolver path, and border generation is already intended to live in shared
world-generation records rather than renderer-specific state.

The regional-record bridge lets later 2D map export reuse those shared records
by converting them into canonical point and line features instead of inventing
separate 2D-only settlement or border models.

## Settlement Records

`createSettlementMapFeatureRecord(...)` turns one shared settlement sample into
one canonical point feature in the conventional `settlement-record` layer.

`createSettlementRecordSampleFromAnchor(...)` gives callers one adapter from
shared overworld anchors to that settlement record shape.

That keeps:

- settlement positions anchored to the shared world-space anchor path
- settlement ids stable from authoritative source object ids
- optional settlement metadata such as `name` or `settlementType` on canonical
  map features instead of UI-only state

## Border Records

`createBorderMapFeatureRecord(...)` turns one shared border sample into one
canonical line feature in the conventional `border-record` layer.

The resulting feature properties can carry:

- `borderType`
- `parentRegionId`

That gives later map export or styling code one shared border vocabulary
without coupling it to a specific region-generation implementation.

## Settlement And Border Generators

`createSettlementAnchorMapFeatureGeneratorPlugin(...)` wraps
`getSettlementRecords(request)` and normalizes the generator as:

- `layerId: 'settlement-record'`
- default `id: 'settlement-record-map-layer'`
- default `label: 'Settlement Record Layer'`

`createBorderRecordMapFeatureGeneratorPlugin(...)` wraps
`getBorderRecords(request)` and normalizes the generator as:

- `layerId: 'border-record'`
- default `id: 'border-record-map-layer'`
- default `label: 'Border Record Layer'`

This gives later PMTiles export or map rendering code one shared bridge from
authoritative settlement anchors and border records to canonical map features,
which is necessary for keeping 2D settlement and border products derived from
the same records that other world-generation systems already use.
