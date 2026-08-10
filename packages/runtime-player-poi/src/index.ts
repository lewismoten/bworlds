import { generatePoiName, snapWorldCoordinate } from '@bworlds/core';
import { resolveHashSeedInput } from '@bworlds/core/hash';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  Kind,
  PointOfInterestType,
  ResolveOverworldAnchorsContext,
  ResolveOverworldTileContext,
  RuntimePlugin,
  Seed,
  WorldStateLike,
} from '@bworlds/plugin-api';

export type PlayerPlacedPoiLike = {
  x: number;
  y: number;
  kind: Kind;
  poi: {
    type: PointOfInterestType;
    name: string;
  };
  note: string;
};

type PlayerPoiStateLike = WorldStateLike & {
  playerPlacedPois?: PlayerPlacedPoiLike[];
  overworldTileRevision?: number;
};

const BUILDABLE_POI_KINDS = new Set<Kind>([
  'town',
  'cave',
  'dungeon',
  'quarry',
  'lighthouse',
  'ship',
  'observatory',
]);

export function createPlayerPoiRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-player-poi', {
    resolveOverworldTile({ x, y, state }: ResolveOverworldTileContext) {
      return getPlayerPlacedPoi(state, x, y);
    },
    resolveOverworldAnchors({ state }: ResolveOverworldAnchorsContext) {
      const pois = listPlayerPlacedPois(state);
      if (pois.length === 0) {
        return null;
      }
      return {
        poiAnchors: pois.map((poi) => ({
          x: poi.x,
          y: poi.y,
          type: poi.poi.type,
          name: poi.poi.name,
        })),
      };
    },
  });
}

export function listPlayerPlacedPois(
  state?: WorldStateLike | null
): PlayerPlacedPoiLike[] {
  const pois = (state as PlayerPoiStateLike | null | undefined)
    ?.playerPlacedPois;
  return Array.isArray(pois) ? pois : [];
}

export function getPlayerPlacedPoi(
  state: WorldStateLike | null | undefined,
  x: number,
  y: number
): PlayerPlacedPoiLike | null {
  return (
    listPlayerPlacedPois(state).find((poi) => poi.x === x && poi.y === y) ??
    null
  );
}

export function setPlayerPlacedPois(
  state: WorldStateLike,
  pois: PlayerPlacedPoiLike[]
): void {
  const nextState = state as PlayerPoiStateLike;
  nextState.playerPlacedPois = [...pois];
  nextState.overworldTileRevision = (nextState.overworldTileRevision ?? 0) + 1;
}

export function canBuildPlayerPoi(
  state: WorldStateLike,
  kind: Kind,
  x = state.player.x,
  y = state.player.y
): boolean {
  if (state.getCurrentContext().type !== 'overworld') {
    return false;
  }
  if (!BUILDABLE_POI_KINDS.has(kind)) {
    return false;
  }

  const tileX = snapWorldCoordinate(x);
  const tileY = snapWorldCoordinate(y);
  if (getPlayerPlacedPoi(state, tileX, tileY)) {
    return false;
  }
  const currentTile = state.getCurrentTile(tileX, tileY);
  if (currentTile.poi) {
    return false;
  }
  return state.getTileDefinition(currentTile.kind).walkable;
}

export function buildPlayerPoi(
  state: WorldStateLike,
  seed: Seed,
  kind: Kind,
  x = state.player.x,
  y = state.player.y
): PlayerPlacedPoiLike | null {
  if (!canBuildPlayerPoi(state, kind, x, y)) {
    return null;
  }
  const tileX = snapWorldCoordinate(x);
  const tileY = snapWorldCoordinate(y);
  const poiType = kind as PointOfInterestType;
  const poi: PlayerPlacedPoiLike = {
    x: tileX,
    y: tileY,
    kind,
    poi: {
      type: poiType,
      name: generatePoiName(resolveHashSeedInput(seed), poiType, tileX, tileY),
    },
    note: getPlayerPoiBuildNote(kind),
  };
  setPlayerPlacedPois(state, [...listPlayerPlacedPois(state), poi]);
  return poi;
}

export function getPlayerPoiBuildNote(kind: Kind): string {
  if (kind === 'town') return 'A newly founded settlement takes shape here.';
  if (kind === 'cave') return 'A fresh cave entrance has been opened here.';
  if (kind === 'dungeon')
    return 'A newly raised dungeon gate waits to be explored.';
  if (kind === 'quarry') return 'Fresh-cut stone marks a newly started quarry.';
  if (kind === 'lighthouse')
    return 'A newly built lighthouse now watches the horizon.';
  if (kind === 'ship') return 'A newly moored ship creaks at its berth.';
  if (kind === 'observatory') {
    return 'A newly raised observatory opens its dome to the sky above.';
  }
  return 'A newly built point of interest stands here.';
}

export function parsePlayerPlacedPois(
  value: unknown
): PlayerPlacedPoiLike[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const pois: PlayerPlacedPoiLike[] = [];
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof (entry as { x?: unknown }).x !== 'number' ||
      typeof (entry as { y?: unknown }).y !== 'number' ||
      typeof (entry as { kind?: unknown }).kind !== 'string' ||
      typeof (entry as { note?: unknown }).note !== 'string' ||
      typeof (entry as { poi?: { type?: unknown; name?: unknown } }).poi
        ?.type !== 'string' ||
      typeof (entry as { poi?: { type?: unknown; name?: unknown } }).poi
        ?.name !== 'string'
    ) {
      return null;
    }
    pois.push(entry as PlayerPlacedPoiLike);
  }

  return pois;
}
