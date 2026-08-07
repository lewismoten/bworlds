import type { Paint2DContext } from '@bworlds/plugin-api';

export type TilePainter2D = (context: Paint2DContext) => boolean | void;

export function paintPlainsBackdrop({
  context,
  x,
  y,
  motif,
  fillRect,
  tilePixelSize = 16,
  baseColor = '#7fb069',
  bladeColor = '#4f7f3c',
}: {
  context: CanvasRenderingContext2D;
  x: number;
  y: number;
  motif: Paint2DContext['motif'];
  fillRect: Paint2DContext['fillRect'];
  tilePixelSize?: number;
  baseColor?: string;
  bladeColor?: string;
}) {
  fillRect(context, x, y, tilePixelSize, tilePixelSize, baseColor);
  const start = 1 + motif.int(0, 2);
  for (let blade = start; blade < tilePixelSize; blade += 4) {
    fillRect(
      context,
      x + blade,
      y + 9 + ((blade + motif.seed) % 3),
      1,
      4,
      bladeColor
    );
  }
}

export function composeTilePainter(
  basePainter?: TilePainter2D | null,
  overlayPainter?: TilePainter2D | null
): TilePainter2D {
  return function paintCompositeTile(context: Paint2DContext) {
    basePainter?.(context);
    return overlayPainter?.(context) ?? true;
  };
}

export function createPlainsBackedTilePainter(
  paint?: TilePainter2D
) {
  return composeTilePainter(
    (context) => {
      paintPlainsBackdrop({
        context: context.context,
        x: context.x,
        y: context.y,
        motif: context.motif,
        fillRect: context.fillRect,
      });
      return true;
    },
    paint
  );
}
