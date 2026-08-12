import type { Kind } from '@bworlds/plugin-api';

type TerrainPreviewReadoutModule =
  typeof import('./terrain-preview-readout.ts');

export type TerrainSextantReadout = {
  terrainHeight: number | null;
  terrainPreviewReadout: ReturnType<
    TerrainPreviewReadoutModule['resolveTerrainPreviewReadout']
  > | null;
};

export function resolveTerrainSextantReadout(params: {
  module: TerrainPreviewReadoutModule | null;
  seed: string;
  x: number;
  y: number;
  kind: Kind;
  fallbackHeight: number | null;
}): TerrainSextantReadout {
  if (!params.module) {
    return {
      terrainHeight: params.fallbackHeight,
      terrainPreviewReadout: null,
    };
  }

  return {
    terrainHeight: params.module.resolveTerrainPreviewHeight({
      seed: params.seed,
      x: params.x,
      y: params.y,
    }),
    terrainPreviewReadout: params.module.resolveTerrainPreviewReadout({
      seed: params.seed,
      x: params.x,
      y: params.y,
      kind: params.kind,
    }),
  };
}
