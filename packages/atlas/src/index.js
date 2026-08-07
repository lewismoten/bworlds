import { TILE_DEFINITIONS } from '@bworlds/core';

export function drawAtlas(context) {
  const entries = Object.entries(TILE_DEFINITIONS);
  const tileSize = 32;
  context.clearRect(0, 0, 256, 256);
  context.font = '10px sans-serif';
  context.textBaseline = 'top';

  entries.slice(0, 16).forEach(([name, definition], index) => {
    const x = (index % 2) * 128 + 10;
    const y = Math.floor(index / 2) * 30 + 8;
    context.fillStyle = definition.color;
    context.fillRect(x, y, 18, 18);
    context.fillStyle = '#ecf4f7';
    context.fillText(name, x + 26, y + 4);
  });
}
