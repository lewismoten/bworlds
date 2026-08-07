import { drawTileSprite, getTileVariantIndex } from '@bworlds/atlas';

export function render2D(context, state, viewport) {
  const tileSize = Math.max(
    14,
    Math.floor(Math.min(viewport.width, viewport.height) / 22)
  );
  const diagonal = Math.ceil(
    Math.hypot(viewport.width, viewport.height) / tileSize / 2
  );
  const radiusX = diagonal + 2;
  const radiusY = diagonal + 2;
  const centerX = Math.floor(viewport.width / 2);
  const centerY = Math.floor(viewport.height / 2);
  const rotation = viewport.rotation ?? 0;
  const anchorX = Math.round(state.player.x);
  const anchorY = Math.round(state.player.y);
  const offsetX = state.player.x - anchorX;
  const offsetY = state.player.y - anchorY;

  context.fillStyle = '#081019';
  context.fillRect(0, 0, viewport.width, viewport.height);

  context.save();
  context.translate(centerX + tileSize / 2, centerY + tileSize / 2);
  context.rotate(rotation);

  for (let y = -radiusY; y <= radiusY; y += 1) {
    for (let x = -radiusX; x <= radiusX; x += 1) {
      const worldX = anchorX + x;
      const worldY = anchorY + y;
      const tile = state.getCurrentTile(worldX, worldY);
      const drawX = (x - offsetX) * tileSize;
      const drawY = (y - offsetY) * tileSize;

      drawTileSprite(context, tile.kind, drawX, drawY, tileSize + 1, {
        variant: getTileVariantIndex(tile.kind, worldX, worldY),
        timeMs: viewport.timeMs,
        worldX,
        worldY,
      });
    }
  }

  context.restore();

  drawRotatedGrid(context, viewport, centerX, centerY, tileSize, rotation);

  drawFacingMarker(
    context,
    centerX + tileSize / 2,
    centerY + tileSize / 2,
    tileSize
  );
}

function drawRotatedGrid(
  context,
  viewport,
  centerX,
  centerY,
  tileSize,
  rotation
) {
  context.save();
  context.translate(centerX + tileSize / 2, centerY + tileSize / 2);
  context.rotate(rotation);
  context.strokeStyle = 'rgba(255,255,255,0.08)';

  for (let x = -viewport.width; x <= viewport.width; x += tileSize) {
    context.beginPath();
    context.moveTo(x + 0.5, -viewport.height * 1.5);
    context.lineTo(x + 0.5, viewport.height * 1.5);
    context.stroke();
  }

  for (let y = -viewport.height; y <= viewport.height; y += tileSize) {
    context.beginPath();
    context.moveTo(-viewport.width * 1.5, y + 0.5);
    context.lineTo(viewport.width * 1.5, y + 0.5);
    context.stroke();
  }

  context.restore();
}

function drawFacingMarker(context, centerX, centerY, tileSize) {
  context.save();
  context.translate(centerX, centerY);
  context.rotate(-Math.PI / 2);

  context.fillStyle = '#ffbf69';
  context.beginPath();
  context.moveTo(tileSize * 0.42, 0);
  context.lineTo(-tileSize * 0.18, -tileSize * 0.24);
  context.lineTo(-tileSize * 0.18, -tileSize * 0.11);
  context.lineTo(-tileSize * 0.38, -tileSize * 0.11);
  context.lineTo(-tileSize * 0.38, tileSize * 0.11);
  context.lineTo(-tileSize * 0.18, tileSize * 0.11);
  context.lineTo(-tileSize * 0.18, tileSize * 0.24);
  context.closePath();
  context.fill();

  context.strokeStyle = '#081019';
  context.lineWidth = Math.max(2, tileSize * 0.06);
  context.stroke();
  context.restore();
}
