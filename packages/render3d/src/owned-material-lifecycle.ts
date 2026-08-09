import type * as THREE from 'three';

type DisposableMaterialLike = object & {
  dispose?: () => void;
};

type TraversableMaterialRoot = Pick<THREE.Object3D, 'traverse'>;

const ownedMaterialRefCounts = new WeakMap<object, number>();
const ownedMaterialCreationTimestamps: number[] = [];
const ownedMaterialDisposalTimestamps: number[] = [];

export function trackOwnedObject3DMaterials(
  root: TraversableMaterialRoot,
  nowMs = performance.now()
): void {
  for (const material of collectUniqueObjectMaterials(root)) {
    const count = ownedMaterialRefCounts.get(material) ?? 0;
    if (count === 0) {
      ownedMaterialCreationTimestamps.push(nowMs);
    }
    ownedMaterialRefCounts.set(material, count + 1);
  }
}

export function disposeOwnedObject3DMaterials(
  root: TraversableMaterialRoot,
  nowMs = performance.now()
): void {
  for (const material of collectUniqueObjectMaterials(root)) {
    releaseOwnedMaterial(material, nowMs);
  }
}

export function getRecentOwnedMaterialLifecycleCounts(
  nowMs: number,
  windowMs = 1000
): {
  createdCount: number;
  disposedCount: number;
} {
  return {
    createdCount: countRecentMetricEvents(
      ownedMaterialCreationTimestamps,
      nowMs,
      windowMs
    ),
    disposedCount: countRecentMetricEvents(
      ownedMaterialDisposalTimestamps,
      nowMs,
      windowMs
    ),
  };
}

export function resetOwnedMaterialLifecycleMetrics(): void {
  ownedMaterialCreationTimestamps.length = 0;
  ownedMaterialDisposalTimestamps.length = 0;
}

function releaseOwnedMaterial(
  material: DisposableMaterialLike,
  nowMs: number
): boolean {
  const count = ownedMaterialRefCounts.get(material);
  if (!count) {
    return false;
  }
  if (count > 1) {
    ownedMaterialRefCounts.set(material, count - 1);
    return false;
  }
  ownedMaterialRefCounts.delete(material);
  ownedMaterialDisposalTimestamps.push(nowMs);
  material.dispose?.();
  return true;
}

function collectUniqueObjectMaterials(
  root: TraversableMaterialRoot
): DisposableMaterialLike[] {
  const uniqueMaterials = new Set<DisposableMaterialLike>();

  root.traverse((child) => {
    const renderable = child as THREE.Object3D & {
      material?: DisposableMaterialLike | DisposableMaterialLike[];
    };
    for (const material of getObjectMaterials(renderable)) {
      uniqueMaterials.add(material);
    }
  });

  return Array.from(uniqueMaterials);
}

function getObjectMaterials(
  node: THREE.Object3D & {
    material?: DisposableMaterialLike | DisposableMaterialLike[];
  }
): DisposableMaterialLike[] {
  if (!node.material) {
    return [];
  }
  return Array.isArray(node.material) ? node.material : [node.material];
}

function countRecentMetricEvents(
  timestamps: number[],
  nowMs: number,
  windowMs = 1000
): number {
  pruneRecentMetricTimestamps(timestamps, nowMs, windowMs);
  return timestamps.length;
}

function pruneRecentMetricTimestamps(
  timestamps: number[],
  nowMs: number,
  windowMs: number
): void {
  while (timestamps.length > 0 && nowMs - timestamps[0]! > windowMs) {
    timestamps.shift();
  }
}
