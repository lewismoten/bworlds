import { drawAtlas } from '@bworlds/atlas';
import {
  cardinalFromAngle,
  createPlayer,
  createWorldState,
  getTileDefinition,
  normalizeAngle,
  snapWorldCoordinate,
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
            <li>In 2D, up/down move forward and reverse through the rotating map</li>
            <li>In 2D, left/right rotate unless Shift is held to strafe</li>
            <li>In 3D, left/right rotate unless Shift is held to strafe</li>
            <li>Q/E also rotate in both 2D and 3D</li>
            <li>In 3D, Space jumps and Enter interacts</li>
            <li>V to toggle 2D and 3D</li>
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

const motion = {
  jumpHeight: 0,
  isJumping: false,
  spaceHeld: false,
  spaceReady: true,
  jumpVelocity: 0,
  jumpGravity: 0.0000135,
  jumpHoldGravityFactor: 0.38,
  jumpHoldWindow: 260,
  jumpHoldElapsed: 0,
  maxJumpHeight: 0.34,
  shortJumpVelocity: 0.00125,
  longJumpVelocity: 0.00195,
  longJumpThreshold: 110,
  longJumpActivated: false,
};

drawAtlas(atlasCanvas.getContext('2d'));

const keys = new Set();

function updateStatus() {
  const tile = state.getCurrentTile();
  const definition = getTileDefinition(tile.kind);
  const gps = toGps(state.player.x, state.player.y);
  const context = state.getCurrentContext();
  const facing = cardinalFromAngle(state.player.facing);
  const gridX = snapWorldCoordinate(state.player.x);
  const gridY = snapWorldCoordinate(state.player.y);

  status.innerHTML = `
    <div><dt>View</dt><dd>${state.viewMode.toUpperCase()}</dd></div>
    <div><dt>Place</dt><dd>${context.label}</dd></div>
    <div><dt>Tile</dt><dd>${definition.name}</dd></div>
    <div><dt>Facing</dt><dd>${facing}</dd></div>
    <div><dt>World</dt><dd>${state.player.x.toFixed(2)}, ${state.player.y.toFixed(2)}</dd></div>
    <div><dt>Grid</dt><dd>${gridX}, ${gridY}</dd></div>
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
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

function handleInteraction() {
  state.interact();
}

function jump() {
  if (state.viewMode !== '3d') return;
  if (motion.isJumping) return;
  motion.isJumping = true;
  motion.jumpHeight = 0;
  motion.jumpVelocity = motion.shortJumpVelocity;
  motion.jumpHoldElapsed = 0;
  motion.longJumpActivated = false;
}

function updateMovement(deltaMs) {
  const turnSpeed = 0.0034 * deltaMs;
  const moveSpeed = 0.0052 * deltaMs;
  const shiftHeld = keys.has('Shift');

  if (keys.has('q')) {
    state.player.facing = normalizeAngle(state.player.facing - turnSpeed);
  }
  if (keys.has('e')) {
    state.player.facing = normalizeAngle(state.player.facing + turnSpeed);
  }

  let moveX = 0;
  let moveY = 0;
  const forward = forwardDelta();
  const strafe = {
    x: Math.cos(state.player.facing + Math.PI / 2),
    y: Math.sin(state.player.facing + Math.PI / 2),
  };

  if (state.viewMode === '2d') {
    if ((keys.has('ArrowLeft') || keys.has('a')) && !shiftHeld) {
      state.player.facing = normalizeAngle(state.player.facing - turnSpeed);
    }
    if ((keys.has('ArrowRight') || keys.has('d')) && !shiftHeld) {
      state.player.facing = normalizeAngle(state.player.facing + turnSpeed);
    }
    if (keys.has('ArrowUp') || keys.has('w')) {
      moveX += forward.x;
      moveY += forward.y;
    }
    if (keys.has('ArrowDown') || keys.has('s')) {
      moveX -= forward.x;
      moveY -= forward.y;
    }
    if ((keys.has('ArrowLeft') || keys.has('a')) && shiftHeld) {
      moveX -= strafe.x;
      moveY -= strafe.y;
    }
    if ((keys.has('ArrowRight') || keys.has('d')) && shiftHeld) {
      moveX += strafe.x;
      moveY += strafe.y;
    }
  } else {
    if ((keys.has('ArrowLeft') || keys.has('a')) && !shiftHeld) {
      state.player.facing = normalizeAngle(state.player.facing - turnSpeed);
    }
    if ((keys.has('ArrowRight') || keys.has('d')) && !shiftHeld) {
      state.player.facing = normalizeAngle(state.player.facing + turnSpeed);
    }
    if (keys.has('ArrowUp') || keys.has('w')) {
      moveX += forward.x;
      moveY += forward.y;
    }
    if (keys.has('ArrowDown') || keys.has('s')) {
      moveX -= forward.x;
      moveY -= forward.y;
    }
    if ((keys.has('ArrowLeft') || keys.has('a')) && shiftHeld) {
      moveX -= strafe.x;
      moveY -= strafe.y;
    }
    if ((keys.has('ArrowRight') || keys.has('d')) && shiftHeld) {
      moveX += strafe.x;
      moveY += strafe.y;
    }
  }

  const magnitude = Math.hypot(moveX, moveY);
  if (magnitude > 0) {
    const normalizedX = (moveX / magnitude) * moveSpeed;
    const normalizedY = (moveY / magnitude) * moveSpeed;
    attemptMove(normalizedX, normalizedY);
  }

  if (motion.isJumping) {
    if (
      motion.spaceHeld &&
      !motion.longJumpActivated &&
      motion.jumpHoldElapsed >= motion.longJumpThreshold &&
      motion.jumpVelocity > 0
    ) {
      motion.jumpVelocity = Math.max(
        motion.jumpVelocity,
        motion.longJumpVelocity
      );
      motion.longJumpActivated = true;
    }

    const shouldSustainJump =
      motion.spaceHeld &&
      motion.jumpVelocity > 0 &&
      motion.jumpHoldElapsed < motion.jumpHoldWindow;

    if (shouldSustainJump) {
      motion.jumpHoldElapsed = Math.min(
        motion.jumpHoldElapsed + deltaMs,
        motion.jumpHoldWindow
      );
    }

    const gravity = shouldSustainJump
      ? motion.jumpGravity * motion.jumpHoldGravityFactor
      : motion.jumpGravity;

    motion.jumpVelocity -= gravity * deltaMs;
    motion.jumpHeight = Math.min(
      motion.maxJumpHeight,
      motion.jumpHeight + motion.jumpVelocity * deltaMs
    );

    if (motion.jumpHeight <= 0 && motion.jumpVelocity <= 0) {
      motion.isJumping = false;
      motion.jumpHeight = 0;
      motion.jumpVelocity = 0;
      motion.jumpHoldElapsed = 0;
      motion.longJumpActivated = false;
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
      rotation: -(state.player.facing + Math.PI / 2),
    });
  } else {
    render3D(context, state, {
      width: viewport.width,
      height: viewport.height,
      jumpHeight: motion.jumpHeight,
    });
  }

  updateStatus();
}

let lastFrame = 0;

function loop(timestamp) {
  const delta =
    lastFrame === 0 ? 16.67 : Math.min(timestamp - lastFrame, 33.34);
  updateMovement(delta);
  render();
  lastFrame = timestamp;
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
  if (key === 'Enter') handleInteraction();
  if (key === ' ') {
    if (state.viewMode === '3d') {
      motion.spaceHeld = true;
      if (motion.spaceReady) {
        motion.spaceReady = false;
        jump();
      }
    } else {
      handleInteraction();
    }
  }
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
  if (event.key === ' ') {
    motion.spaceHeld = false;
    motion.spaceReady = true;
  }
});

toggleButton.addEventListener('click', toggleView);
actionButton.addEventListener('click', handleInteraction);

resizeCanvas();
render();
requestAnimationFrame(loop);
