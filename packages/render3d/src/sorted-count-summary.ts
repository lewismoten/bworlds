type CountEntry = {
  label: string;
  count: number;
};

export type SortedCountSummaryScratch = {
  entries: CountEntry[];
};

export function createSortedCountSummaryScratch(): SortedCountSummaryScratch {
  return {
    entries: [],
  };
}

export function summarizeSortedCountMap(
  counts: ReadonlyMap<string, number>,
  scratch = createSortedCountSummaryScratch(),
  compare: (
    left: CountEntry,
    right: CountEntry
  ) => number = compareCountEntriesByLabel
): string {
  const entries = fillSortedCountEntries(counts, scratch, compare);
  if (entries.length === 0) {
    return '';
  }

  let summary = '';
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as CountEntry;
    if (index > 0) {
      summary += ', ';
    }
    summary += `${entry.label}:${entry.count}`;
  }
  return summary;
}

export function summarizeSortedCountMapWithTopLabel(
  counts: ReadonlyMap<string, number>,
  scratch = createSortedCountSummaryScratch(),
  compare: (
    left: CountEntry,
    right: CountEntry
  ) => number = compareCountEntriesByDescendingCount
): {
  topCount: number;
  topLabel: string;
  summary: string;
} {
  const entries = fillSortedCountEntries(counts, scratch, compare);
  if (entries.length === 0) {
    return {
      topCount: 0,
      topLabel: '',
      summary: '',
    };
  }

  let summary = '';
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as CountEntry;
    if (index > 0) {
      summary += ', ';
    }
    summary += `${entry.label}:${entry.count}`;
  }

  return {
    topCount: entries[0]?.count ?? 0,
    topLabel: entries[0]?.label ?? '',
    summary,
  };
}

function fillSortedCountEntries(
  counts: ReadonlyMap<string, number>,
  scratch: SortedCountSummaryScratch,
  compare: (left: CountEntry, right: CountEntry) => number
): CountEntry[] {
  const entries = scratch.entries;
  entries.length = 0;

  for (const [label, count] of counts.entries()) {
    entries.push({ label, count });
  }

  entries.sort(compare);
  return entries;
}

function compareCountEntriesByLabel(
  left: CountEntry,
  right: CountEntry
): number {
  return left.label.localeCompare(right.label);
}

function compareCountEntriesByDescendingCount(
  left: CountEntry,
  right: CountEntry
): number {
  if (right.count !== left.count) {
    return right.count - left.count;
  }
  return left.label.localeCompare(right.label);
}
