import { createRandom } from '@bworlds/core';
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

export type TreeCapabilityConsumer = 'render-2d' | 'render-3d' | 'gameplay';
export type TreeSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export type TreeCapabilityQuery = {
  consumer?: TreeCapabilityConsumer;
  detailLevel?: 'full' | 'low';
  season?: TreeSeason;
  yearProgress?: number;
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

export interface TreeStructuralState {
  radius: number;
  scale: number;
  trunkHeight: number;
  branches: TreeBranchState[];
}

export interface TreeCanopyState {
  foliage: TreeFoliageState[];
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
  structure?: TreeStructuralState;
  canopy?: TreeCanopyState;
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
  createInstanceRandom(
    location: TreeGenerationLocation,
    ...parts: number[]
  ): () => number;
  getCapabilities(query?: TreeCapabilityQuery): TreeCapabilityMap;
  getCapability(
    capability: TreeCapability,
    query?: TreeCapabilityQuery
  ): TreeCapabilityValue | undefined;
  getCapabilityOrFallback(
    capability: TreeCapability,
    query?: TreeCapabilityQuery
  ): TreeCapabilityValue;
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
  getCapabilityOrFallback(
    capability: TreeCapability,
    query?: TreeCapabilityQuery
  ): TreeCapabilityValue;
  supports(capability: TreeCapability, query?: TreeCapabilityQuery): boolean;
}

export interface TreeSpecies<TTree, TContext> extends TreeGenerator<TTree, TContext> {
  familyId: string;
  speciesId: string;
}

export interface TreeFamily<TTree, TContext> extends TreeGenerator<TTree, TContext> {
  familyId: string;
  listSpecies(): Array<TreeSpecies<TTree, TContext>>;
  getSpecies(id: string): TreeSpecies<TTree, TContext> | null;
  generateSpecies(id: string, context: TContext): TTree;
}

export function createTreeLogicalState<TForm extends string = string>({
  x,
  y,
  form,
  structure,
  canopy,
}: {
  x: number;
  y: number;
  form: TForm;
  structure: TreeStructuralState;
  canopy: TreeCanopyState;
}): TreeLogicalState<TForm> {
  return {
    x,
    y,
    form,
    radius: structure.radius,
    scale: structure.scale,
    trunkHeight: structure.trunkHeight,
    branches: structure.branches,
    foliage: canopy.foliage,
    structure,
    canopy,
  };
}

export function getTreeStructuralState<TForm extends string = string>(
  tree: TreeLogicalState<TForm>
): TreeStructuralState {
  return (
    tree.structure ?? {
      radius: tree.radius,
      scale: tree.scale,
      trunkHeight: tree.trunkHeight,
      branches: tree.branches,
    }
  );
}

export function getTreeCanopyState<TForm extends string = string>(
  tree: TreeLogicalState<TForm>
): TreeCanopyState {
  return tree.canopy ?? { foliage: tree.foliage };
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
    createInstanceRandom(location, ...parts) {
      return createRandom(this.createInstanceSeed(location, ...parts));
    },
    getCapabilities(query) {
      return getResolvedCapabilities(query);
    },
    getCapability(capability, query) {
      return getResolvedCapabilities(query)[capability];
    },
    getCapabilityOrFallback(capability, query) {
      const value = getResolvedCapabilities(query)[capability];
      return value ?? getTreeCapabilityFallback(capability);
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
    getCapabilityOrFallback(capability, query) {
      return base.getCapabilityOrFallback(capability, query);
    },
    supports(capability, query) {
      return base.supports(capability, query);
    },
  };
}

export function createTreeSpecies<TTree, TContext>({
  familyId,
  id,
  parentBase,
  capabilities,
  generate,
}: {
  familyId: string;
  id: string;
  parentBase: TreeGeneratorBase;
  capabilities?: TreeCapabilitySource;
  generate(context: TContext, base: TreeGeneratorBase): TTree;
}): TreeSpecies<TTree, TContext> {
  const base = createTreeGeneratorBase({
    seed: parentBase.seed,
    parent: parentBase,
    capabilities,
  });
  const generator = createTreeGenerator<TTree, TContext>({
    id: `${familyId}:${id}`,
    base,
    generate,
  });
  return {
    ...generator,
    familyId,
    speciesId: id,
  };
}

export function createTreeFamily<TTree, TContext>({
  id,
  base,
  resolveSpeciesId,
  species,
}: {
  id: string;
  base: TreeGeneratorBase;
  resolveSpeciesId(context: TContext): string;
  species: Array<TreeSpecies<TTree, TContext>>;
}): TreeFamily<TTree, TContext> {
  const speciesById = new Map(species.map((entry) => [entry.speciesId, entry]));

  return {
    id,
    familyId: id,
    generate(context) {
      const speciesId = resolveSpeciesId(context);
      const resolved = speciesById.get(speciesId) ?? species[0];
      if (!resolved) {
        throw new Error(`Tree family "${id}" has no registered species.`);
      }
      return resolved.generate(context);
    },
    getCapabilities(query) {
      return base.getCapabilities(query);
    },
    getCapability(capability, query) {
      return base.getCapability(capability, query);
    },
    getCapabilityOrFallback(capability, query) {
      return base.getCapabilityOrFallback(capability, query);
    },
    supports(capability, query) {
      return base.supports(capability, query);
    },
    listSpecies() {
      return [...species];
    },
    getSpecies(speciesId) {
      return speciesById.get(speciesId) ?? null;
    },
    generateSpecies(speciesId, context) {
      const resolved = speciesById.get(speciesId);
      if (!resolved) {
        throw new Error(
          `Unknown tree species "${speciesId}" for family "${id}".`
        );
      }
      return resolved.generate(context);
    },
  };
}

export function getTreeCapabilityFallback(
  capability: TreeCapability
): TreeCapabilityValue {
  switch (capability) {
    case 'wind':
      return {
        trunk: false,
        branches: false,
        leaves: false,
      };
    case 'lod':
      return { levels: 1 };
    default:
      return false;
  }
}

export function resolveTreeSeason(
  query?: Pick<TreeCapabilityQuery, 'season' | 'yearProgress'>
): TreeSeason | undefined {
  if (query?.season) {
    return query.season;
  }
  if (typeof query?.yearProgress !== 'number') {
    return undefined;
  }
  const normalized = ((query.yearProgress % 1) + 1) % 1;
  if (normalized < 0.25) {
    return 'spring';
  }
  if (normalized < 0.5) {
    return 'summer';
  }
  if (normalized < 0.75) {
    return 'autumn';
  }
  return 'winter';
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
