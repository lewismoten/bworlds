import { drawAtlas } from '@bworlds/atlas';
import {
  advanceWorldTimeOffsetByHours,
  advanceWorldTimeOffsetBySeasons,
  applyCelestialEnvironmentOverrides,
  alignWorldTimeOffsetToDayProgress,
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
import {
  drawTimeWheel,
  getCelestialDateLabel,
  getMoonMidnightOrbitProgress,
  getMoonOrbitProgress,
  stabilizeDisplayedDaylightAnchors,
} from './timekeeper.ts';
import { createCelestialPreviewRenderer } from './celestial-preview.ts';
import { createSolarSystemPreviewRenderer } from './solar-system-preview.ts';
import {
  parseSavedSession,
  serializeSessionSnapshot,
} from './session-state.ts';
import {
  advanceDisplayedCompassHeading,
  advanceCompassState,
  drawCompassDial,
  easeAngle,
  formatCompassHeading,
  getCompassDialFacingAngle,
  getCompassDialInteractionMode,
  getCompassDialRadius,
  getCompassHeadingDragPreview,
  getCompassWobbleBoost,
  isCompassHeadingDragSignificant,
  resolveCompassHeadingRelease,
  shouldToggleCompassHeading,
} from './compass.ts';
import {
  getFrameLoopActivity,
  shouldContinueFrameLoop,
} from './frame-loop.ts';
import {
  getNextCelestialEventMode,
  getNextInspectorTab,
  getNextModelPreviewMode,
  isInspectorSectionVisible,
  isModelPreviewVisible,
  getTimePresetProgress,
} from './time-controls.ts';

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
          <div id="viewport-hud" class="viewport-hud"></div>
        </div>
      </div>
      <aside class="sidebar">
        <div class="card">
          <h2>Content Packs</h2>
          <form id="content-pack-form" class="pack-form"></form>
        </div>
        <div class="card" id="celestial-tools-card">
          <div class="inspector-header">
            <div class="inspector-tabs" role="tablist" aria-label="Celestial tools">
              <button
                id="tab-timekeeper"
                class="inspector-tab is-active"
                type="button"
                role="tab"
                aria-selected="true"
                aria-controls="panel-timekeeper"
              >
                Timekeeper
              </button>
              <button
                id="tab-model"
                class="inspector-tab"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="panel-model"
              >
                Model
              </button>
              <button
                id="tab-events"
                class="inspector-tab"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="panel-events"
              >
                Events
              </button>
              <button
                id="tab-compass"
                class="inspector-tab"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="panel-compass"
              >
                Compass
              </button>
            </div>
          </div>
          <section id="panel-timekeeper" class="inspector-panel" role="tabpanel">
            <canvas id="time-wheel" width="320" height="320"></canvas>
            <div class="time-toggle-row">
              <button id="time-freeze-toggle" type="button">Freeze Time</button>
            </div>
            <div class="time-skip-controls">
              <button id="time-plus-hour" type="button">+1h</button>
              <button id="time-plus-six" type="button">+6h</button>
              <button id="time-plus-twelve" type="button">+12h</button>
              <button id="time-plus-day" type="button">+1d</button>
            </div>
            <div class="time-skip-controls">
              <button id="time-minus-season" type="button">Prev Season</button>
              <button id="time-plus-season" type="button">Next Season</button>
            </div>
            <div class="time-presets">
              <button data-time-preset="dawn" type="button">Sunrise</button>
              <button data-time-preset="noon" type="button">Noon</button>
              <button data-time-preset="dusk" type="button">Sunset</button>
              <button data-time-preset="midnight" type="button">Midnight</button>
            </div>
          </section>
          <section
            id="panel-model"
            class="inspector-panel is-hidden"
            role="tabpanel"
            aria-hidden="true"
            hidden
          >
            <div class="model-preview-mode-row" role="tablist" aria-label="Model preview mode">
              <button
                id="model-preview-world"
                class="model-preview-mode-button is-active"
                type="button"
              >
                World
              </button>
              <button
                id="model-preview-solar"
                class="model-preview-mode-button"
                type="button"
              >
                Solar System
              </button>
              <button
                id="model-preview-split"
                class="model-preview-mode-button"
                type="button"
              >
                Both
              </button>
            </div>
            <div class="model-preview-grid">
              <div id="model-preview-card-world" class="model-preview-card">
                <div id="celestial-preview" class="celestial-preview"></div>
                <p class="inspector-note">
                  Drag to rotate the world model. Seasonal and daily changes stay synced here too.
                </p>
              </div>
              <div id="model-preview-card-solar" class="model-preview-card">
                <div id="solar-system-preview" class="celestial-preview solar-system-preview"></div>
                <p class="inspector-note">
                  A separate orrery view tracks the sun, moon, planets, constellations, and Milky Way around the current sky state.
                </p>
              </div>
            </div>
            <div class="time-skip-controls">
              <button id="model-minus-season" type="button">Prev Season</button>
              <button id="model-plus-season" type="button">Next Season</button>
            </div>
            <div class="time-skip-controls">
              <button id="model-minus-day" type="button">-1d</button>
              <button id="model-plus-day" type="button">+1d</button>
              <button id="model-minus-hour" type="button">-1h</button>
              <button id="model-plus-hour" type="button">+1h</button>
            </div>
          </section>
          <section
            id="panel-events"
            class="inspector-panel is-hidden"
            role="tabpanel"
            aria-hidden="true"
            hidden
          >
            <div class="event-mode-grid">
              <button id="event-mode-auto" class="event-mode-button is-active" type="button">
                Auto
              </button>
              <button id="event-mode-aurora" class="event-mode-button" type="button">
                Aurora
              </button>
              <button id="event-mode-meteor-shower" class="event-mode-button" type="button">
                Meteor Shower
              </button>
              <button id="event-mode-comet" class="event-mode-button" type="button">
                Comet
              </button>
            </div>
            <div id="event-summary" class="event-summary" aria-live="polite"></div>
            <p class="inspector-note">
              Trigger celestial plugin events instantly, even when the sky would not naturally show them.
            </p>
          </section>
          <section
            id="panel-compass"
            class="inspector-panel is-hidden"
            role="tabpanel"
            aria-hidden="true"
            hidden
          >
            <canvas id="compass-dial" class="compass-dial" width="320" height="320"></canvas>
            <p class="inspector-note">
              The needle eases into place as you turn, then settles back onto north.
            </p>
            <div class="time-skip-controls">
              <button id="face-north" type="button">North</button>
              <button id="face-east" type="button">East</button>
              <button id="face-south" type="button">South</button>
              <button id="face-west" type="button">West</button>
            </div>
          </section>
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
const viewportHud = document.querySelector<HTMLElement>('#viewport-hud');
const atlasCanvas = document.querySelector<HTMLCanvasElement>('#atlas');
const timeWheelCanvas =
  document.querySelector<HTMLCanvasElement>('#time-wheel');
const celestialPreviewHost =
  document.querySelector<HTMLElement>('#celestial-preview');
const solarSystemPreviewHost =
  document.querySelector<HTMLElement>('#solar-system-preview');
const compassDialCanvas =
  document.querySelector<HTMLCanvasElement>('#compass-dial');
const faceNorthButton =
  document.querySelector<HTMLButtonElement>('#face-north');
const faceEastButton =
  document.querySelector<HTMLButtonElement>('#face-east');
const faceSouthButton =
  document.querySelector<HTMLButtonElement>('#face-south');
const faceWestButton =
  document.querySelector<HTMLButtonElement>('#face-west');
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
const minusSeasonButton =
  document.querySelector<HTMLButtonElement>('#time-minus-season');
const plusSeasonButton =
  document.querySelector<HTMLButtonElement>('#time-plus-season');
const modelPlusDayButton =
  document.querySelector<HTMLButtonElement>('#model-plus-day');
const modelMinusDayButton =
  document.querySelector<HTMLButtonElement>('#model-minus-day');
const modelPlusHourButton =
  document.querySelector<HTMLButtonElement>('#model-plus-hour');
const modelMinusHourButton =
  document.querySelector<HTMLButtonElement>('#model-minus-hour');
const modelMinusSeasonButton =
  document.querySelector<HTMLButtonElement>('#model-minus-season');
const modelPlusSeasonButton =
  document.querySelector<HTMLButtonElement>('#model-plus-season');
const modelPreviewWorldButton =
  document.querySelector<HTMLButtonElement>('#model-preview-world');
const modelPreviewSolarButton =
  document.querySelector<HTMLButtonElement>('#model-preview-solar');
const modelPreviewSplitButton =
  document.querySelector<HTMLButtonElement>('#model-preview-split');
const eventModeAutoButton =
  document.querySelector<HTMLButtonElement>('#event-mode-auto');
const eventModeAuroraButton =
  document.querySelector<HTMLButtonElement>('#event-mode-aurora');
const eventModeMeteorButton =
  document.querySelector<HTMLButtonElement>('#event-mode-meteor-shower');
const eventModeCometButton =
  document.querySelector<HTMLButtonElement>('#event-mode-comet');
const modelPreviewGrid =
  document.querySelector<HTMLElement>('.model-preview-grid');
const modelPreviewWorldCard =
  document.querySelector<HTMLElement>('#model-preview-card-world');
const modelPreviewSolarCard =
  document.querySelector<HTMLElement>('#model-preview-card-solar');
const eventSummary =
  document.querySelector<HTMLElement>('#event-summary');
const freezeTimeButton =
  document.querySelector<HTMLButtonElement>('#time-freeze-toggle');
const celestialToolsCard =
  document.querySelector<HTMLElement>('#celestial-tools-card');
const inspectorTabButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('.inspector-tab')
);
const sidebarCards = Array.from(
  document.querySelectorAll<HTMLElement>('.sidebar > .card')
);
const inspectorPanels = {
  timekeeper: document.querySelector<HTMLElement>('#panel-timekeeper'),
  model: document.querySelector<HTMLElement>('#panel-model'),
  events: document.querySelector<HTMLElement>('#panel-events'),
  compass: document.querySelector<HTMLElement>('#panel-compass'),
};
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

const dialState = {
  dayProgress: 0,
  yearProgress: 0,
  moonPhaseProgress: 0,
  sunriseProgress: 0,
  sunsetProgress: 0,
  daylightDuration: 0,
  initialized: false,
};
const compassState = {
  angle: 0,
  velocity: 0,
  initialized: false,
};
const compassHeadingState = {
  angle:
    typeof savedSession?.compassHeadingAngle === 'number'
      ? savedSession.compassHeadingAngle
      : null,
};
const compassHeadingVisualState = {
  angle:
    typeof savedSession?.compassHeadingAngle === 'number'
      ? savedSession.compassHeadingAngle
      : null,
};
const compassDialPointerState = {
  draggingMode: null as null | 'heading-bug' | 'facing',
  pointerId: -1,
  startHeadingAngle: null as number | null,
  startPointerAngle: 0,
  draggedHeading: false,
};
const MOON_PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
] as const;
const MOON_PHASE_ILLUMINATIONS = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25] as const;

drawAtlas(atlasCanvas.getContext('2d'));
const renderer3d = create3DRenderer(viewport3d);
const celestialPreview = createCelestialPreviewRenderer(celestialPreviewHost, {
  onRenderRequested: () => requestRender(),
});
const solarSystemPreview = createSolarSystemPreviewRenderer(solarSystemPreviewHost, {
  onRenderRequested: () => requestRender(),
});
let activeInspectorTab = getNextInspectorTab(savedSession?.inspectorTab);
let activeModelPreviewMode = getNextModelPreviewMode(savedSession?.modelPreviewMode);
const celestialEventModeState = {
  mode: getNextCelestialEventMode(savedSession?.celestialEventMode),
};

(state as typeof state & { celestialEventMode?: string }).celestialEventMode =
  celestialEventModeState.mode;

const keys = new Set<string>();

renderContentPackControls();
updateContentPackLabel();
updateFreezeTimeButton();

function updateStatus(
  environment: WorldEnvironmentLike = getCurrentEnvironment(),
  cycle = getCurrentCycle(environment)
) {
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
    <div><dt>Date</dt><dd>${getCelestialDateLabel(cycle)}</dd></div>
    <div><dt>Cycle</dt><dd>${timeState.frozen ? 'Frozen' : 'Running'}</dd></div>
    <div><dt>Season</dt><dd>${cycle.activeConstellation.name}</dd></div>
    <div><dt>Moon</dt><dd>${cycle.moonPhaseName}</dd></div>
    <div><dt>Event Mode</dt><dd>${formatCelestialEventModeLabel(celestialEventModeState.mode)}</dd></div>
    <div><dt>Events</dt><dd>${describeActiveCelestialEvents(cycle)}</dd></div>
    <div><dt>Sunrise</dt><dd>${cardinalFromAngle(cycle.sunriseAzimuth)}</dd></div>
    <div><dt>Depth</dt><dd>${context.depth}</dd></div>
    <div><dt>Hint</dt><dd>${tile.note ?? 'Explore the frontier.'}</dd></div>
  `;

  if (viewportHud) {
    const showViewportCompass = isInspectorSectionVisible(
      activeInspectorTab,
      'viewport-compass'
    );
    viewportHud.innerHTML = `
      <div class="viewport-hud-label">${formatCycleTime(cycle.dayProgress)}</div>
      <div class="viewport-hud-date">${getCelestialDateLabel(cycle)}</div>
      <div class="viewport-hud-meta">${cycle.activeConstellation.name} • ${cycle.moonPhaseName}</div>
      <div class="viewport-hud-meta">Facing ${facing}</div>
      <div class="viewport-hud-meta">${formatCompassHeading(compassHeadingState.angle)}</div>
      <div class="viewport-hud-meta">${describeActiveCelestialEvents(cycle)}</div>
      ${
        showViewportCompass
          ? `<div class="viewport-hud-compass">${renderCompass(facing)}</div>`
          : ''
      }
    `;
  }
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = viewport2d.getBoundingClientRect();
  viewport2d.width = Math.floor(rect.width * ratio);
  viewport2d.height = Math.floor(rect.height * ratio);
  if (compassDialCanvas) {
    const compassSize = Math.floor(320 * ratio);
    compassDialCanvas.width = compassSize;
    compassDialCanvas.height = compassSize;
    compassDialCanvas.style.width = '100%';
    compassDialCanvas.style.maxWidth = '320px';
  }
  renderer3d.resize(rect.width, rect.height, ratio);
  celestialPreview.resize();
  solarSystemPreview.resize();
}

function updateModelPreviewModeUi() {
  modelPreviewWorldButton?.classList.toggle(
    'is-active',
    activeModelPreviewMode === 'world'
  );
  modelPreviewSolarButton?.classList.toggle(
    'is-active',
    activeModelPreviewMode === 'solar-system'
  );
  modelPreviewSplitButton?.classList.toggle(
    'is-active',
    activeModelPreviewMode === 'split'
  );
  modelPreviewGrid?.classList.toggle(
    'is-world-focused',
    activeModelPreviewMode === 'world'
  );
  modelPreviewGrid?.classList.toggle(
    'is-solar-focused',
    activeModelPreviewMode === 'solar-system'
  );
  const showWorld = isModelPreviewVisible(activeModelPreviewMode, 'world');
  const showSolar = isModelPreviewVisible(activeModelPreviewMode, 'solar-system');
  modelPreviewWorldCard?.classList.toggle('is-hidden', !showWorld);
  modelPreviewSolarCard?.classList.toggle('is-hidden', !showSolar);
  if (modelPreviewWorldCard) {
    modelPreviewWorldCard.hidden = !showWorld;
  }
  if (modelPreviewSolarCard) {
    modelPreviewSolarCard.hidden = !showSolar;
  }
}

function updateCelestialEventModeUi() {
  eventModeAutoButton?.classList.toggle(
    'is-active',
    celestialEventModeState.mode === 'auto'
  );
  eventModeAuroraButton?.classList.toggle(
    'is-active',
    celestialEventModeState.mode === 'aurora'
  );
  eventModeMeteorButton?.classList.toggle(
    'is-active',
    celestialEventModeState.mode === 'meteor-shower'
  );
  eventModeCometButton?.classList.toggle(
    'is-active',
    celestialEventModeState.mode === 'comet'
  );
}

function setModelPreviewMode(mode: 'world' | 'solar-system' | 'split') {
  activeModelPreviewMode = mode;
  updateModelPreviewModeUi();
  saveSession();
  resizeCanvas();
  requestRender();
}

function setCelestialEventMode(modeId: string | undefined) {
  celestialEventModeState.mode = getNextCelestialEventMode(modeId);
  (state as typeof state & { celestialEventMode?: string }).celestialEventMode =
    celestialEventModeState.mode;
  updateCelestialEventModeUi();
  saveSession();
  requestRender();
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
  (state as typeof state & { celestialEventMode?: string }).celestialEventMode =
    celestialEventModeState.mode;
  activePackIds = normalizedPackIds;
  drawAtlas(atlasCanvas.getContext('2d'));
  renderContentPackControls();
  updateContentPackLabel();
  saveSession();
  requestRender();
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
  return applyCelestialEnvironmentOverrides(
    getDaylightCycleState(getCurrentWorldTimeMs(), environment.cycle ?? {}),
    (environment.celestial ?? {}) as any
  );
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
  requestRender();
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
  requestRender();
}

function skipSeasonByCount(seasons: number) {
  const environment = getCurrentEnvironment();
  const nextOffsetMs = advanceWorldTimeOffsetBySeasons(
    timeState.offsetMs,
    seasons,
    environment.cycle ?? {}
  );
  timeState.offsetMs = nextOffsetMs;
  if (timeState.frozen) {
    timeState.frozenWorldTimeMs = getWorldTimeMs(performance.now(), {
      timeOffsetMs: nextOffsetMs,
    });
  }
  saveSession();
  requestRender();
}

function jumpToTimePreset(preset: 'dawn' | 'noon' | 'dusk' | 'midnight') {
  const environment = getCurrentEnvironment();
  const cycle = getCurrentCycle(environment);
  const targetProgress = getTimePresetProgress(cycle, preset);
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
  requestRender();
}

function setInspectorTab(tabId: string | undefined) {
  activeInspectorTab = getNextInspectorTab(tabId);
  inspectorTabButtons.forEach((button) => {
    const isActive = button.id === `tab-${activeInspectorTab}`;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  Object.entries(inspectorPanels).forEach(([panelId, panel]) => {
    const isActive = isInspectorSectionVisible(
      activeInspectorTab,
      panelId as 'timekeeper' | 'model' | 'events' | 'compass'
    );
    panel?.classList.toggle('is-hidden', !isActive);
    panel?.setAttribute('aria-hidden', String(!isActive));
    if (panel) {
      panel.hidden = !isActive;
    }
  });
  sidebarCards.forEach((card) => {
    if (card === celestialToolsCard) {
      card.classList.remove('is-hidden');
      return;
    }
    card.classList.add('is-hidden');
  });
  timeWheelCanvas?.classList.toggle(
    'is-hidden',
    !isInspectorSectionVisible(activeInspectorTab, 'timekeeper')
  );
  if (timeWheelCanvas) {
    timeWheelCanvas.hidden = !isInspectorSectionVisible(activeInspectorTab, 'timekeeper');
  }
  celestialPreviewHost?.classList.toggle(
    'is-hidden',
    !isInspectorSectionVisible(activeInspectorTab, 'model')
  );
  if (celestialPreviewHost) {
    celestialPreviewHost.hidden = !isInspectorSectionVisible(activeInspectorTab, 'model');
  }
  eventSummary?.classList.toggle(
    'is-hidden',
    !isInspectorSectionVisible(activeInspectorTab, 'events')
  );
  if (eventSummary) {
    eventSummary.hidden = !isInspectorSectionVisible(activeInspectorTab, 'events');
  }
  compassDialCanvas?.classList.toggle(
    'is-hidden',
    !isInspectorSectionVisible(activeInspectorTab, 'compass')
  );
  if (compassDialCanvas) {
    compassDialCanvas.hidden = !isInspectorSectionVisible(activeInspectorTab, 'compass');
  }
  saveSession();
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
  requestRender();
}

function jump() {
  if (state.viewMode !== '3d') return;
  if (motion.isJumping) return;
  motion.isJumping = true;
  motion.jumpHeight = 0;
  motion.jumpVelocity = motion.shortJumpVelocity;
  motion.jumpHoldElapsed = 0;
  motion.longJumpActivated = false;
  requestRender();
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
  const actualCycle = applyCelestialEnvironmentOverrides(
    getDaylightCycleState(timeMs, environment.cycle ?? {}),
    (environment.celestial ?? {}) as any
  );
  const displayCycle = updateDisplayedCycle(actualCycle);
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

  drawTimeWheel(timeWheelCanvas, displayCycle);
  celestialPreview.render(displayCycle, environment, state.player.facing, generator);
  solarSystemPreview.render(displayCycle);
  if (eventSummary) {
    const eventDetails = getActiveCelestialEventDetails(displayCycle);
    eventSummary.innerHTML = `
      <div class="event-summary-label">Mode: ${formatCelestialEventModeLabel(celestialEventModeState.mode)}</div>
      <div class="event-summary-active">${describeActiveCelestialEvents(displayCycle)}</div>
      <div class="event-summary-chips">
        ${eventDetails
          .map(
            (detail) =>
              `<span class="event-summary-chip event-summary-chip-${detail.kind}">${detail.label}</span>`
          )
          .join('')}
      </div>
    `;
  }
  drawCompassDial(
    compassDialCanvas,
    updateDisplayedCompass(state.player.facing),
    updateDisplayedCompassHeading(
      compassHeadingState.angle,
      compassDialPointerState.draggingMode === 'heading-bug'
    )
  );
  updateStatus(environment, displayCycle);
  return getFrameLoopActivity({
    timeFrozen: timeState.frozen,
    keys,
    isJumping: motion.isJumping,
    compassVelocity: compassState.velocity,
    headingVisualAngle: compassHeadingVisualState.angle,
    headingTargetAngle: compassHeadingState.angle,
    previewInteracting:
      celestialPreview.isInteracting() || solarSystemPreview.isInteracting(),
    compassDragging: compassDialPointerState.draggingMode !== null,
    displayedCycle: {
      dayProgress: displayCycle.dayProgress,
      yearProgress: displayCycle.yearProgress,
      moonMidnightOrbitProgress: displayCycle.moonMidnightOrbitProgress,
      sunriseProgress: displayCycle.sunriseProgress,
      sunsetProgress: displayCycle.sunsetProgress,
      daylightDuration: displayCycle.daylightDuration,
    },
    actualCycle: {
      dayProgress: actualCycle.dayProgress,
      yearProgress: actualCycle.yearProgress,
      moonMidnightOrbitProgress: actualCycle.moonMidnightOrbitProgress,
      sunriseProgress: actualCycle.sunriseProgress,
      sunsetProgress: actualCycle.sunsetProgress,
      daylightDuration: actualCycle.daylightDuration,
    },
  });
}

let lastFrame = 0;
let pendingFrameHandle = 0;

function requestRender() {
  if (pendingFrameHandle !== 0) {
    return;
  }
  pendingFrameHandle = requestAnimationFrame(loop);
}

function formatCycleTime(dayProgress: number) {
  const totalMinutes = Math.floor(dayProgress * 24 * 60);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function renderCompass(facing: string) {
  return ['N', 'E', 'S', 'W']
    .map((direction) =>
      direction === facing
        ? `<span class="is-active">${direction}</span>`
        : `<span>${direction}</span>`
    )
    .join('');
}

function formatCelestialEventModeLabel(mode: string) {
  if (mode === 'aurora') {
    return 'Aurora';
  }
  if (mode === 'meteor-shower') {
    return 'Meteor Shower';
  }
  if (mode === 'comet') {
    return 'Comet';
  }
  return 'Auto';
}

function describeActiveCelestialEvents(
  cycle: ReturnType<typeof getDaylightCycleState> & {
    auroraBands?: Array<{ intensity: number }>;
    visibleEvents?: Array<{ type?: string; visibility?: number }>;
  }
) {
  const activeEvents: string[] = [];
  if ((cycle.auroraBands ?? []).some((band) => band.intensity > 0.03)) {
    activeEvents.push('Aurora active');
  }
  if (
    (cycle.visibleEvents ?? []).some(
      (event) =>
        event.type === 'meteor-shower' && (event.visibility ?? 0) > 0.03
    )
  ) {
    activeEvents.push('Meteor shower visible');
  }
  if (
    (cycle.visibleEvents ?? []).some(
      (event) => event.type === 'comet' && (event.visibility ?? 0) > 0.03
    )
  ) {
    activeEvents.push('Comet visible');
  }
  return activeEvents.length > 0 ? activeEvents.join(' • ') : 'No active events';
}

function getActiveCelestialEventDetails(
  cycle: ReturnType<typeof getDaylightCycleState> & {
    auroraBands?: Array<{ intensity: number }>;
    visibleEvents?: Array<{ type?: string; visibility?: number }>;
  }
) {
  const details: Array<{
    kind: 'aurora' | 'meteor-shower' | 'comet' | 'none';
    label: string;
  }> = [];

  const auroraCount = (cycle.auroraBands ?? []).filter(
    (band) => band.intensity > 0.03
  ).length;
  const meteorCount = (cycle.visibleEvents ?? []).filter(
    (event) =>
      event.type === 'meteor-shower' && (event.visibility ?? 0) > 0.03
  ).length;
  const cometCount = (cycle.visibleEvents ?? []).filter(
    (event) => event.type === 'comet' && (event.visibility ?? 0) > 0.03
  ).length;

  if (auroraCount > 0) {
    details.push({
      kind: 'aurora',
      label: `${auroraCount} aurora band${auroraCount === 1 ? '' : 's'}`,
    });
  }
  if (meteorCount > 0) {
    details.push({
      kind: 'meteor-shower',
      label: `${meteorCount} meteor stream${meteorCount === 1 ? '' : 's'}`,
    });
  }
  if (cometCount > 0) {
    details.push({
      kind: 'comet',
      label: `${cometCount} comet trail${cometCount === 1 ? '' : 's'}`,
    });
  }

  if (details.length === 0) {
    details.push({
      kind: 'none',
      label: 'Switch to Model to inspect sky changes',
    });
  }

  return details;
}

function updateDisplayedCycle(cycle: ReturnType<typeof getDaylightCycleState>) {
  if (!dialState.initialized) {
    dialState.dayProgress = cycle.dayProgress;
    dialState.yearProgress = cycle.yearProgress;
    dialState.moonPhaseProgress = getMoonMidnightOrbitProgress(cycle);
    dialState.sunriseProgress = cycle.sunriseProgress;
    dialState.sunsetProgress = cycle.sunsetProgress;
    dialState.daylightDuration = cycle.daylightDuration;
    dialState.initialized = true;
  } else {
    dialState.dayProgress = easeWrappedProgress(
      dialState.dayProgress,
      cycle.dayProgress,
      0.16
    );
    dialState.yearProgress = easeWrappedProgress(
      dialState.yearProgress,
      cycle.yearProgress,
      0.14
    );
    dialState.moonPhaseProgress = easeWrappedProgress(
      dialState.moonPhaseProgress,
      getMoonMidnightOrbitProgress(cycle),
      0.18
    );
    dialState.sunriseProgress = easeWrappedProgress(
      dialState.sunriseProgress,
      cycle.sunriseProgress,
      0.12
    );
    dialState.sunsetProgress = easeWrappedProgress(
      dialState.sunsetProgress,
      cycle.sunsetProgress,
      0.12
    );
    dialState.daylightDuration +=
      (cycle.daylightDuration - dialState.daylightDuration) * 0.12;
  }

  const stabilizedAnchors = stabilizeDisplayedDaylightAnchors(cycle, {
    dayProgress: dialState.dayProgress,
    sunriseProgress: dialState.sunriseProgress,
    sunsetProgress: dialState.sunsetProgress,
  });
  dialState.sunriseProgress = stabilizedAnchors.sunriseProgress;
  dialState.sunsetProgress = stabilizedAnchors.sunsetProgress;

  const moonPhaseIndex = Math.round((dialState.moonPhaseProgress % 1) * 8) % 8;
  const constellationCount = Math.max(1, cycle.constellations.length);
  const activeConstellationIndex =
    Math.floor(dialState.yearProgress * constellationCount) % constellationCount;
  return {
    ...cycle,
    dayProgress: dialState.dayProgress,
    yearProgress: dialState.yearProgress,
    moonMidnightAngle: dialState.moonPhaseProgress * Math.PI * 2 - Math.PI / 2,
    moonMidnightOrbitProgress: dialState.moonPhaseProgress,
    sunriseProgress: dialState.sunriseProgress,
    sunsetProgress: dialState.sunsetProgress,
    daylightDuration: dialState.daylightDuration,
    moonPhaseIndex,
    moonPhaseName: MOON_PHASE_NAMES[moonPhaseIndex],
    moonIllumination: MOON_PHASE_ILLUMINATIONS[moonPhaseIndex],
    activeConstellationIndex,
    activeConstellation: cycle.constellations[activeConstellationIndex],
  };
}

function easeWrappedProgress(current: number, target: number, factor: number) {
  let delta = target - current;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  const next = current + delta * factor;
  return ((next % 1) + 1) % 1;
}

function updateDisplayedCompass(targetAngle: number) {
  const next = advanceCompassState(compassState, targetAngle);
  compassState.angle = next.angle;
  compassState.velocity = next.velocity;
  compassState.initialized = next.initialized;
  return compassState.angle;
}

function updateDisplayedCompassHeading(
  targetHeadingAngle: number | null,
  draggingHeading: boolean
) {
  compassHeadingVisualState.angle = advanceDisplayedCompassHeading(
    compassHeadingVisualState.angle,
    targetHeadingAngle,
    draggingHeading
  );
  return compassHeadingVisualState.angle;
}

function faceDirection(angle: number) {
  if (compassState.initialized) {
    compassState.velocity += getCompassWobbleBoost(compassState.angle, angle);
  }
  state.player.facing = normalizeAngle(angle);
  saveSession();
  requestRender();
}

function loop(timestamp) {
  pendingFrameHandle = 0;
  const delta =
    lastFrame === 0 ? 16.67 : Math.min(timestamp - lastFrame, 33.34);
  updateMovement(delta);
  const activity = render();
  lastFrame = timestamp;
  if (shouldContinueFrameLoop(activity)) {
    requestRender();
    return;
  }
  lastFrame = 0;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  requestRender();
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
  requestRender();

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
  requestRender();
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
minusSeasonButton?.addEventListener('click', () => skipSeasonByCount(-1));
plusSeasonButton?.addEventListener('click', () => skipSeasonByCount(1));
modelPlusDayButton?.addEventListener('click', () => skipTimeByHours(24));
modelMinusDayButton?.addEventListener('click', () => skipTimeByHours(-24));
modelPlusHourButton?.addEventListener('click', () => skipTimeByHours(1));
modelMinusHourButton?.addEventListener('click', () => skipTimeByHours(-1));
modelMinusSeasonButton?.addEventListener('click', () => skipSeasonByCount(-1));
modelPlusSeasonButton?.addEventListener('click', () => skipSeasonByCount(1));
modelPreviewWorldButton?.addEventListener('click', () => setModelPreviewMode('world'));
modelPreviewSolarButton?.addEventListener('click', () => setModelPreviewMode('solar-system'));
modelPreviewSplitButton?.addEventListener('click', () => setModelPreviewMode('split'));
eventModeAutoButton?.addEventListener('click', () => setCelestialEventMode('auto'));
eventModeAuroraButton?.addEventListener('click', () => setCelestialEventMode('aurora'));
eventModeMeteorButton?.addEventListener('click', () => setCelestialEventMode('meteor-shower'));
eventModeCometButton?.addEventListener('click', () => setCelestialEventMode('comet'));
freezeTimeButton?.addEventListener('click', toggleTimeFreeze);
inspectorTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setInspectorTab(button.id.replace('tab-', ''));
  });
});
faceNorthButton?.addEventListener('click', () => faceDirection(-Math.PI / 2));
faceEastButton?.addEventListener('click', () => faceDirection(0));
faceSouthButton?.addEventListener('click', () => faceDirection(Math.PI / 2));
faceWestButton?.addEventListener('click', () => faceDirection(Math.PI));
compassDialCanvas?.addEventListener('pointerdown', (event) => {
  const rect = compassDialCanvas.getBoundingClientRect();
  const pointX = event.clientX - rect.left;
  const pointY = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const radius = getCompassDialRadius(rect.width, rect.height);
  const angle = getCompassDialFacingAngle(pointX, pointY, centerX, centerY);
  const interactionMode = getCompassDialInteractionMode(
    pointX,
    pointY,
    centerX,
    centerY,
    radius
  );
  if (interactionMode === 'none') {
    return;
  }
  compassDialPointerState.draggingMode = interactionMode;
  compassDialPointerState.pointerId = event.pointerId;
  compassDialPointerState.startHeadingAngle = compassHeadingState.angle;
  compassDialPointerState.startPointerAngle = angle;
  compassDialPointerState.draggedHeading = false;
  compassDialCanvas.setPointerCapture(event.pointerId);
  if (
    interactionMode === 'heading-bug' &&
    typeof compassHeadingState.angle !== 'number'
  ) {
    compassHeadingState.angle = angle;
    requestRender();
  }
});

compassDialCanvas?.addEventListener('pointermove', (event) => {
  if (
    compassDialPointerState.draggingMode !== 'heading-bug' ||
    event.pointerId !== compassDialPointerState.pointerId
  ) {
    return;
  }
  const rect = compassDialCanvas.getBoundingClientRect();
  const pointX = event.clientX - rect.left;
  const pointY = event.clientY - rect.top;
  const angle = getCompassDialFacingAngle(
    pointX,
    pointY,
    rect.width / 2,
    rect.height / 2
  );
  const preview = getCompassHeadingDragPreview(
    compassDialPointerState.startPointerAngle,
    angle,
    compassDialPointerState.draggedHeading
  );
  compassDialPointerState.draggedHeading = preview.draggedHeading;
  compassHeadingState.angle = preview.headingAngle;
  requestRender();
});

const releaseCompassDialPointer = (event: PointerEvent) => {
  if (event.pointerId !== compassDialPointerState.pointerId) {
    return;
  }
  const draggingMode = compassDialPointerState.draggingMode;
  const startHeadingAngle = compassDialPointerState.startHeadingAngle;
  const draggedHeading = compassDialPointerState.draggedHeading;
  compassDialPointerState.draggingMode = null;
  compassDialPointerState.pointerId = -1;
  compassDialPointerState.startHeadingAngle = null;
  compassDialPointerState.draggedHeading = false;
  if (compassDialCanvas.hasPointerCapture(event.pointerId)) {
    compassDialCanvas.releasePointerCapture(event.pointerId);
  }

  const rect = compassDialCanvas.getBoundingClientRect();
  const pointX = event.clientX - rect.left;
  const pointY = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const radius = getCompassDialRadius(rect.width, rect.height);
  const angle = getCompassDialFacingAngle(pointX, pointY, centerX, centerY);
  const interactionMode = getCompassDialInteractionMode(
    pointX,
    pointY,
    centerX,
    centerY,
    radius
  );

  if (draggingMode === 'heading-bug') {
    compassHeadingState.angle = resolveCompassHeadingRelease(
      startHeadingAngle,
      angle,
      draggedHeading
    );
    saveSession();
    requestRender();
    return;
  }

  if (draggingMode === 'facing' && interactionMode === 'facing') {
    faceDirection(angle);
  }
};

compassDialCanvas?.addEventListener('pointerup', releaseCompassDialPointer);
compassDialCanvas?.addEventListener('pointercancel', releaseCompassDialPointer);
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
setInspectorTab(activeInspectorTab);
updateModelPreviewModeUi();
updateCelestialEventModeUi();
requestRender();

function saveSession() {
  try {
    const snapshot = serializeSessionSnapshot({
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
      inspectorTab: activeInspectorTab,
      modelPreviewMode: activeModelPreviewMode,
      celestialEventMode: celestialEventModeState.mode,
      compassHeadingAngle: compassHeadingState.angle,
    });
    if (snapshot === lastSavedSnapshot) return;
    window.localStorage.setItem(STORAGE_KEY, snapshot);
    lastSavedSnapshot = snapshot;
  } catch {
    // Ignore storage write failures so play continues normally.
  }
}

function loadSession() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = parseSavedSession(raw);
  if (!parsed) {
    return null;
  }
  lastSavedSnapshot = raw ?? '';
  return parsed;
}
