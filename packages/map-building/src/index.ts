import {
  createContextMapPlugin,
  createDecoratedMapTileGetter,
  createReturnMapAction,
} from '@bworlds/map-support';
import {
  getTownBuildingLabel,
  getTownBuildingServiceState,
} from '@bworlds/town-support';
import type { QuestOffer } from '@bworlds/quest-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  Seed,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };

type BuildingTile = TileLike;

type BuildingContext = WorldContextLike & {
  origin: Point;
  townBuildingId?: string;
  townBuildingRole?: 'residential' | 'professional';
  professionFamily?: string;
};

export function createBuildingMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<BuildingContext>({
    name: 'map-building',
    contextType: 'building',
    createMap: createBuildingMap,
  });
}

function createBuildingMap(
  context: BuildingContext,
  seed: Seed,
  plugins: CreateMapContext['plugins']
): WorldMapLike {
  const getTile = createDecoratedMapTileGetter<BuildingTile, BuildingContext>({
    context,
    seed,
    resolveTile(x: number, y: number, state) {
      let tile: BuildingTile = { kind: 'wall' };
      if (Math.abs(x) <= 3 && Math.abs(y) <= 3) {
        tile = { kind: 'floor' };
      }
      if (y === 3 && x === 0) {
        tile = { kind: 'door', note: 'Press X to leave.' };
      }
      if (y === -2 && Math.abs(x) <= 1) {
        tile = resolveBuildingCounterTile(context, state);
      }
      return tile;
    },
    decorateTile(payload) {
      return plugins.decorateBuildingTile(payload);
    },
  });

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === 3) {
      return createReturnMapAction();
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

function resolveBuildingCounterTile(
  context: BuildingContext,
  state?: {
    timeMs?: number;
    playerLevel?: number;
    playerProfession?: string;
    completedQuestIds?: string[];
  }
): BuildingTile {
  if (!context.townBuildingId || !context.origin) {
    return { kind: 'shop', note: 'A service counter waits inside the building.' };
  }

  const buildingRole = context.townBuildingRole ?? 'professional';
  const buildingLabel = getTownBuildingLabel(
    context.professionFamily as Parameters<typeof getTownBuildingLabel>[0],
    buildingRole
  );
  const serviceState = getTownBuildingServiceState(
    context.origin.x,
    context.origin.y,
    context.townBuildingId,
    state?.timeMs ?? 0,
    {
      level: state?.playerLevel,
      profession: state?.playerProfession,
      completedQuestIds: state?.completedQuestIds,
    }
  );

  if (buildingRole !== 'professional') {
    return {
      kind: 'shop',
      note:
        serviceState.presentNpcNames.length > 0
          ? `${serviceState.presentNpcNames.join(', ')} are home right now.${
              serviceState.availableQuestOffers.length > 0
                ? ` Quest offers: ${serviceState.availableQuestOffers
                    .map((offer) => offer.title)
                    .join(', ')}.`
                : ''
            }`
          : 'The house is quiet right now.',
      questOffers: serviceState.availableQuestOffers,
    };
  }

  if (serviceState.presentNpcNames.length === 0) {
    return {
      kind: 'shop',
      note: `The ${buildingLabel} is unattended right now. Come back during business hours.`,
    };
  }

  const serviceLabels = serviceState.availableServices.map((service) => service.label);
  return {
    kind: 'shop',
    note: `${serviceState.presentNpcNames.join(', ')} can help here with ${serviceLabels.join(', ')}.${
      serviceState.availableQuestOffers.length > 0
        ? ` Quest offers: ${serviceState.availableQuestOffers
            .map((offer) => offer.title)
            .join(', ')}.`
        : ''
    }`,
    services: serviceState.availableServices,
    npcs: serviceState.presentNpcNames,
    questOffers: serviceState.availableQuestOffers,
  };
}
