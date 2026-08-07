import { getTileDefinition } from '@bworlds/core';

export function render2D(context, state, viewport) {
  const tileSize = Math.max(
    14,
    Math.floor(Math.min(viewport.width, viewport.height) / 22)
  );
  const radiusX = Math.floor(viewport.width / tileSize / 2);
  const radiusY = Math.floor(viewport.height / tileSize / 2);
  const centerX = Math.floor(viewport.width / 2);
  const centerY = Math.floor(viewport.height / 2);

  context.fillStyle = '#081019';
  context.fillRect(0, 0, viewport.width, viewport.height);

  for (let y = -radiusY; y <= radiusY; y += 1) {
    for (let x = -radiusX; x <= radiusX; x += 1) {
      const worldX = state.player.x + x;
      const worldY = state.player.y + y;
      const tile = state.getCurrentTile(worldX, worldY);
      const definition = getTileDefinition(tile.kind);
      const drawX = centerX + x * tileSize;
      const drawY = centerY + y * tileSize;

      context.fillStyle = definition.color;
      context.fillRect(drawX, drawY, tileSize, tileSize);

      if (tile.kind === 'road' || tile.kind === 'bridge') {
        context.fillStyle = 'rgba(255,255,255,0.18)';
        context.fillRect(
          drawX + tileSize * 0.2,
          drawY + tileSize * 0.4,
          tileSize * 0.6,
          tileSize * 0.2
        );
      }

      if (tile.poi || tile.kind === 'sign' || tile.kind === 'door') {
        context.fillStyle = '#ffffff';
        context.fillRect(
          drawX + tileSize * 0.35,
          drawY + tileSize * 0.2,
          tileSize * 0.3,
          tileSize * 0.3
        );
      }
    }
  }

  context.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < viewport.width; x += tileSize) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, viewport.height);
    context.stroke();
  }
  for (let y = 0; y < viewport.height; y += tileSize) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(viewport.width, y + 0.5);
    context.stroke();
  }

  drawFacingMarker(
    context,
    centerX + tileSize / 2,
    centerY + tileSize / 2,
    tileSize,
    state.player.facing
  );
}

function drawFacingMarker(context, centerX, centerY, tileSize, angle) {
  context.save();
  context.translate(centerX, centerY);
  context.rotate(angle);

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
