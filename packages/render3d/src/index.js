import {
  getTileAtlasCanvas,
  getTilePixelSize,
  getTileSpriteRect,
  getTileVariantIndex,
} from '@bworlds/atlas';
import { clamp, getTileDefinition, normalizeAngle } from '@bworlds/core';

const WALL_COLUMN_WIDTH = 2;

function castColumn(state, angle, maxDepth = 20) {
  const step = 0.1;
  let depth = 0.1;
  let strongest = {
    depth: maxDepth,
    kind: 'plains',
    wallHeight: 0,
    hitX: state.player.x,
    hitY: state.player.y,
    tileX: Math.round(state.player.x),
    tileY: Math.round(state.player.y),
  };

  while (depth < maxDepth) {
    const x = state.player.x + Math.cos(angle) * depth;
    const y = state.player.y + Math.sin(angle) * depth;
    const tileX = Math.round(x);
    const tileY = Math.round(y);
    const tile = state.getCurrentTile(tileX, tileY);
    const definition = getTileDefinition(tile.kind);
    if (definition.wallHeight > 0.08) {
      strongest = {
        depth,
        kind: tile.kind,
        wallHeight: definition.wallHeight,
        note: tile.note,
        hitX: x,
        hitY: y,
        tileX,
        tileY,
      };
      break;
    }
    depth += step;
  }

  return strongest;
}

export function render3D(context, state, viewport) {
  const atlas = getTileAtlasCanvas();
  const tilePixelSize = getTilePixelSize();
  const jumpOffset = (viewport.jumpHeight ?? 0) * viewport.height * 0.18;
  const horizon = viewport.height * 0.52 + jumpOffset;
  const fov = Math.PI / 2.8;

  const gradientSky = context.createLinearGradient(0, 0, 0, horizon);
  gradientSky.addColorStop(0, '#77c8ff');
  gradientSky.addColorStop(1, '#d9f4ff');
  context.fillStyle = gradientSky;
  context.fillRect(0, 0, viewport.width, horizon);

  const gradientGround = context.createLinearGradient(
    0,
    horizon,
    0,
    viewport.height
  );
  gradientGround.addColorStop(0, '#355e3b');
  gradientGround.addColorStop(1, '#15281c');
  context.fillStyle = gradientGround;
  context.fillRect(0, horizon, viewport.width, viewport.height - horizon);

  for (let column = 0; column < viewport.width; column += WALL_COLUMN_WIDTH) {
    const t = column / viewport.width;
    const angle = normalizeAngle(state.player.facing - fov / 2 + t * fov);
    renderFloorColumn(context, state, viewport, {
      atlas,
      angle,
      column,
      horizon,
      tilePixelSize,
    });

    const hit = castColumn(state, angle);
    const correctedDepth = hit.depth * Math.cos(angle - state.player.facing);
    const def = getTileDefinition(hit.kind);
    const height =
      (viewport.height / Math.max(correctedDepth, 0.001)) *
      hit.wallHeight *
      0.9;
    const shade = clamp(1 - correctedDepth / 20, 0.2, 1);
    const drawHeight = height * 2;
    const top = horizon - height;
    const variant = getTileVariantIndex(hit.kind, hit.tileX, hit.tileY);
    const sprite = getTileSpriteRect(hit.kind, variant);
    const textureX = sampleTextureColumn(hit) + sprite.x;

    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(
      atlas,
      textureX,
      sprite.y,
      1,
      tilePixelSize,
      column,
      top,
      WALL_COLUMN_WIDTH,
      drawHeight
    );
    context.fillStyle = `rgba(0, 0, 0, ${1 - shade})`;
    context.fillRect(column, top, WALL_COLUMN_WIDTH, drawHeight);
    context.restore();

    if (def.wallHeight < 0.12) {
      context.fillStyle = `rgba(255,255,255,${0.08 * shade})`;
      context.fillRect(column, top, WALL_COLUMN_WIDTH, drawHeight);
    }
  }

  context.strokeStyle = 'rgba(255,255,255,0.9)';
  context.beginPath();
  context.moveTo(viewport.width / 2 - 10, horizon);
  context.lineTo(viewport.width / 2 + 10, horizon);
  context.moveTo(viewport.width / 2, horizon - 10);
  context.lineTo(viewport.width / 2, horizon + 10);
  context.stroke();
}

function renderFloorColumn(context, state, viewport, options) {
  const { atlas, angle, column, horizon, tilePixelSize } = options;
  const eyeHeight = 0.5;

  context.save();
  context.imageSmoothingEnabled = false;

  for (let screenY = Math.ceil(horizon); screenY < viewport.height;) {
    const perspective = screenY - horizon;
    if (perspective <= 0) continue;

    const distance = (eyeHeight * viewport.height) / perspective;
    const sampleSize = getFloorSampleSize(distance);
    const worldX = state.player.x + Math.cos(angle) * distance;
    const worldY = state.player.y + Math.sin(angle) * distance;
    const tileX = Math.round(worldX);
    const tileY = Math.round(worldY);
    const tile = state.getCurrentTile(tileX, tileY);
    const variant = getTileVariantIndex(tile.kind, tileX, tileY);
    const sprite = getTileSpriteRect(tile.kind, variant);
    const localX = clamp(worldX - tileX + 0.5, 0, 0.999);
    const localY = clamp(worldY - tileY + 0.5, 0, 0.999);
    const sampleX = sprite.x + Math.floor(localX * tilePixelSize);
    const sampleY = sprite.y + Math.floor(localY * tilePixelSize);
    const shade = clamp(1 - distance / 18, 0.22, 1);

    context.drawImage(
      atlas,
      sampleX,
      sampleY,
      1,
      1,
      column,
      screenY,
      WALL_COLUMN_WIDTH,
      sampleSize.height
    );
    context.fillStyle = `rgba(0, 0, 0, ${1 - shade})`;
    context.fillRect(column, screenY, WALL_COLUMN_WIDTH, sampleSize.height);
    screenY += sampleSize.height;
  }

  context.restore();
}

function getFloorSampleSize(distance) {
  if (distance < 2.5) {
    return { height: 2 };
  }
  if (distance < 5) {
    return { height: 3 };
  }
  if (distance < 9) {
    return { height: 4 };
  }
  return { height: 6 };
}

function sampleTextureColumn(hit) {
  const localX = hit.hitX - hit.tileX + 0.5;
  const localY = hit.hitY - hit.tileY + 0.5;
  const distLeft = Math.abs(localX);
  const distRight = Math.abs(1 - localX);
  const distTop = Math.abs(localY);
  const distBottom = Math.abs(1 - localY);
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  let offset = localX;
  if (minDist === distTop || minDist === distBottom) {
    offset = localX;
  } else {
    offset = localY;
  }

  const textureX = Math.floor(clamp(offset, 0, 0.999) * getTilePixelSize());
  return textureX;
}
