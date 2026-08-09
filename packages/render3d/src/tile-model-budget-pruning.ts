import type * as THREE from 'three';
import {
  getRenderBudgetPartMetadata,
  type RenderBudgetPartMetadata,
} from '@bworlds/plugin-api';

type RemovableChildObjectLike = Pick<THREE.Object3D, 'children' | 'userData'>;

type OptionalBudgetPartCandidate = {
  node: RemovableChildObjectLike;
  parent: RemovableChildObjectLike;
  depth: number;
  metadata: RenderBudgetPartMetadata;
};

export type TileModelBudgetPruneResult<TObject extends RemovableChildObjectLike> = {
  validation: {
    accepted: boolean;
  };
  removedParts: RenderBudgetPartMetadata[];
  model: TObject;
};

export function pruneTileModelOptionalPartsForBudget<
  TObject extends RemovableChildObjectLike,
>(
  model: TObject,
  validate: (candidate: TObject) => { accepted: boolean }
): TileModelBudgetPruneResult<TObject> {
  let validation = validate(model);
  if (validation.accepted) {
    return {
      validation,
      removedParts: [],
      model,
    };
  }

  const removedParts: RenderBudgetPartMetadata[] = [];
  const candidates = collectOptionalBudgetPartCandidates(model).sort(
    compareOptionalBudgetPartCandidates
  );

  for (const candidate of candidates) {
    if (!detachChildFromParent(candidate.parent, candidate.node)) {
      continue;
    }
    removedParts.push(candidate.metadata);
    validation = validate(model);
    if (validation.accepted) {
      break;
    }
  }

  return {
    validation,
    removedParts,
    model,
  };
}

function collectOptionalBudgetPartCandidates(
  root: RemovableChildObjectLike
): OptionalBudgetPartCandidate[] {
  const candidates: OptionalBudgetPartCandidate[] = [];

  const visit = (node: RemovableChildObjectLike, depth: number) => {
    const children = node.children as RemovableChildObjectLike[];
    for (const child of children) {
      const metadata = getRenderBudgetPartMetadata(child);
      if (metadata?.optional) {
        candidates.push({
          node: child,
          parent: node,
          depth: depth + 1,
          metadata,
        });
      }
      visit(child, depth + 1);
    }
  };

  visit(root, 0);
  return candidates;
}

function compareOptionalBudgetPartCandidates(
  left: OptionalBudgetPartCandidate,
  right: OptionalBudgetPartCandidate
): number {
  if (left.metadata.priority !== right.metadata.priority) {
    return left.metadata.priority - right.metadata.priority;
  }
  return right.depth - left.depth;
}

function detachChildFromParent(
  parent: RemovableChildObjectLike,
  child: RemovableChildObjectLike
): boolean {
  const children = parent.children as RemovableChildObjectLike[];
  const childIndex = children.indexOf(child);
  if (childIndex < 0) {
    return false;
  }
  children.splice(childIndex, 1);
  return true;
}
