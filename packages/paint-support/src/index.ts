import type { Paint2DContext } from '@bworlds/plugin-api';

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
