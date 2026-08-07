import { clamp, getTileDefinition, normalizeAngle } from '@bworlds/core';

function castColumn(state, angle, maxDepth = 20) {
  const step = 0.1;
  let depth = 0.1;
  let strongest = {
    depth: maxDepth,
    kind: 'plains',
    wallHeight: 0,
  };

  while (depth < maxDepth) {
    const x = state.player.x + Math.cos(angle) * depth;
    const y = state.player.y + Math.sin(angle) * depth;
    const tile = state.getCurrentTile(Math.round(x), Math.round(y));
    const definition = getTileDefinition(tile.kind);
    if (definition.wallHeight > 0.08) {
      strongest = {
        depth,
        kind: tile.kind,
        wallHeight: definition.wallHeight,
        note: tile.note,
      };
      break;
    }
    depth += step;
  }

  return strongest;
}

export function render3D(context, state, viewport) {
  const horizon = viewport.height * 0.52;
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

  for (let column = 0; column < viewport.width; column += 2) {
    const t = column / viewport.width;
    const angle = normalizeAngle(state.player.facing - fov / 2 + t * fov);
    const hit = castColumn(state, angle);
    const correctedDepth = hit.depth * Math.cos(angle - state.player.facing);
    const def = getTileDefinition(hit.kind);
    const height =
      (viewport.height / Math.max(correctedDepth, 0.001)) *
      hit.wallHeight *
      0.9;
    const shade = clamp(1 - correctedDepth / 20, 0.2, 1);

    const baseColor = def.color;
    context.fillStyle = tint(baseColor, shade);
    context.fillRect(column, horizon - height, 2, height * 2);
  }

  context.strokeStyle = 'rgba(255,255,255,0.9)';
  context.beginPath();
  context.moveTo(viewport.width / 2 - 10, horizon);
  context.lineTo(viewport.width / 2 + 10, horizon);
  context.moveTo(viewport.width / 2, horizon - 10);
  context.lineTo(viewport.width / 2, horizon + 10);
  context.stroke();
}

function tint(hex, factor) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgb(${Math.floor(red * factor)}, ${Math.floor(green * factor)}, ${Math.floor(blue * factor)})`;
}
