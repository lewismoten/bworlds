export type PendingWorldBuildEntry = {
  key: string;
  x: number;
  y: number;
};

export type PendingWorldBuildQueueReconcileResult = {
  queue: PendingWorldBuildEntry[];
  cancelledEntryCount: number;
};

type PendingWorldBuildQueueScratch = {
  queue: PendingWorldBuildEntry[];
  queuedKeys: Set<string>;
  survivingKeys: Set<string>;
  countedCancelledKeys: Set<string>;
};

export function createPendingWorldBuildQueueScratch(): PendingWorldBuildQueueScratch {
  return {
    queue: [],
    queuedKeys: new Set<string>(),
    survivingKeys: new Set<string>(),
    countedCancelledKeys: new Set<string>(),
  };
}

export function fillPendingWorldBuildQueue(
  nextQueue: PendingWorldBuildEntry[],
  visibleTileKeys: ReadonlySet<string>,
  scratch: PendingWorldBuildQueueScratch
): PendingWorldBuildEntry[] {
  scratch.queue.length = 0;
  scratch.queuedKeys.clear();

  for (const entry of nextQueue) {
    if (
      visibleTileKeys.has(entry.key) ||
      scratch.queuedKeys.has(entry.key)
    ) {
      continue;
    }
    scratch.queuedKeys.add(entry.key);
    scratch.queue.push(entry);
  }

  return scratch.queue;
}

export function reconcilePendingWorldBuildQueueWithScratch(
  nextQueue: PendingWorldBuildEntry[],
  visibleTileKeys: ReadonlySet<string>,
  previousQueue: PendingWorldBuildEntry[] = [],
  scratch = createPendingWorldBuildQueueScratch()
): PendingWorldBuildQueueReconcileResult {
  const queue = fillPendingWorldBuildQueue(nextQueue, visibleTileKeys, scratch);
  if (previousQueue.length === 0) {
    return {
      queue,
      cancelledEntryCount: 0,
    };
  }

  scratch.survivingKeys.clear();
  for (const entry of queue) {
    scratch.survivingKeys.add(entry.key);
  }

  let cancelledEntryCount = 0;
  scratch.countedCancelledKeys.clear();
  for (const entry of previousQueue) {
    if (
      visibleTileKeys.has(entry.key) ||
      scratch.survivingKeys.has(entry.key) ||
      scratch.countedCancelledKeys.has(entry.key)
    ) {
      continue;
    }
    scratch.countedCancelledKeys.add(entry.key);
    cancelledEntryCount += 1;
  }

  return {
    queue,
    cancelledEntryCount,
  };
}

export function buildPendingWorldBuildQueue(
  nextQueue: PendingWorldBuildEntry[],
  visibleTileKeys: ReadonlySet<string>
): PendingWorldBuildEntry[] {
  return fillPendingWorldBuildQueue(
    nextQueue,
    visibleTileKeys,
    createPendingWorldBuildQueueScratch()
  );
}

export function reconcilePendingWorldBuildQueue(
  nextQueue: PendingWorldBuildEntry[],
  visibleTileKeys: ReadonlySet<string>,
  previousQueue: PendingWorldBuildEntry[] = []
): PendingWorldBuildQueueReconcileResult {
  return reconcilePendingWorldBuildQueueWithScratch(
    nextQueue,
    visibleTileKeys,
    previousQueue,
    createPendingWorldBuildQueueScratch()
  );
}
