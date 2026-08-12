import type {
  PluginOrder,
  WorldGenerationLayerContext,
  WorldGenerationLayerDependency,
  WorldGenerationLayerOutputRecord,
  WorldGenerationLayerPlugin,
} from './types';

type IndexedWorldGenerationLayerPlugin = {
  plugin: WorldGenerationLayerPlugin;
  index: number;
};

export function createWorldGenerationLayerPlugin(params: {
  id: WorldGenerationLayerPlugin['id'];
  order?: PluginOrder;
  inputDependencies?: readonly WorldGenerationLayerDependency[];
  outputRecords: readonly WorldGenerationLayerOutputRecord[];
  run: WorldGenerationLayerPlugin['run'];
}): WorldGenerationLayerPlugin {
  const id = normalizeNonEmptyString(
    params.id,
    'World generation layer plugin id'
  );
  const inputDependencies = normalizeWorldGenerationDependencies(
    params.inputDependencies ?? []
  );
  const outputRecords = normalizeWorldGenerationOutputRecords(
    params.outputRecords
  );

  return {
    id,
    order: normalizePluginOrder(params.order),
    inputDependencies,
    outputRecords,
    run: params.run,
  };
}

export function sortWorldGenerationLayerPlugins(
  plugins: readonly WorldGenerationLayerPlugin[]
): WorldGenerationLayerPlugin[] {
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
  const ordered: WorldGenerationLayerPlugin[] = [];

  while (remaining.size > 0) {
    const available = [...remaining.values()]
      .filter(({ plugin }) => (inDegree.get(plugin.id) ?? 0) === 0)
      .sort(compareWorldGenerationLayerOrder);

    if (available.length === 0) {
      return indexed
        .slice()
        .sort(compareWorldGenerationLayerOrder)
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

export function createWorldGenerationDependencyKey(
  dependency: Pick<WorldGenerationLayerDependency, 'pluginId' | 'recordType'>
): string {
  return `${dependency.pluginId}:${dependency.recordType}`;
}

function normalizeWorldGenerationDependencies(
  dependencies: readonly WorldGenerationLayerDependency[]
): WorldGenerationLayerDependency[] {
  const deduped = new Map<string, WorldGenerationLayerDependency>();
  for (const dependency of dependencies) {
    const pluginId = normalizeNonEmptyString(
      dependency.pluginId,
      'World generation dependency pluginId'
    );
    const recordType = normalizeNonEmptyString(
      dependency.recordType,
      'World generation dependency recordType'
    );
    deduped.set(createWorldGenerationDependencyKey({ pluginId, recordType }), {
      pluginId,
      recordType,
      optional: dependency.optional === true,
    });
  }
  return [...deduped.values()];
}

function normalizeWorldGenerationOutputRecords(
  outputs: readonly WorldGenerationLayerOutputRecord[]
): WorldGenerationLayerOutputRecord[] {
  if (outputs.length === 0) {
    throw new Error(
      'World generation layer plugin outputRecords must include at least one record type.'
    );
  }

  const deduped = new Map<string, WorldGenerationLayerOutputRecord>();
  for (const output of outputs) {
    const recordType = normalizeNonEmptyString(
      output.recordType,
      'World generation output recordType'
    );
    const nextOutput = {
      recordType,
      description:
        typeof output.description === 'string' &&
        output.description.trim().length > 0
          ? output.description.trim()
          : undefined,
    };
    const existing = deduped.get(recordType);
    deduped.set(recordType, {
      recordType,
      description: existing?.description ?? nextOutput.description,
    });
  }
  return [...deduped.values()];
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
  const deduped = [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ];
  return deduped.length > 0 ? deduped : undefined;
}

function normalizeNonEmptyString(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

function pluginPriority(indexed: IndexedWorldGenerationLayerPlugin): number {
  return indexed.plugin.order?.priority ?? 0;
}

function compareWorldGenerationLayerOrder(
  left: IndexedWorldGenerationLayerPlugin,
  right: IndexedWorldGenerationLayerPlugin
): number {
  const leftPriority = pluginPriority(left);
  const rightPriority = pluginPriority(right);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  return left.index - right.index;
}
