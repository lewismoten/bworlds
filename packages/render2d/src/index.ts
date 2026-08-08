import { drawTileSprite, getTileVariantIndex } from '@bworlds/atlas';
import { getDaylightCycleState } from '@bworlds/core';

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

      if (tile.kind === 'river') {
        drawRiverOverlay(context, state, worldX, worldY, drawX, drawY, tileSize);
      }
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

  if (typeof viewport.timeMs === 'number') {
    drawTimeOfDayOverlay(
      context,
      viewport,
      viewport.timeMs,
      viewport.environment ?? {}
    );
  }
}

const RIVER_OVERLAY_NETWORK_KINDS = new Set(['river', 'bridge', 'ocean']);

export function getRiverOverlayConnections(state, worldX, worldY) {
  const directions = [
    createRiverOverlayDirection('north', 0, -1, 0.5, 0, 0.5, 0.22),
    createRiverOverlayDirection('east', 1, 0, 1, 0.5, 0.78, 0.5),
    createRiverOverlayDirection('south', 0, 1, 0.5, 1, 0.5, 0.78),
    createRiverOverlayDirection('west', -1, 0, 0, 0.5, 0.22, 0.5),
    createRiverOverlayDirection('northeast', 1, -1, 1, 0, 0.74, 0.26),
    createRiverOverlayDirection('southeast', 1, 1, 1, 1, 0.74, 0.74),
    createRiverOverlayDirection('southwest', -1, 1, 0, 1, 0.26, 0.74),
    createRiverOverlayDirection('northwest', -1, -1, 0, 0, 0.26, 0.26),
  ];

  return directions
    .filter(({ dx, dy }) =>
      RIVER_OVERLAY_NETWORK_KINDS.has(
        state.getCurrentTile(worldX + dx, worldY + dy).kind
      )
    )
    .sort((left, right) => left.angle - right.angle);
}

function createRiverOverlayDirection(id, dx, dy, edgeX, edgeY, inwardX, inwardY) {
  return {
    id,
    dx,
    dy,
    edgeX,
    edgeY,
    inwardX,
    inwardY,
    angle: Math.atan2(edgeY - 0.5, edgeX - 0.5),
  };
}

function drawRiverOverlay(context, state, worldX, worldY, x, y, size) {
  const connections = getRiverOverlayConnections(state, worldX, worldY);
  const bodyWidth = Math.max(3, size * 0.28);
  const highlightWidth = Math.max(1, bodyWidth * 0.28);
  const center = pointAt(x, y, size, 0.5, 0.5);

  if (connections.length === 0) {
    const stub = [
      center,
      pointAt(x, y, size, 0.48, 0.64),
      pointAt(x, y, size, 0.5, 0.82),
      pointAt(x, y, size, 0.5, 1),
    ];
    drawRiverStroke(context, stub, bodyWidth, '#38bdf8');
    drawRiverStroke(context, stub, highlightWidth, 'rgba(217,244,255,0.92)');
    return;
  }

  drawRiverPool(context, center.x, center.y, Math.max(2, bodyWidth * 0.42));

  if (connections.length === 2) {
    const [start, end] = connections;
    const curve = [
      pointAt(x, y, size, start.edgeX, start.edgeY),
      pointAt(x, y, size, start.inwardX, start.inwardY),
      pointAt(x, y, size, end.inwardX, end.inwardY),
      pointAt(x, y, size, end.edgeX, end.edgeY),
    ];
    drawRiverStroke(context, curve, bodyWidth, '#38bdf8');
    drawRiverStroke(context, curve, highlightWidth, 'rgba(217,244,255,0.92)');
    return;
  }

  connections.forEach((connection) => {
    const branch = [
      center,
      pointAt(
        x,
        y,
        size,
        0.5 + (connection.inwardX - 0.5) * 0.58,
        0.5 + (connection.inwardY - 0.5) * 0.58
      ),
      pointAt(x, y, size, connection.inwardX, connection.inwardY),
      pointAt(x, y, size, connection.edgeX, connection.edgeY),
    ];
    drawRiverStroke(context, branch, bodyWidth * 0.9, '#38bdf8');
    drawRiverStroke(
      context,
      branch,
      Math.max(1, highlightWidth * 0.95),
      'rgba(217,244,255,0.9)'
    );
  });
}

function drawRiverPool(context, centerX, centerY, radius) {
  context.fillStyle = '#38bdf8';
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(217,244,255,0.82)';
  context.beginPath();
  context.arc(
    centerX - radius * 0.15,
    centerY - radius * 0.12,
    radius * 0.38,
    0,
    Math.PI * 2
  );
  context.fill();
}

function drawRiverStroke(context, points, lineWidth, strokeStyle) {
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  context.bezierCurveTo(
    points[1].x,
    points[1].y,
    points[2].x,
    points[2].y,
    points[3].x,
    points[3].y
  );
  context.stroke();
}

function pointAt(x, y, size, px, py) {
  return {
    x: x + size * px,
    y: y + size * py,
  };
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

function drawTimeOfDayOverlay(context, viewport, timeMs, environment) {
  const cycle = getDaylightCycleState(timeMs, environment.cycle ?? {});

  context.save();

  const nightAlpha = cycle.night * 0.54;
  if (nightAlpha > 0.01) {
    context.fillStyle = `rgba(8, 16, 34, ${nightAlpha})`;
    context.fillRect(0, 0, viewport.width, viewport.height);
  }

  const duskAlpha = (1 - cycle.daylight) * 0.18;
  if (duskAlpha > 0.01) {
    const gradient = context.createLinearGradient(0, 0, 0, viewport.height);
    gradient.addColorStop(0, `rgba(255, 168, 110, ${duskAlpha * 0.9})`);
    gradient.addColorStop(1, `rgba(45, 68, 122, ${duskAlpha * 0.4})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewport.width, viewport.height);
  }

  context.restore();
}
