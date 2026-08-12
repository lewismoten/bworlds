# World Generation Plugin Architecture

## Plugin Contract

- [ ] Define one world generation layer plugin interface.
- [ ] Give every plugin a stable ID and execution order.
- [ ] Give every plugin declared input dependencies.
- [ ] Give every plugin declared output records.
- [ ] Keep plugins deterministic from explicit inputs.
- [ ] Keep renderer and UI code out of generation plugins.
- [ ] Keep gameplay callbacks out of frozen world records.

## Layer Order

- [ ] Run continent uplift first.
- [ ] Run continental structure second.
- [ ] Run young mountains, old mountains, and hills next.
- [ ] Run volcanoes and volcanic island refinement next.
- [ ] Run canyon, trench, and crater generation next.
- [ ] Run lakes, large rivers, and tributaries next.
- [ ] Run climate and biome generation next.
- [ ] Run vegetation region generation next.
- [ ] Run settlement placement next.
- [ ] Run crossings, bridges, tunnels, roads, and rail next.
- [ ] Run borders after settlements and routes stabilize.
- [ ] Run naming after canonical feature IDs exist.

## Regional Queries

- [ ] Query generated features by world bounds.
- [ ] Query generated features by chunk bounds.
- [ ] Query features by type and plugin owner.
- [ ] Query features by zoom relevance.
- [ ] Return coarse summaries without fine detail.
- [ ] Cache regional summaries by world revision.

## Debugging

- [ ] Show which plugin created a selected feature.
- [ ] Show which plugin changed a selected height sample.
- [ ] Show plugin execution timings by region.
- [ ] Toggle selected generation layers in debug views.
