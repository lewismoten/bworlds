import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
  TerrainSplatSample,
} from './index.ts';
import type { PackedTerrainSplatSampleGrid } from './sample-grid.ts';

export type TerrainTwoLayerVertexBlend = {
  primaryLayerId: TerrainMaterialLayerId | null;
  secondaryLayerId: TerrainMaterialLayerId | null;
  primaryWeight: number;
  secondaryWeight: number;
  blendFactor: number;
};

export type TerrainTwoLayerVertexBlendGrid = {
  width: number;
  height: number;
  step: number;
  blends: readonly TerrainTwoLayerVertexBlend[];
};

export function resolveTerrainTwoLayerVertexBlend(
  sample: TerrainSplatSample
): TerrainTwoLayerVertexBlend {
  const sorted = [...sample.entries].sort((left, right) =>
    right.weight === left.weight
      ? left.layerId.localeCompare(right.layerId)
      : right.weight - left.weight
  );
  const primary = sorted[0];
  const secondary = sorted[1];
  const totalWeight = (primary?.weight ?? 0) + (secondary?.weight ?? 0);

  if (!primary || totalWeight <= 0) {
    return {
      primaryLayerId: null,
      secondaryLayerId: null,
      primaryWeight: 0,
      secondaryWeight: 0,
      blendFactor: 0,
    };
  }

  const normalizedPrimaryWeight =
    secondary && totalWeight > 0 ? primary.weight / totalWeight : 1;
  const normalizedSecondaryWeight =
    secondary && totalWeight > 0 ? secondary.weight / totalWeight : 0;

  return {
    primaryLayerId: primary.layerId,
    secondaryLayerId: secondary?.layerId ?? null,
    primaryWeight: normalizedPrimaryWeight,
    secondaryWeight: normalizedSecondaryWeight,
    blendFactor: normalizedSecondaryWeight,
  };
}

export function createTerrainTwoLayerVertexBlendGrid(
  grid: PackedTerrainSplatSampleGrid,
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<number, TerrainMaterialLayerCatalogEntry>
): TerrainTwoLayerVertexBlendGrid {
  let catalogByIndex: ReadonlyMap<number, TerrainMaterialLayerCatalogEntry>;
  if (Array.isArray(catalog)) {
    catalogByIndex = new Map(
      catalog.map((entry) => [entry.index, entry] as const)
    );
  } else {
    catalogByIndex = catalog as ReadonlyMap<
      number,
      TerrainMaterialLayerCatalogEntry
    >;
  }
  const sampleCount = grid.width * grid.height;
  const blends: TerrainTwoLayerVertexBlend[] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    blends.push(
      resolveTerrainTwoLayerVertexBlend(
        unpackTerrainTwoLayerBlendSample(grid, catalogByIndex, sampleIndex)
      )
    );
  }

  return {
    width: grid.width,
    height: grid.height,
    step: grid.step,
    blends,
  };
}

function unpackTerrainTwoLayerBlendSample(
  grid: PackedTerrainSplatSampleGrid,
  catalogByIndex: ReadonlyMap<number, TerrainMaterialLayerCatalogEntry>,
  sampleIndex: number
): TerrainSplatSample {
  const offset = sampleIndex * 4;
  const entries: Array<{
    layerId: TerrainMaterialLayerId;
    weight: number;
  }> = [];

  for (let index = 0; index < 4; index += 1) {
    const layerIndex = grid.layerIndices[offset + index];
    const packedWeight = grid.weights[offset + index];
    if (
      layerIndex === undefined ||
      packedWeight === undefined ||
      packedWeight <= 0
    ) {
      continue;
    }
    const layer = catalogByIndex.get(layerIndex);
    if (!layer) {
      continue;
    }
    entries.push({
      layerId: layer.id,
      weight: packedWeight / 255,
    });
  }

  return { entries };
}
