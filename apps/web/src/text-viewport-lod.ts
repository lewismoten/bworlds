import type { TextViewportGrid } from '@bworlds/render2d';

type VisibleTileDebugInfoReader = {
  getVisibleTileDebugInfo(
    tileX: number,
    tileY: number
  ): {
    renderedDetailLevel: string | null;
  } | null;
};

export function annotateTextViewportGridWithVisibleTileLods(
  grid: TextViewportGrid,
  renderer3d: VisibleTileDebugInfoReader
): TextViewportGrid {
  return {
    ...grid,
    rows: grid.rows.map((row) =>
      row.map((cell) => ({
        ...cell,
        annotation: formatVisibleTileLodAnnotation(
          renderer3d.getVisibleTileDebugInfo(cell.worldX, cell.worldY)
            ?.renderedDetailLevel
        ),
      }))
    ),
  };
}

export function formatVisibleTileLodAnnotation(
  detailLevel: string | null | undefined
): string | undefined {
  if (detailLevel === 'full') {
    return 'F';
  }
  if (detailLevel === 'low') {
    return 'L';
  }
  return undefined;
}
