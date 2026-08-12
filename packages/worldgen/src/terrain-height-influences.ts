import type {
  PluginOrder,
  Seed,
  WorldGenerationBounds,
} from '@bworlds/plugin-api';

export type WorldTerrainHeightInfluenceResolution = 'coarse' | 'fine';

export type WorldTerrainHeightInfluenceSamplingDeclaration = {
  resolutions?: readonly WorldTerrainHeightInfluenceResolution[];
  bounds?: WorldGenerationBounds | null;
  sampleStep?: number;
};

export type WorldTerrainHeightInfluenceContribution = {
  pluginId: string;
  amount: number;
  reason?: string;
};

export type WorldTerrainHeightInfluenceSample = {
  baseHeight: number;
  height: number;
  contributions: readonly WorldTerrainHeightInfluenceContribution[];
};

export type WorldTerrainHeightInfluenceContext = {
  seed: Seed;
  worldX: number;
  worldY: number;
  resolution: WorldTerrainHeightInfluenceResolution;
};

export interface WorldTerrainHeightInfluencePlugin {
  id: string;
  order?: PluginOrder;
  sampling?: WorldTerrainHeightInfluenceSamplingDeclaration;
  sample(context: WorldTerrainHeightInfluenceContext):
    | number
    | {
        amount: number;
        reason?: string;
      }
    | null
    | void;
}

type IndexedWorldTerrainHeightInfluencePlugin = {
  plugin: WorldTerrainHeightInfluencePlugin;
  index: number;
};

export function createWorldTerrainHeightInfluencePlugin(params: {
  id: string;
  order?: PluginOrder;
  sampling?: WorldTerrainHeightInfluenceSamplingDeclaration;
  sample: WorldTerrainHeightInfluencePlugin['sample'];
}): WorldTerrainHeightInfluencePlugin {
  return {
    id: normalizeNonEmptyString(
      params.id,
      'Terrain height influence plugin id'
    ),
    order: normalizePluginOrder(params.order),
    sampling: normalizeSamplingDeclaration(params.sampling),
    sample: params.sample,
  };
}

export function sortWorldTerrainHeightInfluencePlugins(
  plugins: readonly WorldTerrainHeightInfluencePlugin[]
): WorldTerrainHeightInfluencePlugin[] {
  const indexed = plugins.map((plugin, index) => ({ plugin, index }));
  const ids = new Set(indexed.map(({ plugin }) => plugin.id));
  const dependents = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const { plugin } of indexed) {
    dependents.set(plugin.id, new Set());
    inDegree.set(plugin.id, 0);
  }

  function addEdge(from: string, to: string) {
    if (from === to || !ids.has(from) || !ids.has(to)) {
      return;
    }
    const outgoing = dependents.get(from);
    if (!outgoing || outgoing.has(to)) {
      return;
    }
    outgoing.add(to);
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  for (const { plugin } of indexed) {
    for (const dependency of plugin.order?.after ?? []) {
      addEdge(dependency, plugin.id);
    }
    for (const successor of plugin.order?.before ?? []) {
      addEdge(plugin.id, successor);
    }
  }

  const remaining = new Map(indexed.map((entry) => [entry.plugin.id, entry]));
  const ordered: WorldTerrainHeightInfluencePlugin[] = [];

  while (remaining.size > 0) {
    const available = [...remaining.values()]
      .filter(({ plugin }) => (inDegree.get(plugin.id) ?? 0) === 0)
      .sort(comparePluginOrder);

    if (available.length === 0) {
      return indexed
        .slice()
        .sort(comparePluginOrder)
        .map(({ plugin }) => plugin);
    }

    const next = available[0];
    remaining.delete(next.plugin.id);
    ordered.push(next.plugin);

    for (const dependent of dependents.get(next.plugin.id) ?? []) {
      inDegree.set(dependent, Math.max(0, (inDegree.get(dependent) ?? 0) - 1));
    }
  }

  return ordered;
}

export function sampleWorldTerrainHeightInfluences(params: {
  plugins: readonly WorldTerrainHeightInfluencePlugin[];
  seed: Seed;
  worldX: number;
  worldY: number;
  resolution: WorldTerrainHeightInfluenceResolution;
  baseHeight?: number;
}): WorldTerrainHeightInfluenceSample {
  const contributions: WorldTerrainHeightInfluenceContribution[] = [];
  let height = params.baseHeight ?? 0;

  for (const plugin of sortWorldTerrainHeightInfluencePlugins(params.plugins)) {
    if (
      !isPluginSamplingResolutionCompatible(plugin, params.resolution) ||
      !isPointInsidePluginBounds(plugin, params.worldX, params.worldY)
    ) {
      continue;
    }

    const sampled = plugin.sample({
      seed: params.seed,
      worldX: params.worldX,
      worldY: params.worldY,
      resolution: params.resolution,
    });
    if (sampled == null) {
      continue;
    }

    let amount: number;
    let reason: string | undefined;
    if (typeof sampled === 'number') {
      amount = normalizeFiniteAmount(
        sampled,
        `Terrain height influence ${plugin.id} amount`
      );
    } else {
      const sampledObject = sampled as {
        amount: number;
        reason?: string;
      };
      amount = normalizeFiniteAmount(
        sampledObject.amount,
        `Terrain height influence ${plugin.id} amount`
      );
      reason = sampledObject.reason;
    }

    height += amount;
    contributions.push({
      pluginId: plugin.id,
      amount,
      reason,
    });
  }

  return {
    baseHeight: params.baseHeight ?? 0,
    height,
    contributions,
  };
}

function normalizeSamplingDeclaration(
  sampling: WorldTerrainHeightInfluenceSamplingDeclaration | undefined
): WorldTerrainHeightInfluenceSamplingDeclaration | undefined {
  if (!sampling) {
    return undefined;
  }

  return {
    resolutions: normalizeResolutions(sampling.resolutions),
    bounds: sampling.bounds
      ? normalizeBounds(sampling.bounds)
      : sampling.bounds,
    sampleStep:
      typeof sampling.sampleStep === 'number'
        ? normalizePositiveFiniteNumber(
            sampling.sampleStep,
            'Terrain height influence sampleStep'
          )
        : undefined,
  };
}

function normalizeResolutions(
  resolutions: readonly WorldTerrainHeightInfluenceResolution[] | undefined
): WorldTerrainHeightInfluenceResolution[] | undefined {
  if (!resolutions || resolutions.length === 0) {
    return undefined;
  }
  const normalized = [...new Set(resolutions)];
  for (const resolution of normalized) {
    if (resolution !== 'coarse' && resolution !== 'fine') {
      throw new Error(
        `Terrain height influence resolution ${JSON.stringify(resolution)} must be "coarse" or "fine".`
      );
    }
  }
  return normalized;
}

function normalizeBounds(bounds: WorldGenerationBounds): WorldGenerationBounds {
  const minX = normalizeFiniteNumber(
    bounds.minX,
    'Terrain height influence bounds.minX'
  );
  const maxX = normalizeFiniteNumber(
    bounds.maxX,
    'Terrain height influence bounds.maxX'
  );
  const minY = normalizeFiniteNumber(
    bounds.minY,
    'Terrain height influence bounds.minY'
  );
  const maxY = normalizeFiniteNumber(
    bounds.maxY,
    'Terrain height influence bounds.maxY'
  );
  if (minX > maxX) {
    throw new Error(
      `Terrain height influence bounds minX ${minX} must be <= maxX ${maxX}.`
    );
  }
  if (minY > maxY) {
    throw new Error(
      `Terrain height influence bounds minY ${minY} must be <= maxY ${maxY}.`
    );
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

function normalizePluginOrder(
  order: PluginOrder | undefined
): PluginOrder | undefined {
  if (!order) {
    return undefined;
  }
  return {
    priority:
      typeof order.priority === 'number' && Number.isFinite(order.priority)
        ? order.priority
        : undefined,
    after: normalizeOrderReferences(order.after),
    before: normalizeOrderReferences(order.before),
  };
}

function normalizeOrderReferences(
  values: readonly string[] | undefined
): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  const normalized = [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ];
  return normalized.length > 0 ? normalized : undefined;
}

function isPluginSamplingResolutionCompatible(
  plugin: WorldTerrainHeightInfluencePlugin,
  resolution: WorldTerrainHeightInfluenceResolution
): boolean {
  return (
    !plugin.sampling?.resolutions ||
    plugin.sampling.resolutions.includes(resolution)
  );
}

function isPointInsidePluginBounds(
  plugin: WorldTerrainHeightInfluencePlugin,
  worldX: number,
  worldY: number
): boolean {
  const bounds = plugin.sampling?.bounds;
  if (!bounds) {
    return true;
  }
  return (
    worldX >= bounds.minX &&
    worldX <= bounds.maxX &&
    worldY >= bounds.minY &&
    worldY <= bounds.maxY
  );
}

function normalizeNonEmptyString(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function normalizePositiveFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return value;
}

function normalizeFiniteAmount(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function pluginPriority(
  indexed: IndexedWorldTerrainHeightInfluencePlugin
): number {
  return indexed.plugin.order?.priority ?? 0;
}

function comparePluginOrder(
  left: IndexedWorldTerrainHeightInfluencePlugin,
  right: IndexedWorldTerrainHeightInfluencePlugin
): number {
  const leftPriority = pluginPriority(left);
  const rightPriority = pluginPriority(right);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  return left.index - right.index;
}
