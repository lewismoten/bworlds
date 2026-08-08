import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS } from '@bworlds/core';
import type { CreateMapContext } from '@bworlds/plugin-api';
import { getTownBuildings } from '@bworlds/town-support';
import { createBuildingMapPlugin } from './index.ts';

const TOWN_ORIGIN = { x: 10, y: -4 };

function createBuildingMap() {
  const building = getTownBuildings(TOWN_ORIGIN.x, TOWN_ORIGIN.y).find(
    (entry) => entry.role === 'professional'
  );

  if (!building) {
    throw new Error('Expected a professional building in the deterministic town layout.');
  }

  const plugin = createBuildingMapPlugin();
  const map = plugin.createMap?.({
    context: {
      id: `${building.id}:building`,
      label: 'Building Interior',
      type: 'building',
      depth: 2,
      origin: TOWN_ORIGIN,
      townBuildingId: building.id,
      townBuildingRole: building.role,
      professionFamily: building.professionFamily,
    },
    seed: 'spec',
    plugins: {
      decorateBuildingTile({ tile }) {
        return tile;
      },
    } as CreateMapContext['plugins'],
  });

  if (!map) {
    throw new Error('Expected building map plugin to create a building map.');
  }

  return { map, building };
}

describe('map building', () => {
  it('shows available professional services while staff are on duty', () => {
    const { map } = createBuildingMap();
    const counter = map.getTile(0, -2, {
      timeMs: DEFAULT_DAY_LENGTH_MS * 0.5,
    } as never) as {
      kind: string;
      note?: string;
      services?: Array<{ label: string }>;
      npcs?: string[];
    };

    expect(counter.kind).toBe('shop');
    expect(counter.services?.length ?? 0).toBeGreaterThan(0);
    expect(counter.npcs?.length ?? 0).toBeGreaterThan(0);
    expect(counter.note).toContain('can help here with');
  });

  it('marks professional counters as unattended after hours', () => {
    const { map } = createBuildingMap();
    const counter = map.getTile(0, -2, { timeMs: 0 } as never);

    expect(counter.kind).toBe('shop');
    expect(counter.note).toContain('unattended');
    expect(counter.note).toContain('Come back during business hours');
  });
});
