import { drawAtlas } from '@bworlds/atlas';
import {
  cardinalFromAngle,
  createPlayer,
  createWorldState,
  getTileDefinition,
  normalizeAngle,
  toGps,
} from '@bworlds/core';
import { PluginRegistry } from '@bworlds/plugin-api';
import { render2D } from '@bworlds/render2d';
import { render3D } from '@bworlds/render3d';
import { createWorldGenerator, defaultPlugins } from '@bworlds/worldgen';
import './styles.css';

const root = document.querySelector('#app');

root.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Infinite Procedural Explorer</p>
        <h1>bworlds</h1>
        <p class="lede">
          Walk a deterministic world, jump between 2D and 3D instantly, and enter
          towns, dungeons, caves, and buildings that generate on demand.
        </p>
      </div>
      <div class="controls">
        <button id="toggle-view" type="button">Switch to 3D</button>
        <button id="action" type="button">Interact</button>
      </div>
    </section>
    <section class="dashboard">
      <div class="viewport-panel">
        <canvas id="viewport" width="1280" height="720"></canvas>
      </div>
      <aside class="sidebar">
        <div class="card">
          <h2>Status</h2>
          <dl id="status"></dl>
        </div>
        <div class="card">
          <h2>Legend</h2>
          <canvas id="atlas" width="256" height="256"></canvas>
        </div>
        <div class="card">
          <h2>Controls</h2>
          <ul>
            <li>WASD or arrow keys to move</li>
            <li>Q/E to turn in 3D mode</li>
            <li>V to toggle 2D and 3D</li>
            <li>Enter or Space to interact</li>
            <li>X to leave a place when standing on its exit</li>
          </ul>
        </div>
      </aside>
    </section>
  </main>
`;

const viewport = document.querySelector('#viewport');
const atlasCanvas = document.querySelector('#atlas');
const status = document.querySelector('#status');
const toggleButton = document.querySelector('#toggle-view');
const actionButton = document.querySelector('#action');

const registry = new PluginRegistry();
for (const plugin of defaultPlugins) {
  registry.register(plugin);
}

const generator = createWorldGenerator({
  seed: 'bworlds-alpha',
  plugins: registry,
});

const state = createWorldState({
  generator,
  player: createPlayer({
    x: 0,
    y: 0,
    facing: 0,
  }),
});

drawAtlas(atlasCanvas.getContext('2d'));

const keys = new Set();

function updateStatus() {
  const tile = state.getCurrentTile();
  const definition = getTileDefinition(tile.kind);
  const gps = toGps(state.player.x, state.player.y);
  const context = state.getCurrentContext();
  const facing = cardinalFromAngle(state.player.facing);

  status.innerHTML = `
    <div><dt>View</dt><dd>${state.viewMode.toUpperCase()}</dd></div>
    <div><dt>Place</dt><dd>${context.label}</dd></div>
    <div><dt>Tile</dt><dd>${definition.name}</dd></div>
    <div><dt>Facing</dt><dd>${facing}</dd></div>
    <div><dt>World</dt><dd>${state.player.x}, ${state.player.y}</dd></div>
    <div><dt>GPS</dt><dd>${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}</dd></div>
    <div><dt>Depth</dt><dd>${context.depth}</dd></div>
    <div><dt>Hint</dt><dd>${tile.note ?? 'Explore the frontier.'}</dd></div>
  `;
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = viewport.getBoundingClientRect();
  viewport.width = Math.floor(rect.width * ratio);
  viewport.height = Math.floor(rect.height * ratio);
}

function toggleView() {
  state.viewMode = state.viewMode === '2d' ? '3d' : '2d';
  toggleButton.textContent =
    state.viewMode === '2d' ? 'Switch to 3D' : 'Switch to 2D';
}

function attemptMove(stepX, stepY) {
  if (state.viewMode === '3d' && (stepX !== 0 || stepY !== 0)) {
    state.player.facing = normalizeAngle(Math.atan2(stepY, stepX));
  }

  const nextX = state.player.x + stepX;
  const nextY = state.player.y + stepY;
  if (state.canWalk(nextX, nextY)) {
    state.player.x = nextX;
    state.player.y = nextY;
  }
}

function forwardDelta() {
  const angle = state.player.facing;
  return {
    x: Math.round(Math.cos(angle)),
    y: Math.round(Math.sin(angle)),
  };
}

function handleInteraction() {
  state.interact();
}

function updateMovement() {
  if (state.viewMode === '2d') {
    if (keys.has('ArrowUp') || keys.has('w')) attemptMove(0, -1);
    if (keys.has('ArrowDown') || keys.has('s')) attemptMove(0, 1);
    if (keys.has('ArrowLeft') || keys.has('a')) attemptMove(-1, 0);
    if (keys.has('ArrowRight') || keys.has('d')) attemptMove(1, 0);
  } else {
    if (keys.has('q')) {
      state.player.facing = normalizeAngle(state.player.facing - 0.08);
    }
    if (keys.has('e')) {
      state.player.facing = normalizeAngle(state.player.facing + 0.08);
    }
    if (keys.has('ArrowUp') || keys.has('w')) {
      const delta = forwardDelta();
      attemptMove(delta.x, delta.y);
    }
    if (keys.has('ArrowDown') || keys.has('s')) {
      const delta = forwardDelta();
      attemptMove(-delta.x, -delta.y);
    }
    if (keys.has('ArrowLeft') || keys.has('a')) {
      const delta = forwardDelta();
      attemptMove(delta.y, -delta.x);
    }
    if (keys.has('ArrowRight') || keys.has('d')) {
      const delta = forwardDelta();
      attemptMove(-delta.y, delta.x);
    }
  }
}

function render() {
  const context = viewport.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, viewport.width, viewport.height);

  if (state.viewMode === '2d') {
    render2D(context, state, {
      width: viewport.width,
      height: viewport.height,
    });
  } else {
    render3D(context, state, {
      width: viewport.width,
      height: viewport.height,
    });
  }

  updateStatus();
}

let lastFrame = 0;

function loop(timestamp) {
  const delta = timestamp - lastFrame;
  if (delta > 85) {
    updateMovement();
    render();
    lastFrame = timestamp;
  }
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  render();
});

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.add(key);

  if (key === 'v') toggleView();
  if (key === ' ' || key === 'Enter') handleInteraction();
  if (key === 'x') state.tryExit();

  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)
  ) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

toggleButton.addEventListener('click', toggleView);
actionButton.addEventListener('click', handleInteraction);

resizeCanvas();
render();
requestAnimationFrame(loop);
