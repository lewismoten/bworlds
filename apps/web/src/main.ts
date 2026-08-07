import { drawAtlas } from '@bworlds/atlas';
import {
  advanceWorldTimeOffsetByHours,
  alignWorldTimeOffsetToDayProgress,
  getWorldDaylightCycle,
  getWorldTimeMs,
  getDaylightCycleState,
  HALF_WORLD_TILES,
  cardinalFromAngle,
  normalizeAngle,
  snapWorldCoordinate,
  toGps,
} from '@bworlds/core';
import { render2D } from '@bworlds/render2d';
import { create3DRenderer } from '@bworlds/render3d';
import {
  createBuiltinContentPackCatalog,
  createWorldRuntime,
} from '@bworlds/worldgen';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';
import './styles.css';

const STORAGE_KEY = 'bworlds:session';
const builtinPackCatalog = createBuiltinContentPackCatalog();
const builtinPackManifests = builtinPackCatalog.list();
const REQUIRED_PACK_ID = 'default-content-pack';

const root = document.querySelector<HTMLElement>('#app');

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
        <p class="eyebrow" id="content-pack-label"></p>
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
          <h2>Content Packs</h2>
          <form id="content-pack-form" class="pack-form"></form>
        </div>
        <div class="card">
          <h2>Timekeeper</h2>
          <canvas id="time-wheel" width="240" height="240"></canvas>
          <div class="time-toggle-row">
            <button id="time-freeze-toggle" type="button">Freeze Time</button>
          </div>
          <div class="time-skip-controls">
            <button id="time-plus-hour" type="button">+1h</button>
            <button id="time-plus-six" type="button">+6h</button>
            <button id="time-plus-twelve" type="button">+12h</button>
            <button id="time-plus-day" type="button">+1d</button>
          </div>
          <div class="time-presets">
            <button data-time-preset="dawn" type="button">Dawn</button>
            <button data-time-preset="noon" type="button">Noon</button>
            <button data-time-preset="dusk" type="button">Dusk</button>
            <button data-time-preset="midnight" type="button">Midnight</button>
          </div>
        </div>
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

const viewport2d = document.querySelector<HTMLCanvasElement>('#viewport-2d');
const viewport3d = document.querySelector<HTMLElement>('#viewport-3d');
const atlasCanvas = document.querySelector<HTMLCanvasElement>('#atlas');
const timeWheelCanvas =
  document.querySelector<HTMLCanvasElement>('#time-wheel');
const status = document.querySelector<HTMLElement>('#status');
const toggleButton = document.querySelector<HTMLButtonElement>('#toggle-view');
const actionButton = document.querySelector<HTMLButtonElement>('#action');
const contentPackForm =
  document.querySelector<HTMLFormElement>('#content-pack-form');
const randomJumpButton =
  document.querySelector<HTMLButtonElement>('#jump-random');
const homeJumpButton =
  document.querySelector<HTMLButtonElement>('#jump-home');
const plusHourButton =
  document.querySelector<HTMLButtonElement>('#time-plus-hour');
const plusSixButton =
  document.querySelector<HTMLButtonElement>('#time-plus-six');
const plusTwelveButton =
  document.querySelector<HTMLButtonElement>('#time-plus-twelve');
const plusDayButton =
  document.querySelector<HTMLButtonElement>('#time-plus-day');
const freezeTimeButton =
  document.querySelector<HTMLButtonElement>('#time-freeze-toggle');
let lastSavedSnapshot = '';

const savedSession = loadSession();
let activePackIds = normalizeSelectedPackIds(savedSession?.packIds);
let runtime = createWorldRuntime({
  seed: 'bworlds-alpha',
  packIds: activePackIds,
  player: savedSession?.player,
  stack: savedSession?.stack,
  viewMode: savedSession?.viewMode,
});
let { contentPacks: activePacks, generator, registry, state } = runtime;
const timeState = {
  offsetMs: savedSession?.timeOffsetMs ?? 0,
  frozen: savedSession?.timeFrozen ?? false,
  frozenWorldTimeMs:
    typeof savedSession?.frozenWorldTimeMs === 'number'
      ? savedSession.frozenWorldTimeMs
      : null,
};

const contentPackLabel = document.querySelector('#content-pack-label');

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

renderContentPackControls();
updateContentPackLabel();
updateFreezeTimeButton();

function updateStatus() {
  const environment = getCurrentEnvironment();
  const cycle = getCurrentCycle(environment);
  const tile = state.getCurrentTile();
  const definition = registry.resolveTileDefinition(
    tile.kind,
    state.getTileDefinition(tile.kind)
  );
  const gps = toGps(state.player.x, state.player.y);
  const context = state.getCurrentContext();
  const facing = cardinalFromAngle(state.player.facing);
  const gridX = snapWorldCoordinate(state.player.x);
  const gridY = snapWorldCoordinate(state.player.y);

  status.innerHTML = `
    <div><dt>View</dt><dd>${state.viewMode.toUpperCase()}</dd></div>
    <div><dt>Place</dt><dd>${context.label}</dd></div>
    <div><dt>Tile</dt><dd>${definition?.name ?? tile.kind}</dd></div>
    <div><dt>Facing</dt><dd>${facing}</dd></div>
    <div><dt>World</dt><dd>${state.player.x.toFixed(2)}, ${state.player.y.toFixed(2)}</dd></div>
    <div><dt>Grid</dt><dd>${gridX}, ${gridY}</dd></div>
    <div><dt>GPS</dt><dd>${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}</dd></div>
    <div><dt>Time</dt><dd>${formatCycleTime(cycle.dayProgress)}</dd></div>
    <div><dt>Cycle</dt><dd>${timeState.frozen ? 'Frozen' : 'Running'}</dd></div>
    <div><dt>Moon</dt><dd>${cycle.moonPhaseName}</dd></div>
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

function updateContentPackLabel() {
  if (!contentPackLabel) return;
  contentPackLabel.textContent = `Content Packs: ${activePacks.map((pack) => pack.name).join(' + ')}`;
}

function renderContentPackControls() {
  if (!contentPackForm) return;
  contentPackForm.innerHTML = builtinPackManifests
    .map((pack) => {
      const checked = activePackIds.includes(pack.id) ? 'checked' : '';
      const disabled = pack.id === REQUIRED_PACK_ID ? 'disabled' : '';
      const description = pack.description
        ? `<span class="pack-description">${pack.description}</span>`
        : '';
      return `
        <label class="pack-option">
          <input
            type="checkbox"
            name="content-pack"
            value="${pack.id}"
            ${checked}
            ${disabled}
          />
          <span class="pack-name">${pack.name}</span>
          ${description}
        </label>
      `;
    })
    .join('');
}

function normalizeSelectedPackIds(packIds?: unknown): string[] {
  const selectedIds = Array.isArray(packIds)
    ? packIds.filter((packId): packId is string => typeof packId === 'string')
    : builtinPackCatalog.defaultPackIds;
  const knownIds = new Set(builtinPackManifests.map((pack) => pack.id));
  const filtered = selectedIds.filter((packId) => knownIds.has(packId));
  const unique = [...new Set([REQUIRED_PACK_ID, ...filtered])];
  return unique.length > 0 ? unique : [REQUIRED_PACK_ID];
}

function rebuildRuntime(nextPackIds: string[]) {
  const normalizedPackIds = normalizeSelectedPackIds(nextPackIds);
  runtime = createWorldRuntime({
    seed: 'bworlds-alpha',
    packIds: normalizedPackIds,
    player: {
      x: state.player.x,
      y: state.player.y,
      facing: state.player.facing,
    },
    stack: state.stack,
    viewMode: state.viewMode,
  });
  ({ contentPacks: activePacks, generator, registry, state } = runtime);
  activePackIds = normalizedPackIds;
  drawAtlas(atlasCanvas.getContext('2d'));
  renderContentPackControls();
  updateContentPackLabel();
  saveSession();
  render();
}

function getCurrentWorldTimeMs() {
  if (timeState.frozen && typeof timeState.frozenWorldTimeMs === 'number') {
    return timeState.frozenWorldTimeMs;
  }
  return getWorldTimeMs(performance.now(), {
    timeOffsetMs: timeState.offsetMs,
  });
}

function getCurrentEnvironment(
  timeMs = getCurrentWorldTimeMs()
): WorldEnvironmentLike {
  return registry.resolveWorldEnvironment({
    state,
    timeMs,
  });
}

function getCurrentCycle(environment: WorldEnvironmentLike = getCurrentEnvironment()) {
  return getWorldDaylightCycle(performance.now(), {
    timeOffsetMs: timeState.offsetMs,
    cycle: environment.cycle,
  }).cycle;
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

function getBridgeAxis() {
  const currentX = snapWorldCoordinate(state.player.x);
  const currentY = snapWorldCoordinate(state.player.y);
  const currentTile = state.getCurrentTile(currentX, currentY);
  const profile =
    registry.getTraversalProfile3D({
      state,
      tile: currentTile,
      tileX: currentX,
      tileY: currentY,
    }) || null;
  return profile?.slideAxis ?? null;
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

function skipTimeByHours(hours: number) {
  const environment = getCurrentEnvironment();
  const nextOffsetMs = advanceWorldTimeOffsetByHours(timeState.offsetMs, hours, {
    dayLengthMs: environment.cycle?.dayLengthMs,
  });
  timeState.offsetMs = nextOffsetMs;
  if (timeState.frozen) {
    timeState.frozenWorldTimeMs = getWorldTimeMs(performance.now(), {
      timeOffsetMs: nextOffsetMs,
    });
  }
  saveSession();
  render();
}

function jumpToTimePreset(preset: 'dawn' | 'noon' | 'dusk' | 'midnight') {
  const environment = getCurrentEnvironment();
  const presetProgress: Record<typeof preset, number> = {
    dawn: 0.25,
    noon: 0.5,
    dusk: 0.75,
    midnight: 0,
  };
  const targetProgress = presetProgress[preset];
  const nextOffsetMs = alignWorldTimeOffsetToDayProgress(
    performance.now(),
    timeState.offsetMs,
    targetProgress,
    environment.cycle ?? {}
  );
  timeState.offsetMs = nextOffsetMs;
  if (timeState.frozen) {
    timeState.frozenWorldTimeMs = getWorldTimeMs(performance.now(), {
      timeOffsetMs: nextOffsetMs,
    });
  }
  saveSession();
  render();
}

function updateFreezeTimeButton() {
  if (!freezeTimeButton) return;
  freezeTimeButton.textContent = timeState.frozen
    ? 'Resume Time'
    : 'Freeze Time';
  freezeTimeButton.classList.toggle('is-active', timeState.frozen);
}

function toggleTimeFreeze() {
  if (timeState.frozen) {
    const resumeFromWorldTime = getCurrentWorldTimeMs();
    timeState.offsetMs = resumeFromWorldTime - performance.now();
    timeState.frozen = false;
    timeState.frozenWorldTimeMs = null;
  } else {
    timeState.frozenWorldTimeMs = getCurrentWorldTimeMs();
    timeState.frozen = true;
  }

  updateFreezeTimeButton();
  saveSession();
  render();
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
  const timeMs = getCurrentWorldTimeMs();
  const environment = getCurrentEnvironment(timeMs);
  if (state.viewMode === '2d') {
    const context = viewport2d?.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, viewport2d.width, viewport2d.height);
    render2D(context, state, {
      width: viewport2d.width,
      height: viewport2d.height,
      rotation: -(state.player.facing + Math.PI / 2),
      timeMs,
      environment,
    });
  } else {
    renderer3d.render(state, {
      jumpHeight: motion.jumpHeight,
      timeMs,
      environment,
    });
  }

  drawTimeWheel(timeWheelCanvas, getDaylightCycleState(timeMs, environment.cycle ?? {}));
  updateStatus();
}

let lastFrame = 0;

function formatCycleTime(dayProgress: number) {
  const totalMinutes = Math.floor(dayProgress * 24 * 60);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function drawTimeWheel(canvas: HTMLCanvasElement | null, cycle: ReturnType<typeof getDaylightCycleState>) {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    return;
  }

  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) * 0.43;
  const innerRadius = outerRadius * 0.58;
  const wheelRotation = -cycle.dayProgress * Math.PI * 2;

  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(centerX, centerY);

  const halo = context.createRadialGradient(0, 0, innerRadius * 0.2, 0, 0, outerRadius * 1.15);
  halo.addColorStop(0, 'rgba(255, 191, 105, 0.12)');
  halo.addColorStop(1, 'rgba(85, 214, 190, 0)');
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, outerRadius * 1.15, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.rotate(wheelRotation);

  const ringGradient = context.createLinearGradient(0, -outerRadius, 0, outerRadius);
  ringGradient.addColorStop(0, '#7fd2ff');
  ringGradient.addColorStop(0.48, '#f5bf74');
  ringGradient.addColorStop(0.52, '#10203a');
  ringGradient.addColorStop(1, '#07111d');
  context.fillStyle = ringGradient;
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  context.closePath();
  context.fill();

  for (let hour = 0; hour < 24; hour += 1) {
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
    const tickOuter = outerRadius + (hour % 6 === 0 ? 6 : 2);
    const tickInner = outerRadius - (hour % 6 === 0 ? 16 : 9);
    context.strokeStyle =
      hour < 12 ? 'rgba(255,255,255,0.5)' : 'rgba(159,196,255,0.4)';
    context.lineWidth = hour % 6 === 0 ? 2 : 1;
    context.beginPath();
    context.moveTo(Math.cos(angle) * tickInner, Math.sin(angle) * tickInner);
    context.lineTo(Math.cos(angle) * tickOuter, Math.sin(angle) * tickOuter);
    context.stroke();
  }

  const sunAngle = Math.PI * 1.5;
  context.fillStyle = '#ffcf6b';
  context.beginPath();
  context.arc(
    Math.cos(sunAngle) * ((outerRadius + innerRadius) * 0.5),
    Math.sin(sunAngle) * ((outerRadius + innerRadius) * 0.5),
    11,
    0,
    Math.PI * 2
  );
  context.fill();

  const moonAngle = Math.PI * 0.5;
  context.fillStyle = '#d9e8ff';
  context.beginPath();
  context.arc(
    Math.cos(moonAngle) * ((outerRadius + innerRadius) * 0.5),
    Math.sin(moonAngle) * ((outerRadius + innerRadius) * 0.5),
    9,
    0,
    Math.PI * 2
  );
  context.fill();
  context.fillStyle = '#09111a';
  context.beginPath();
  context.arc(
    Math.cos(moonAngle) * ((outerRadius + innerRadius) * 0.5) + (1 - cycle.moonIllumination) * 7,
    Math.sin(moonAngle) * ((outerRadius + innerRadius) * 0.5),
    8,
    0,
    Math.PI * 2
  );
  context.fill();

  if (cycle.starsOpacity > 0.05) {
    context.fillStyle = `rgba(255,255,255,${0.18 + cycle.starsOpacity * 0.5})`;
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const radius = innerRadius * 0.78;
      context.fillRect(
        Math.cos(angle) * radius - 1,
        Math.sin(angle) * radius - 1,
        2,
        2
      );
    }
  }

  context.restore();

  context.fillStyle = '#081019';
  context.beginPath();
  context.arc(0, 0, innerRadius - 3, 0, Math.PI * 2);
  context.fill();

  const windowWidth = innerRadius * 1.15;
  const windowHeight = innerRadius * 0.52;
  const windowY = -innerRadius * 0.2;

  context.save();
  context.beginPath();
  roundedRectPath(
    context,
    -windowWidth / 2,
    windowY - windowHeight / 2,
    windowWidth,
    windowHeight,
    18
  );
  context.clip();
  context.rotate(wheelRotation);
  context.fillStyle = ringGradient;
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  context.closePath();
  context.fill();
  context.restore();

  context.strokeStyle = 'rgba(255,255,255,0.22)';
  context.lineWidth = 3;
  roundedRectPath(
    context,
    -windowWidth / 2,
    windowY - windowHeight / 2,
    windowWidth,
    windowHeight,
    18
  );
  context.stroke();

  context.fillStyle = '#ecf4f7';
  context.font = '600 14px Trebuchet MS';
  context.textAlign = 'center';
  context.fillText(formatCycleTime(cycle.dayProgress), 0, innerRadius * 0.18);
  context.fillStyle = '#96afb8';
  context.font = '12px Trebuchet MS';
  context.fillText(cycle.moonPhaseName, 0, innerRadius * 0.38);
  context.restore();
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

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
contentPackForm?.addEventListener('change', () => {
  const selectedPackIds = builtinPackManifests
    .filter((pack) => {
      const input = contentPackForm.elements.namedItem('content-pack');
      if (!(input instanceof RadioNodeList)) {
        return pack.id === REQUIRED_PACK_ID;
      }
      const controls = Array.from(input).filter(
        (control): control is HTMLInputElement => control instanceof HTMLInputElement
      );
      return controls.some(
        (control) => control.value === pack.id && control.checked
      );
    })
    .map((pack) => pack.id);
  rebuildRuntime(selectedPackIds);
});
randomJumpButton.addEventListener('click', jumpToRandomPlains);
homeJumpButton.addEventListener('click', jumpHome);
plusHourButton?.addEventListener('click', () => skipTimeByHours(1));
plusSixButton?.addEventListener('click', () => skipTimeByHours(6));
plusTwelveButton?.addEventListener('click', () => skipTimeByHours(12));
plusDayButton?.addEventListener('click', () => skipTimeByHours(24));
freezeTimeButton?.addEventListener('click', toggleTimeFreeze);
root.querySelectorAll<HTMLButtonElement>('[data-time-preset]').forEach((button) => {
  button.addEventListener('click', () => {
    const preset = button.dataset.timePreset;
    if (
      preset === 'dawn' ||
      preset === 'noon' ||
      preset === 'dusk' ||
      preset === 'midnight'
    ) {
      jumpToTimePreset(preset);
    }
  });
});

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
      packIds: activePackIds,
      stack: state.stack,
      viewMode: state.viewMode,
      timeOffsetMs: timeState.offsetMs,
      timeFrozen: timeState.frozen,
      frozenWorldTimeMs: timeState.frozenWorldTimeMs,
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
