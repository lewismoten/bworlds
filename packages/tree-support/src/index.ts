import { appendHashSeedPart } from '@bworlds/core/hash';

export type TreeCapability =
  | 'branches'
  | 'foliage'
  | 'fruit'
  | 'flowers'
  | 'seasonalLeaves'
  | 'wind'
  | 'hollows'
  | 'nests'
  | 'climbable'
  | 'harvestable'
  | 'carvings'
  | 'attachments'
  | 'burning'
  | 'damage'
  | 'fallen'
  | 'lod';

export type TreeCapabilityValue =
  | boolean
  | number
  | string
  | readonly string[]
  | Record<string, unknown>;

export type TreeCapabilityQuery = {
  detailLevel?: 'full' | 'low';
  [key: string]: unknown;
};

export type TreeCapabilityMap = Partial<Record<TreeCapability, TreeCapabilityValue>>;

export interface TreeGenerationLocation {
  tileX: number;
  tileY: number;
  index?: number;
}

export interface TreeBranchState {
  x: number;
  y: number;
  z: number;
  length: number;
  pitch: number;
  roll: number;
}

export interface TreeFoliageState {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface TreeLogicalState<TForm extends string = string> {
  x: number;
  y: number;
  radius: number;
  scale: number;
  trunkHeight: number;
  form: TForm;
  branches: TreeBranchState[];
  foliage: TreeFoliageState[];
}

type TreeCapabilitySource =
  | TreeCapabilityMap
  | ((query?: TreeCapabilityQuery) => TreeCapabilityMap);

export interface TreeGeneratorBase {
  seed: number;
  createInstanceSeed(
    location: TreeGenerationLocation,
    ...parts: number[]
  ): number;
  getCapabilities(query?: TreeCapabilityQuery): TreeCapabilityMap;
  getCapability(
    capability: TreeCapability,
    query?: TreeCapabilityQuery
  ): TreeCapabilityValue | undefined;
  supports(capability: TreeCapability, query?: TreeCapabilityQuery): boolean;
}

export interface TreeGenerator<TTree, TContext> {
  id: string;
  generate(context: TContext): TTree;
  getCapabilities(query?: TreeCapabilityQuery): TreeCapabilityMap;
  getCapability(
    capability: TreeCapability,
    query?: TreeCapabilityQuery
  ): TreeCapabilityValue | undefined;
  supports(capability: TreeCapability, query?: TreeCapabilityQuery): boolean;
}

export function createTreeGeneratorBase({
  seed,
  capabilities,
  parent,
}: {
  seed: number;
  capabilities?: TreeCapabilitySource;
  parent?: TreeGeneratorBase;
}): TreeGeneratorBase {
  const getResolvedCapabilities = (
    query?: TreeCapabilityQuery
  ): TreeCapabilityMap => ({
    ...(parent?.getCapabilities(query) ?? {}),
    ...resolveTreeCapabilities(capabilities, query),
  });

  return {
    seed,
    createInstanceSeed(location, ...parts) {
      let resolvedSeed = parent
        ? parent.createInstanceSeed(location)
        : appendHashSeedPart(
            appendHashSeedPart(seed, location.tileX),
            location.tileY
          );
      if (typeof location.index === 'number') {
        resolvedSeed = appendHashSeedPart(resolvedSeed, location.index);
      }
      for (const part of parts) {
        resolvedSeed = appendHashSeedPart(resolvedSeed, part);
      }
      return resolvedSeed;
    },
    getCapabilities(query) {
      return getResolvedCapabilities(query);
    },
    getCapability(capability, query) {
      return getResolvedCapabilities(query)[capability];
    },
    supports(capability, query) {
      return isSupportedTreeCapabilityValue(
        getResolvedCapabilities(query)[capability]
      );
    },
  };
}

export function createTreeGenerator<TTree, TContext>({
  id,
  base,
  generate,
}: {
  id: string;
  base: TreeGeneratorBase;
  generate(context: TContext, base: TreeGeneratorBase): TTree;
}): TreeGenerator<TTree, TContext> {
  return {
    id,
    generate(context) {
      return generate(context, base);
    },
    getCapabilities(query) {
      return base.getCapabilities(query);
    },
    getCapability(capability, query) {
      return base.getCapability(capability, query);
    },
    supports(capability, query) {
      return base.supports(capability, query);
    },
  };
}

function resolveTreeCapabilities(
  source: TreeCapabilitySource | undefined,
  query?: TreeCapabilityQuery
): TreeCapabilityMap {
  if (!source) {
    return {};
  }
  return typeof source === 'function' ? source(query) : source;
}

function isSupportedTreeCapabilityValue(
  value: TreeCapabilityValue | undefined
): boolean {
  if (value === undefined || value === false) {
    return false;
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}
