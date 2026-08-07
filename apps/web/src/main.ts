import { drawAtlas } from '@bworlds/atlas';
import {
  HALF_WORLD_TILES,
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
import { create3DRenderer } from '@bworlds/render3d';
import { createWorldGenerator, defaultPlugins } from '@bworlds/worldgen';
import './styles.css';

const STORAGE_KEY = 'bworlds:session';

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
        <button id="jump-random" type="button">Random Plains</button>
        <button id="jump-home" type="button">Go Home</button>
      </div>
    </section>
    <section class="dashboard">
      <div class="viewport-panel">
        <div id="viewport-stage" class="viewport-stage">
          <canvas id="viewport-2d" width="1280" height="720"></canvas>
          <div
            id="viewport-3d"
            class="viewport-3d is-hidden"
            aria-hidden="true"
          ></div>
        </div>
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

const viewport2d = document.querySelector('#viewport-2d');
const viewport3d = document.querySelector('#viewport-3d');
const atlasCanvas = document.querySelector('#atlas');
const status = document.querySelector('#status');
const toggleButton = document.querySelector('#toggle-view');
const actionButton = document.querySelector('#action');
const randomJumpButton = document.querySelector('#jump-random');
const homeJumpButton = document.querySelector('#jump-home');
let lastSavedSnapshot = '';

const registry = new PluginRegistry();
for (const plugin of defaultPlugins) {
  registry.register(plugin);
}

const generator = createWorldGenerator({
  seed: 'bworlds-alpha',
  plugins: registry,
});

const savedSession = loadSession();
const state = createWorldState({
  generator,
  player: createPlayer(savedSession?.player),
});

if (savedSession?.viewMode === '3d' || savedSession?.viewMode === '2d') {
  state.viewMode = savedSession.viewMode;
}

if (Array.isArray(savedSession?.stack) && savedSession.stack.length > 0) {
  state.stack = savedSession.stack;
}

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
const renderer3d = create3DRenderer(viewport3d);

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
  const rect = viewport2d.getBoundingClientRect();
  viewport2d.width = Math.floor(rect.width * ratio);
  viewport2d.height = Math.floor(rect.height * ratio);
  renderer3d.resize(rect.width, rect.height, ratio);
}

function toggleView() {
  state.viewMode = state.viewMode === '2d' ? '3d' : '2d';
  toggleButton.textContent =
    state.viewMode === '2d' ? 'Switch to 3D' : 'Switch to 2D';
  viewport2d.classList.toggle('is-hidden', state.viewMode !== '2d');
  viewport3d.classList.toggle('is-hidden', state.viewMode !== '3d');
  saveSession();
}

function canMoveTo(nextX, nextY) {
  const canOccupy3d =
    state.viewMode !== '3d' || renderer3d.canOccupy(state, nextX, nextY);
  return state.canWalk(nextX, nextY) && canOccupy3d;
}

function commitMove(nextX, nextY) {
  state.player.x = nextX;
  state.player.y = nextY;
  saveSession();
}

function isBridgeTravelKind(kind) {
  return kind === 'bridge' || kind === 'road' || kind === 'town';
}

function getBridgeAxis() {
  const currentX = snapWorldCoordinate(state.player.x);
  const currentY = snapWorldCoordinate(state.player.y);
  const currentKind = state.getCurrentTile(currentX, currentY).kind;
  if (currentKind !== 'bridge') {
    return null;
  }

  const west = isBridgeTravelKind(
    state.getCurrentTile(currentX - 1, currentY).kind
  );
  const east = isBridgeTravelKind(
    state.getCurrentTile(currentX + 1, currentY).kind
  );
  const north = isBridgeTravelKind(
    state.getCurrentTile(currentX, currentY - 1).kind
  );
  const south = isBridgeTravelKind(
    state.getCurrentTile(currentX, currentY + 1).kind
  );

  if ((west || east) && !(north || south)) {
    return 'ew';
  }
  if ((north || south) && !(west || east)) {
    return 'ns';
  }

  return null;
}

function attemptMove(stepX, stepY) {
  const nextX = state.player.x + stepX;
  const nextY = state.player.y + stepY;
  if (canMoveTo(nextX, nextY)) {
    commitMove(nextX, nextY);
    return;
  }

  const bridgeAxis = getBridgeAxis();
  if (bridgeAxis === 'ew' && stepX !== 0) {
    const slideX = state.player.x + stepX;
    if (canMoveTo(slideX, state.player.y)) {
      commitMove(slideX, state.player.y);
      return;
    }
  }
  if (bridgeAxis === 'ns' && stepY !== 0) {
    const slideY = state.player.y + stepY;
    if (canMoveTo(state.player.x, slideY)) {
      commitMove(state.player.x, slideY);
      return;
    }
  }

  if (stepX !== 0 && canMoveTo(state.player.x + stepX, state.player.y)) {
    commitMove(state.player.x + stepX, state.player.y);
    return;
  }
  if (stepY !== 0 && canMoveTo(state.player.x, state.player.y + stepY)) {
    commitMove(state.player.x, state.player.y + stepY);
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
  if (state.interact()) {
    saveSession();
  }
}

function resetMotionState() {
  motion.jumpHeight = 0;
  motion.isJumping = false;
  motion.spaceHeld = false;
  motion.spaceReady = true;
  motion.jumpVelocity = 0;
  motion.jumpHoldElapsed = 0;
  motion.longJumpActivated = false;
}

function travelToOverworld(x, y, facing = state.player.facing) {
  state.stack = [
    {
      id: 'overworld',
      label: 'Overworld',
      type: 'overworld',
      depth: 0,
      origin: { x: 0, y: 0 },
    },
  ];
  state.player.x = x;
  state.player.y = y;
  state.player.facing = normalizeAngle(facing);
  resetMotionState();
  saveSession();
  render();
}

function findRandomPlainsLocation() {
  for (let attempt = 0; attempt < 3000; attempt += 1) {
    const x = Math.floor((Math.random() * 2 - 1) * HALF_WORLD_TILES);
    const y = Math.floor((Math.random() * 2 - 1) * HALF_WORLD_TILES * 0.5);
    const tile = generator.sampleOverworld(x, y);
    if (tile.kind === 'plains') {
      return { x, y };
    }
  }

  for (let radius = 0; radius <= 12; radius += 1) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const x = offsetX;
        const y = offsetY;
        const tile = generator.sampleOverworld(x, y);
        if (tile.kind === 'plains') {
          return { x, y };
        }
      }
    }
  }

  return { x: 0, y: 0 };
}

function jumpToRandomPlains() {
  const destination = findRandomPlainsLocation();
  travelToOverworld(destination.x, destination.y);
}

function jumpHome() {
  travelToOverworld(0, 0, 0);
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
  const previousX = state.player.x;
  const previousY = state.player.y;
  const previousFacing = state.player.facing;
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

  if (
    previousX !== state.player.x ||
    previousY !== state.player.y ||
    previousFacing !== state.player.facing
  ) {
    saveSession();
  }
}

function render() {
  const timeMs = performance.now();
  if (state.viewMode === '2d') {
    const context = viewport2d.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, viewport2d.width, viewport2d.height);
    render2D(context, state, {
      width: viewport2d.width,
      height: viewport2d.height,
      rotation: -(state.player.facing + Math.PI / 2),
      timeMs,
    });
  } else {
    renderer3d.render(state, {
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
  if (key === 'x' && state.tryExit()) saveSession();

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
randomJumpButton.addEventListener('click', jumpToRandomPlains);
homeJumpButton.addEventListener('click', jumpHome);

resizeCanvas();
viewport2d.classList.toggle('is-hidden', state.viewMode !== '2d');
viewport3d.classList.toggle('is-hidden', state.viewMode !== '3d');
render();
requestAnimationFrame(loop);

function saveSession() {
  try {
    const snapshot = JSON.stringify({
      player: {
        x: state.player.x,
        y: state.player.y,
        facing: state.player.facing,
      },
      stack: state.stack,
      viewMode: state.viewMode,
    });
    if (snapshot === lastSavedSnapshot) return;
    window.localStorage.setItem(STORAGE_KEY, snapshot);
    lastSavedSnapshot = snapshot;
  } catch {
    // Ignore storage write failures so play continues normally.
  }
}

function loadSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.player?.x !== 'number' ||
      typeof parsed?.player?.y !== 'number' ||
      typeof parsed?.player?.facing !== 'number'
    ) {
      return null;
    }
    if (!Array.isArray(parsed?.stack) || parsed.stack.length === 0) {
      return null;
    }
    lastSavedSnapshot = raw;
    return parsed;
  } catch {
    return null;
  }
}
