import type {
  TerrainTextureArrayPlan,
  TerrainTextureArrayPlanSetWarning,
  TerrainTextureBindingPlanSet,
  TerrainTextureFallbackPlan,
} from './texture-array-plan.ts';

export type TerrainTextureRuntimeBindingDescriptor = {
  purpose: string;
  bindingKey: string;
  mode: 'texture-array' | 'per-layer-textures';
  textureIds: readonly string[];
  width: number;
  height: number;
  format: string;
  bytesPerPixel: number;
  depth: number;
  estimatedBytes: number;
};

export type TerrainTextureBindingRuntimePlan = {
  sharedBindingKey: string;
  mode: 'texture-array' | 'per-layer-textures';
  activeLayerIds: readonly string[];
  bindings: readonly TerrainTextureRuntimeBindingDescriptor[];
  estimatedBytes: number;
  warnings: readonly TerrainTextureArrayPlanSetWarning[];
};

export type TerrainTextureBindingReuseSummary = {
  chunkCount: number;
  uniqueBindingCount: number;
  reusedChunkCount: number;
  bindingReuseCount: number;
  sharedBindingKeys: readonly string[];
  warnings: readonly TerrainTextureArrayPlanSetWarning[];
};

export function createTerrainTextureBindingRuntimePlan(
  planSet: TerrainTextureBindingPlanSet
): TerrainTextureBindingRuntimePlan {
  const bindings = planSet.plans.map((plan) =>
    'layerSlots' in plan
      ? createTextureArrayRuntimeBinding(planSet.mode, plan)
      : createFallbackRuntimeBinding(planSet.mode, plan)
  );
  const sharedBindingKey = [
    `mode:${planSet.mode}`,
    `layers:${planSet.layerSlots
      .map((slot) => `${slot.layerIndex}:${slot.layerId}`)
      .join(',')}`,
    `bindings:${bindings.map((binding) => binding.bindingKey).join('|')}`,
  ].join('|');

  return {
    sharedBindingKey,
    mode: planSet.mode,
    activeLayerIds: [...planSet.activeLayerIds],
    bindings,
    estimatedBytes: planSet.estimatedBytes,
    warnings: planSet.warnings.map((warning) => ({ ...warning })),
  };
}

export function summarizeTerrainTextureBindingReuse(
  entries: readonly {
    chunkId: string;
    plan: TerrainTextureBindingRuntimePlan;
  }[]
): TerrainTextureBindingReuseSummary {
  const sharedBindingKeys = new Map<string, string[]>();
  const warnings = new Map<string, TerrainTextureArrayPlanSetWarning>();

  for (const entry of entries) {
    const chunkIds = sharedBindingKeys.get(entry.plan.sharedBindingKey) ?? [];
    chunkIds.push(entry.chunkId);
    sharedBindingKeys.set(entry.plan.sharedBindingKey, chunkIds);
    for (const warning of entry.plan.warnings) {
      warnings.set(`${warning.code}:${warning.message}`, warning);
    }
  }

  const keys = [...sharedBindingKeys.keys()].sort();
  const uniqueBindingCount = keys.length;
  const chunkCount = entries.length;

  return {
    chunkCount,
    uniqueBindingCount,
    reusedChunkCount: Math.max(0, chunkCount - uniqueBindingCount),
    bindingReuseCount: Math.max(0, chunkCount - uniqueBindingCount),
    sharedBindingKeys: keys,
    warnings: [...warnings.values()],
  };
}

function createTextureArrayRuntimeBinding(
  mode: 'texture-array' | 'per-layer-textures',
  plan: TerrainTextureArrayPlan
): TerrainTextureRuntimeBindingDescriptor {
  const textureIds = plan.layerSlots.map((slot) => slot.textureId);
  return {
    purpose: plan.purpose,
    bindingKey: [
      `purpose:${plan.purpose}`,
      `size:${plan.width}x${plan.height}x${plan.depth}`,
      `format:${plan.format}:${plan.bytesPerPixel}`,
      `textures:${textureIds.join(',')}`,
    ].join('|'),
    mode,
    textureIds,
    width: plan.width,
    height: plan.height,
    format: plan.format,
    bytesPerPixel: plan.bytesPerPixel,
    depth: plan.depth,
    estimatedBytes: plan.estimatedBytes,
  };
}

function createFallbackRuntimeBinding(
  mode: 'texture-array' | 'per-layer-textures',
  plan: TerrainTextureFallbackPlan
): TerrainTextureRuntimeBindingDescriptor {
  const first = plan.layerBindings[0];
  return {
    purpose: plan.purpose,
    bindingKey: [
      `purpose:${plan.purpose}`,
      `textures:${plan.layerBindings
        .map(
          (binding) =>
            `${binding.layerIndex}:${binding.textureId}:${binding.width}x${binding.height}:${binding.format}:${binding.bytesPerPixel}`
        )
        .join(',')}`,
    ].join('|'),
    mode,
    textureIds: plan.layerBindings.map((binding) => binding.textureId),
    width: first?.width ?? 0,
    height: first?.height ?? 0,
    format: first?.format ?? '',
    bytesPerPixel: first?.bytesPerPixel ?? 0,
    depth: plan.layerBindings.length,
    estimatedBytes: plan.estimatedBytes,
  };
}
