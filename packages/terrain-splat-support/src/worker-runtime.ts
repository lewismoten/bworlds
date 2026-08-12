import type { Kind } from '@bworlds/plugin-api';
import type {
  TerrainKindSplatCatalogEntry,
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import {
  buildTerrainSplatWorkerResult,
  listTerrainSplatWorkerResultTransferables,
  type TerrainSplatWorkerBuildRequest,
  type TerrainSplatWorkerBuildResult,
} from './worker-contract.ts';

export const TERRAIN_SPLAT_WORKER_BUILD_REQUEST_MESSAGE_TYPE =
  'terrain-splat-build-request';
export const TERRAIN_SPLAT_WORKER_BUILD_RESULT_MESSAGE_TYPE =
  'terrain-splat-build-result';
export const TERRAIN_SPLAT_WORKER_BUILD_ERROR_MESSAGE_TYPE =
  'terrain-splat-build-error';

export type TerrainSplatWorkerBuildRequestMessage = {
  type: typeof TERRAIN_SPLAT_WORKER_BUILD_REQUEST_MESSAGE_TYPE;
  jobId: string;
  request: TerrainSplatWorkerBuildRequest;
  kindCatalogEntries: readonly TerrainKindSplatCatalogEntry[];
  layerCatalogEntries: readonly TerrainMaterialLayerCatalogEntry[];
};

export type TerrainSplatWorkerBuildResultMessage = {
  type: typeof TERRAIN_SPLAT_WORKER_BUILD_RESULT_MESSAGE_TYPE;
  jobId: string;
  result: TerrainSplatWorkerBuildResult;
};

export type TerrainSplatWorkerBuildErrorMessage = {
  type: typeof TERRAIN_SPLAT_WORKER_BUILD_ERROR_MESSAGE_TYPE;
  jobId: string;
  error: string;
};

export type TerrainSplatWorkerMessage =
  | TerrainSplatWorkerBuildRequestMessage
  | TerrainSplatWorkerBuildResultMessage
  | TerrainSplatWorkerBuildErrorMessage;

export type TerrainSplatWorkerTransferable = Transferable;

export type TerrainSplatWorkerEvent = {
  data: TerrainSplatWorkerMessage;
};

export type TerrainSplatWorkerErrorEvent = {
  error?: unknown;
  message?: string;
};

export type TerrainSplatWorkerLike = {
  postMessage(
    message: TerrainSplatWorkerMessage,
    transfer?: readonly TerrainSplatWorkerTransferable[]
  ): void;
  addEventListener(
    type: 'message',
    listener: (event: TerrainSplatWorkerEvent) => void
  ): void;
  addEventListener(
    type: 'error',
    listener: (event: TerrainSplatWorkerErrorEvent) => void
  ): void;
  removeEventListener(
    type: 'message',
    listener: (event: TerrainSplatWorkerEvent) => void
  ): void;
  removeEventListener(
    type: 'error',
    listener: (event: TerrainSplatWorkerErrorEvent) => void
  ): void;
};

let terrainSplatWorkerJobSequence = 0;

export function createTerrainSplatWorkerBuildRequestMessage(params: {
  request: TerrainSplatWorkerBuildRequest;
  kindCatalog:
    | ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>
    | {
        byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
      };
  layerCatalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
  jobId?: string;
}): TerrainSplatWorkerBuildRequestMessage {
  return {
    type: TERRAIN_SPLAT_WORKER_BUILD_REQUEST_MESSAGE_TYPE,
    jobId: params.jobId ?? createTerrainSplatWorkerJobId(),
    request: params.request,
    kindCatalogEntries: [...resolveKindCatalog(params.kindCatalog).values()],
    layerCatalogEntries: [...resolveLayerCatalog(params.layerCatalog).values()],
  };
}

export function buildTerrainSplatWorkerResponseMessage(
  message: TerrainSplatWorkerBuildRequestMessage
): TerrainSplatWorkerBuildResultMessage | TerrainSplatWorkerBuildErrorMessage {
  try {
    const result = buildTerrainSplatWorkerResult(
      message.request,
      new Map(
        message.kindCatalogEntries.map((entry) => [entry.kind, entry] as const)
      ),
      new Map(
        message.layerCatalogEntries.map((entry) => [entry.id, entry] as const)
      )
    );
    return {
      type: TERRAIN_SPLAT_WORKER_BUILD_RESULT_MESSAGE_TYPE,
      jobId: message.jobId,
      result,
    };
  } catch (error) {
    return {
      type: TERRAIN_SPLAT_WORKER_BUILD_ERROR_MESSAGE_TYPE,
      jobId: message.jobId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function listTerrainSplatWorkerMessageTransferables(
  message: TerrainSplatWorkerMessage
): readonly TerrainSplatWorkerTransferable[] {
  if (message.type === TERRAIN_SPLAT_WORKER_BUILD_RESULT_MESSAGE_TYPE) {
    return listTerrainSplatWorkerResultTransferables(message.result);
  }
  return [];
}

export function runTerrainSplatWorkerBuild(params: {
  worker: TerrainSplatWorkerLike;
  message: TerrainSplatWorkerBuildRequestMessage;
}): Promise<TerrainSplatWorkerBuildResult> {
  return new Promise((resolve, reject) => {
    const handleMessage = (event: TerrainSplatWorkerEvent) => {
      const next = event.data;
      if (next.jobId !== params.message.jobId) {
        return;
      }
      cleanup();
      if (next.type === TERRAIN_SPLAT_WORKER_BUILD_RESULT_MESSAGE_TYPE) {
        resolve(next.result);
        return;
      }
      if (next.type === TERRAIN_SPLAT_WORKER_BUILD_ERROR_MESSAGE_TYPE) {
        reject(new Error(next.error));
      }
    };
    const handleError = (event: TerrainSplatWorkerErrorEvent) => {
      cleanup();
      reject(
        event.error instanceof Error
          ? event.error
          : new Error(event.message ?? 'Terrain splat worker failed.')
      );
    };
    const cleanup = () => {
      params.worker.removeEventListener('message', handleMessage);
      params.worker.removeEventListener('error', handleError);
    };

    params.worker.addEventListener('message', handleMessage);
    params.worker.addEventListener('error', handleError);
    params.worker.postMessage(params.message);
  });
}

function createTerrainSplatWorkerJobId(): string {
  terrainSplatWorkerJobSequence += 1;
  return `terrain-splat-job-${terrainSplatWorkerJobSequence}`;
}

function resolveKindCatalog(
  kindCatalog:
    | ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>
    | {
        byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
      }
): ReadonlyMap<Kind, TerrainKindSplatCatalogEntry> {
  return 'byKind' in kindCatalog ? kindCatalog.byKind : kindCatalog;
}

function resolveLayerCatalog(
  layerCatalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      }
): ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry> {
  return 'byId' in layerCatalog ? layerCatalog.byId : layerCatalog;
}
