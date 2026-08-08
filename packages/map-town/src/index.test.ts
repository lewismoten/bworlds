import { describe, expect, it } from 'vitest';
import type { CreateMapContext } from '@bworlds/plugin-api';
import {
  createTownMapPlugin,
  isTownBuildingPlot,
  isTownConnectorRoad,
  isTownFrontageRoad,
  isTownMainRoad,
  resolveTownTile,
} from './index.ts';

function createTownMap() {
  const plugin = createTownMapPlugin();
  const map = plugin.createMap?.({
    context: {
      id: 'town:test',
      label: 'Town',
      type: 'town',
      depth: 1,
      origin: { x: 10, y: -4 },
    },
    seed: 'spec',
    plugins: {
      decorateTownTile({ tile }) {
        return tile;
      },
    } as CreateMapContext['plugins'],
  });

  if (!map) {
    throw new Error('Expected town map plugin to create a town map.');
  }

  return map;
}

describe('map town', () => {
  it('lays out frontage roads directly past every building plot', () => {
    const map = createTownMap();
    const buildingTiles: Array<{ x: number; y: number }> = [];

    for (let y = -12; y <= 12; y += 1) {
      for (let x = -12; x <= 12; x += 1) {
        if (map.getTile(x, y).building) {
          buildingTiles.push({ x, y });
        }
      }
    }

    expect(buildingTiles.length).toBeGreaterThan(0);
    expect(
      buildingTiles.every(({ x, y }) => {
        const frontageY = y > 0 ? y - 1 : y + 1;
        return map.getTile(x, frontageY).kind === 'road';
      })
    ).toBe(true);
  });

  it('connects frontage roads back to the central crossroad with side streets', () => {
    const map = createTownMap();

    expect(map.getTile(-8, -3).kind).toBe('road');
    expect(map.getTile(-8, -2).kind).toBe('road');
    expect(map.getTile(-8, -1).kind).toBe('road');
    expect(map.getTile(-8, 0).kind).toBe('road');
    expect(map.getTile(4, 3).kind).toBe('road');
    expect(map.getTile(4, 2).kind).toBe('road');
    expect(map.getTile(4, 1).kind).toBe('road');
    expect(map.getTile(4, 0).kind).toBe('road');
  });

  it('resolves town tile roles through shared layout helpers', () => {
    expect(isTownBuildingPlot(0, 4)).toBe(true);
    expect(isTownFrontageRoad(0, 3)).toBe(true);
    expect(isTownConnectorRoad(4, 2)).toBe(true);
    expect(isTownMainRoad(0, 1)).toBe(true);
    expect(
      resolveTownTile({
        contextId: 'town:test',
        x: 0,
        y: 4,
        localX: 12,
        localY: 16,
        centerX: 12,
        centerY: 12,
      })
    ).toMatchObject({
      kind: 'shop',
      building: { id: 'town:test:0:4' },
    });
  });
});
