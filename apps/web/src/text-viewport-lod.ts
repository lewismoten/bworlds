import type { TextViewportGrid } from '@bworlds/render2d';

type VisibleTileDebugInfoReader = {
  getVisibleTileDebugInfo(
    tileX: number,
    tileY: number
  ): {
    renderedDetailLevel: string | null;
    cachedDetailLevel?: string | null;
  } | null;
};

export function annotateTextViewportGridWithVisibleTileLods(
  grid: TextViewportGrid,
  renderer3d: VisibleTileDebugInfoReader,
  options?: {
    showCachedAvailability?: boolean;
  }
): TextViewportGrid {
  const showCachedAvailability = options?.showCachedAvailability ?? false;
  return {
    ...grid,
    rows: grid.rows.map((row) =>
      row.map((cell) => ({
        ...cell,
        annotation: formatVisibleTileLodAnnotation(
          renderer3d.getVisibleTileDebugInfo(cell.worldX, cell.worldY),
          {
            showCachedAvailability,
          }
        ),
      }))
    ),
  };
}

export function formatVisibleTileLodAnnotation(
  debugInfo:
    | {
        renderedDetailLevel: string | null;
        cachedDetailLevel?: string | null;
      }
    | null
    | undefined,
  options?: {
    showCachedAvailability?: boolean;
  }
): string | undefined {
  if (options?.showCachedAvailability) {
    if (debugInfo?.cachedDetailLevel === 'full') {
      return 'CF';
    }
    if (debugInfo?.cachedDetailLevel === 'low') {
      return 'CL';
    }
    return undefined;
  }
  if (debugInfo?.renderedDetailLevel === 'full') {
    return 'F';
  }
  if (debugInfo?.renderedDetailLevel === 'low') {
    return 'L';
  }
  return undefined;
}
