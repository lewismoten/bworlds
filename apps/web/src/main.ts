import { drawAtlas } from '@bworlds/atlas';
import appPackage from '../package.json';
import {
  advanceWorldTimeOffsetByHours,
  advanceWorldTimeOffsetBySeasons,
  applyCelestialEnvironmentOverrides,
  alignWorldTimeOffsetToDayProgress,
  clamp,
  getWorldTimeMs,
  getDaylightCycleState,
  HALF_WORLD_TILES,
  cardinalFromAngle,
  normalizeAngle,
  snapWorldCoordinate,
  toGps,
} from '@bworlds/core';
import { buildTextViewportGrid, render2D } from '@bworlds/render2d';
import {
  clampCameraPitch,
  create3DRenderer,
  DEFAULT_CAMERA_PITCH,
  getLodThresholdSummary,
} from '@bworlds/render3d';
import {
  buildPlayerPoi,
  listPlayerPlacedPois,
  setPlayerPlacedPois,
  type PlayerPlacedPoiLike,
} from '@bworlds/runtime-player-poi';
import {
  createBuiltinContentPackCatalog,
  createWorldRuntime,
} from '@bworlds/worldgen';
import { registerHashSeed } from '@bworlds/core/hash';
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
  createLocalCharacterStorage,
  serializeCharacterProfile,
  type SavedCharacterProfile,
  type CharacterProfileSnapshot,
} from './character-storage.ts';
import {
  ensurePlayerCharacterRoster,
  syncPrimaryPlayerCharacter,
  type PlayerCharacterRosterSnapshot,
} from './player-character-roster.ts';
import {
  createLocalInventoryStorage,
  serializeInventoryProfile,
  type SavedInventoryProfile,
  type InventoryProfileSnapshot,
} from './inventory-storage.ts';
import {
  formatWorldMapPoiPublishPrompt,
  createWorldMapStorageCoordinator,
  createLocalWorldMapStorage,
  normalizePreferredWorldMapServerIds,
  serializeWorldMapProfile,
  type SavedWorldMapProfile,
  type WorldMapProfileSnapshot,
} from './world-map-storage.ts';
import {
  parseSavedSession,
  serializeSessionSnapshot,
} from './session-state.ts';
import {
  DEFAULT_AUDIO_PREFERENCES,
  formatMusicToggleLabel,
  formatSoundToggleLabel,
  normalizeAudioPreferences,
  toggleAudioPreference,
} from './audio-preferences.ts';
import {
  createEnabledMusicController,
  createEnabledSoundEffectController,
} from './audio-controller-gates.ts';
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
  shouldAdvanceSimulation,
} from './frame-loop.ts';
import { runAnimationFrameStep } from './frame-scheduler.ts';
import {
  advanceHeadBobState,
  DEFAULT_HEAD_BOB_STATE,
} from './head-bob.ts';
import {
  buildDebugMarkup,
  type DebugSnapshot,
  getHeapGrowthWarning,
  getIdleAllocationWarning,
  getMaterialGrowthWarning,
  getPerformanceWarnings,
  getRenderBudgetViolationWarnings,
  getSceneBudgetWarnings,
  getSynchronousTileBuildWarnings,
  getStationaryTileBuildWarning,
  getUnloadedRegionWarnings,
  getWorkQueueWarnings,
  resolvePerformanceTier,
  recordHeapUsageSample,
  recordMaterialGrowthSample,
  recordPerformanceHistorySample,
  recordRendererChurnSample,
  getDebugSignature,
  normalizeWorldSeed,
} from './debug-panel.ts';
import {
  buildDebugSnapshotExport,
  formatDebugSnapshotFilename,
  type DebugSnapshotRecentEvent,
} from './debug-snapshot.ts';
import { shouldCollectDebugSnapshot } from './debug-sampling.ts';
import { collectGraphicsCapabilities } from './graphics-capabilities.ts';
import {
  findRandomTileDestination,
  listTileTeleportOptions,
} from './debug-teleport.ts';
import { resetStateToOverworld } from './overworld-travel.ts';
import { getDebugWorldStats } from './debug-world-stats.ts';
import {
  advanceRenderBudgetState,
  createRenderBudget,
  DEFAULT_RENDER_BUDGET_STATE,
  getFrameGenerationBudget,
  formatRenderQualityLevel,
  getPendingWorldBuildBudget,
  getRenderBudgetCaps,
  getRenderQualityLevel,
  getRenderQualityLimiters,
} from './render-budget.ts';
import { getMouseLookAngles } from './mouse-look.ts';
import {
  isEditableKeyboardTarget,
  normalizeKeyboardKey,
  shouldPreventDefaultGameplayKey,
  shouldRestoreViewportFocusForGameplayKey,
} from './keyboard-input.ts';
import { getMovementIntent } from './movement-input.ts';
import {
  getHmrNoticeText,
  getHmrNoticeVisibleUntil,
  shouldShowHmrNotice,
} from './hmr-notice.ts';
import {
  restore3dViewportKeyboardFocus,
  restore3dViewportKeyboardFocusOnPointerDown,
  shouldRestore3dViewportKeyboardFocusOnPointerDown,
} from './viewport-focus.ts';
import { getInteractionPromptFromResolvedState } from './interaction-prompt.ts';
import {
  createSoundEffectController,
  createWebAudioSoundEffectSink,
  shouldPlayBlockedMovementSound,
} from './sound-effects.ts';
import { shouldResolve3dSoundContext } from './sound-update-context.ts';
import { createSoundUpdatePayloadBuilder } from './sound-update-payload.ts';
import { findNearestTrafficProfile } from './nearby-traffic.ts';
import {
  getPlayerLevelChange,
  normalizePlayerLevel,
} from './player-progression.ts';
import {
  createMusicController,
  createWebAudioMusicSink,
  resolvePoiMusicMix,
} from './procedural-music.ts';
import { createMusicUpdateGate } from './music-update-gate.ts';
import { createDebouncedPersistence } from './debounced-persistence.ts';
import { createBoundedCache } from './bounded-cache.ts';
import { getPlayerSpatialSummary } from './player-spatial-summary.ts';
import { resolveCompassFrameState } from './compass-frame-state.ts';
import { getNearbyOverworldQueryState } from './nearby-overworld-query.ts';
import {
  buildSextantMarkup,
  buildEventSummaryMarkup,
  buildTextViewportMarkup,
  getCompassMiniSignature,
  getDetailLabels,
  getEventSummarySignature,
  getMinimapMiniSignature,
  getSextantSignature,
  getStatusSignature,
  getTextViewportSignature,
  getTimekeeperMiniSignature,
  getViewportHudSignature,
} from './ui-signatures.ts';
import {
  createStatusView,
  createViewportHudView,
} from './status-view.ts';
import {
  cycleViewMode,
  getNextCompassDisplayMode,
  getNextCelestialEventMode,
  getInitialInspectorTab,
  getNextInspectorTab,
  getNextMinimapDisplayMode,
  getNextModelPreviewMode,
  getNextTimekeeperDisplayMode,
  getNextViewMode,
  getViewModeToggleLabel,
  isInspectorSectionVisible,
  isModelPreviewVisible,
  getTimePresetProgress,
} from './time-controls.ts';

type CelestialEnvironmentOverrides = Parameters<
  typeof applyCelestialEnvironmentOverrides
>[1];
type CardinalFacing = ReturnType<typeof cardinalFromAngle>;
type CompassDisplayMode = ReturnType<typeof getNextCompassDisplayMode>;
type MinimapDisplayMode = ReturnType<typeof getNextMinimapDisplayMode>;
type ModelPreviewMode = ReturnType<typeof getNextModelPreviewMode>;
type TimekeeperDisplayMode = ReturnType<typeof getNextTimekeeperDisplayMode>;
type CelestialEventMode = ReturnType<typeof getNextCelestialEventMode>;
type InspectorTab = ReturnType<typeof getNextInspectorTab>;
type WorldPoint = {
  x: number;
  y: number;
};
type DisplayedCycle = ReturnType<typeof getDaylightCycleState> & {
  moonMidnightAngle: number;
  moonMidnightOrbitProgress: number;
  moonPhaseIndex: number;
  moonPhaseName: string;
  moonIllumination: number;
  activeConstellationIndex: number;
  activeConstellation:
    | ReturnType<typeof getDaylightCycleState>['constellations'][number]
    | undefined;
};
type FrameLoopActivityLike = ReturnType<typeof getFrameLoopActivity>;
type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

function getInspectionHint(
  state: {
    inspection?: { contextId: string; x: number; y: number; note: string } | null;
    getCurrentContext(): { id: string };
  },
  playerX: number,
  playerY: number
) {
  const inspection = state.inspection;
  if (!inspection) {
    return null;
  }
  if (inspection.contextId !== state.getCurrentContext().id) {
    return null;
  }
  if (
    inspection.x !== snapWorldCoordinate(playerX) ||
    inspection.y !== snapWorldCoordinate(playerY)
  ) {
    return null;
  }
  return inspection.note;
}

const SESSION_STORAGE_KEY = 'bworlds:session';
const CHARACTER_STORAGE_KEY = 'bworlds:character';
const INVENTORY_STORAGE_KEY = 'bworlds:inventory';
const WORLD_MAP_STORAGE_KEY = 'bworlds:world-map';
const DEFAULT_WORLD_SEED = 'bworlds-alpha';
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
        <div
          id="hmr-notice"
          class="hmr-notice is-hidden"
          aria-live="polite"
          hidden
        ></div>
      </div>
      <div class="controls">
        <button id="toggle-view" type="button">Switch to 3D</button>
        <button id="action" type="button">Interact</button>
        <button id="jump-random" type="button">Random Plains</button>
        <button id="jump-home" type="button">Go Home</button>
        <button id="toggle-timekeeper-display" type="button">HUD Time: Time + Date</button>
        <button id="toggle-compass-display" type="button">HUD Compass: Letters</button>
        <button id="toggle-minimap-display" type="button">Mini Map: Hidden</button>
        <button id="toggle-music" type="button">Music: On</button>
        <button id="toggle-sound" type="button">Sound: On</button>
        <button id="zoom-out-minimap" type="button">Map -</button>
        <button id="zoom-in-minimap" type="button">Map +</button>
        <div class="build-controls">
          <select id="build-poi-kind" aria-label="Build point of interest">
            <option value="town">Build Town</option>
            <option value="cave">Build Cave</option>
            <option value="dungeon">Build Dungeon</option>
            <option value="quarry">Build Quarry</option>
            <option value="lighthouse">Build Lighthouse</option>
            <option value="ship">Build Ship</option>
            <option value="observatory">Build Observatory</option>
          </select>
          <button id="build-poi" type="button">Build Here</button>
        </div>
      </div>
    </section>
    <section class="dashboard">
      <div class="viewport-panel">
        <div id="viewport-stage" class="viewport-stage">
          <canvas id="viewport-2d" width="1280" height="720"></canvas>
          <div
            id="viewport-3d"
            class="viewport-3d is-hidden"
            tabindex="0"
            aria-label="3D world view"
            aria-hidden="true"
          ></div>
          <div
            id="viewport-text"
            class="viewport-text is-hidden"
            aria-hidden="true"
            hidden
          ></div>
          <canvas
            id="viewport-timekeeper-mini"
            class="viewport-timekeeper-mini is-hidden"
            width="180"
            height="180"
            aria-hidden="true"
            hidden
          ></canvas>
          <canvas
            id="viewport-compass-mini"
            class="viewport-compass-mini is-hidden"
            width="180"
            height="180"
            aria-hidden="true"
            hidden
          ></canvas>
          <canvas
            id="viewport-minimap-mini"
            class="viewport-minimap-mini is-hidden"
            width="220"
            height="220"
            aria-hidden="true"
            hidden
          ></canvas>
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
              <button
                id="tab-sextant"
                class="inspector-tab"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="panel-sextant"
              >
                Sextant
              </button>
              <button
                id="tab-debug"
                class="inspector-tab"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="panel-debug"
              >
                Debug
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
              <button id="event-mode-eclipse" class="event-mode-button" type="button">
                Eclipse
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
          <section
            id="panel-sextant"
            class="inspector-panel is-hidden"
            role="tabpanel"
            aria-hidden="true"
            hidden
          >
            <dl id="sextant-summary" class="debug-summary"></dl>
            <p class="inspector-note">
              GPS and world coordinates stay in sync with the current player position.
            </p>
          </section>
          <section
            id="panel-debug"
            class="inspector-panel is-hidden"
            role="tabpanel"
            aria-hidden="true"
            hidden
          >
            <div class="debug-seed-controls">
              <input
                id="debug-seed-input"
                class="debug-seed-input"
                type="text"
                spellcheck="false"
                aria-label="World seed"
              />
              <button id="debug-apply-seed" type="button">Apply Seed</button>
              <button id="debug-load-seed" type="button">Load Saved</button>
            </div>
            <div class="debug-seed-controls">
              <select
                id="debug-tile-kind"
                class="debug-seed-input"
                aria-label="Tile kind teleport"
              ></select>
              <button id="debug-teleport-tile" type="button">Jump To Tile</button>
            </div>
            <div class="time-skip-controls">
              <button id="debug-level-down" type="button">Level -</button>
              <button id="debug-level-up" type="button">Level +</button>
              <button id="debug-download-snapshot" type="button">
                Download Debug Snapshot
              </button>
            </div>
            <dl id="debug-summary" class="debug-summary"></dl>
            <p class="inspector-note">
              Applied seeds are saved with the session and restored when you load it again.
            </p>
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
const viewportStage = document.querySelector<HTMLElement>('#viewport-stage');
const viewport3d = document.querySelector<HTMLElement>('#viewport-3d');
const viewportText = document.querySelector<HTMLElement>('#viewport-text');
const viewportHud = document.querySelector<HTMLElement>('#viewport-hud');
const viewportHudView = viewportHud ? createViewportHudView(viewportHud) : null;
const viewportTimekeeperMini =
  document.querySelector<HTMLCanvasElement>('#viewport-timekeeper-mini');
const viewportCompassMini =
  document.querySelector<HTMLCanvasElement>('#viewport-compass-mini');
const viewportMinimapMini =
  document.querySelector<HTMLCanvasElement>('#viewport-minimap-mini');
const hmrNotice = document.querySelector<HTMLElement>('#hmr-notice');
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
const statusView = status ? createStatusView(status) : null;
const toggleButton = document.querySelector<HTMLButtonElement>('#toggle-view');
const toggleTimekeeperDisplayButton =
  document.querySelector<HTMLButtonElement>('#toggle-timekeeper-display');
const toggleCompassDisplayButton =
  document.querySelector<HTMLButtonElement>('#toggle-compass-display');
const toggleMinimapDisplayButton =
  document.querySelector<HTMLButtonElement>('#toggle-minimap-display');
const toggleMusicButton =
  document.querySelector<HTMLButtonElement>('#toggle-music');
const toggleSoundButton =
  document.querySelector<HTMLButtonElement>('#toggle-sound');
const zoomOutMinimapButton =
  document.querySelector<HTMLButtonElement>('#zoom-out-minimap');
const zoomInMinimapButton =
  document.querySelector<HTMLButtonElement>('#zoom-in-minimap');
const actionButton = document.querySelector<HTMLButtonElement>('#action');
const buildPoiButton =
  document.querySelector<HTMLButtonElement>('#build-poi');
const buildPoiKindSelect =
  document.querySelector<HTMLSelectElement>('#build-poi-kind');
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
const eventModeEclipseButton =
  document.querySelector<HTMLButtonElement>('#event-mode-eclipse');
const modelPreviewGrid =
  document.querySelector<HTMLElement>('.model-preview-grid');
const modelPreviewWorldCard =
  document.querySelector<HTMLElement>('#model-preview-card-world');
const modelPreviewSolarCard =
  document.querySelector<HTMLElement>('#model-preview-card-solar');
const eventSummary =
  document.querySelector<HTMLElement>('#event-summary');
const sextantSummary =
  document.querySelector<HTMLElement>('#sextant-summary');
const debugSummary =
  document.querySelector<HTMLElement>('#debug-summary');
const debugSeedInput =
  document.querySelector<HTMLInputElement>('#debug-seed-input');
const debugApplySeedButton =
  document.querySelector<HTMLButtonElement>('#debug-apply-seed');
const debugLoadSeedButton =
  document.querySelector<HTMLButtonElement>('#debug-load-seed');
const debugTileKindSelect =
  document.querySelector<HTMLSelectElement>('#debug-tile-kind');
const debugTeleportTileButton =
  document.querySelector<HTMLButtonElement>('#debug-teleport-tile');
const debugLevelDownButton =
  document.querySelector<HTMLButtonElement>('#debug-level-down');
const debugLevelUpButton =
  document.querySelector<HTMLButtonElement>('#debug-level-up');
const debugDownloadSnapshotButton =
  document.querySelector<HTMLButtonElement>('#debug-download-snapshot');
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
  sextant: document.querySelector<HTMLElement>('#panel-sextant'),
  debug: document.querySelector<HTMLElement>('#panel-debug'),
};
let lastSavedSnapshot = '';
let lastSavedCharacterSnapshot = '';
let lastSavedInventorySnapshot = '';
let lastSavedWorldMapSnapshot = '';
const characterStorage = createLocalCharacterStorage(
  window.localStorage,
  CHARACTER_STORAGE_KEY
);
const inventoryStorage = createLocalInventoryStorage(
  window.localStorage,
  INVENTORY_STORAGE_KEY
);
const localWorldMapStorage = createLocalWorldMapStorage(
  window.localStorage,
  WORLD_MAP_STORAGE_KEY
);
const worldMapStorage = createWorldMapStorageCoordinator({
  settingsStorage: localWorldMapStorage,
  providers: [{ id: 'local', storage: localWorldMapStorage }],
});
const urlSearchParams = new URLSearchParams(window.location.search);

const savedSession = loadSession();
const savedCharacterProfile = loadCharacterProfile(savedSession);
const savedInventoryProfile = loadInventoryProfile(savedSession);
const savedWorldMapProfile = loadWorldMapProfile(savedSession);
const worldMapServerPreferenceState = {
  preferredServerIds: normalizePreferredWorldMapServerIds(
    savedWorldMapProfile?.preferredServerIds ??
      worldMapStorage.getPreferredServerIds?.() ??
      ['local'],
    worldMapStorage.getPreferredServerIds?.() ?? ['local']
  ),
};
let currentWorldSeed = normalizeWorldSeed(
  savedCharacterProfile?.worldSeed ?? savedSession?.worldSeed,
  DEFAULT_WORLD_SEED
);
let currentWorldSeedHash = registerHashSeed(currentWorldSeed);
let activePackIds = normalizeSelectedPackIds(
  savedCharacterProfile?.packIds ?? savedSession?.packIds
);
let runtime = createWorldRuntime({
  seed: currentWorldSeedHash,
  packIds: activePackIds,
  player: savedCharacterProfile?.player ?? savedSession?.player,
  stack: savedCharacterProfile?.stack ?? savedSession?.stack,
  viewMode: getNextViewMode(savedSession?.viewMode),
});
let { contentPacks: activePacks, generator, registry, state } = runtime;
state.playerLevel = normalizePlayerLevel(
  savedCharacterProfile?.playerLevel ?? savedSession?.playerLevel
);
state.playerProfession = savedCharacterProfile?.playerProfession;
state.completedQuestIds = [...(savedCharacterProfile?.completedQuestIds ?? [])];
const characterRosterState = {
  roster: ensurePlayerCharacterRoster(savedCharacterProfile?.characterRoster ?? null, {
    player: savedCharacterProfile?.player ?? savedSession?.player ?? state.player,
    stack: savedCharacterProfile?.stack ?? savedSession?.stack ?? state.stack,
    worldSeed:
      savedCharacterProfile?.worldSeed ??
      savedSession?.worldSeed ??
      DEFAULT_WORLD_SEED,
    playerLevel: normalizePlayerLevel(
      savedCharacterProfile?.playerLevel ?? savedSession?.playerLevel
    ),
    playerProfession: savedCharacterProfile?.playerProfession,
    completedQuestIds: savedCharacterProfile?.completedQuestIds ?? [],
  }),
};
(state as typeof state & {
  characterRoster?: PlayerCharacterRosterSnapshot;
  activeCharacterIds?: string[];
}).characterRoster = characterRosterState.roster;
(state as typeof state & {
  activeCharacterIds?: string[];
}).activeCharacterIds = [...characterRosterState.roster.activeCharacterIds];
state.inventory = [...(savedInventoryProfile?.items ?? savedSession?.inventory ?? [])];
syncPlayerPlacedPoisIntoState(
  savedWorldMapProfile?.playerPlacedPois ??
    savedSession?.worldMapProfile?.playerPlacedPois ??
    savedCharacterProfile?.playerPlacedPois ??
    savedSession?.playerPlacedPois ??
    []
);
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
  headBob: DEFAULT_HEAD_BOB_STATE,
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
const mouseLookState = {
  pitch:
    typeof savedSession?.cameraPitch === 'number'
      ? clampCameraPitch(savedSession.cameraPitch)
      : DEFAULT_CAMERA_PITCH,
  pointerId: -1,
  dragging: false,
  startPointerX: 0,
  startPointerY: 0,
  startFacing: 0,
  startPitch: DEFAULT_CAMERA_PITCH,
};
const nearbyPoiMusicState = {
  cache: createBoundedCache<
    string,
    | null
    | {
        tileKind?: string;
        poiType?: string;
        contextType?: string;
        mix: number;
        clusterX: number;
        clusterY: number;
        emitter: { x: number; y: number };
      }
  >(48),
  profile: null as null | {
    tileKind?: string;
    poiType?: string;
    contextType?: string;
    mix: number;
    clusterX: number;
    clusterY: number;
    emitter: { x: number; y: number };
  },
};
const nearbyTrainAudioState = {
  cache: createBoundedCache<
    string,
    | null
    | {
        progress?: number;
        emitter: { x: number; y: number };
      }
  >(48),
  profile: null as
    | null
    | {
        progress?: number;
        emitter: { x: number; y: number };
      },
};
const nearbyPaddleBoatAudioState = {
  cache: createBoundedCache<
    string,
    | null
    | {
        progress?: number;
        whistlePhase?: 'arrival' | 'departure';
        emitter: { x: number; y: number };
      }
  >(48),
  profile: null as
    | null
    | {
        progress?: number;
        whistlePhase?: 'arrival' | 'departure';
        emitter: { x: number; y: number };
      },
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
const audioPreferenceState = {
  ...normalizeAudioPreferences(savedSession ?? DEFAULT_AUDIO_PREFERENCES),
};
const soundEffects = createEnabledSoundEffectController(
  createSoundEffectController(createWebAudioSoundEffectSink()),
  () => audioPreferenceState.soundEnabled
);
const buildSoundUpdatePayload = createSoundUpdatePayloadBuilder();
const musicController = createEnabledMusicController(
  createMusicController(createWebAudioMusicSink()),
  () => audioPreferenceState.musicEnabled
);
const gateMusicUpdate = createMusicUpdateGate();
const sessionPersistence = createDebouncedPersistence(flushSessionSave);
const celestialPreview = createCelestialPreviewRenderer(celestialPreviewHost, {
  onRenderRequested: () => requestRender(),
});
const solarSystemPreview = createSolarSystemPreviewRenderer(solarSystemPreviewHost, {
  onRenderRequested: () => requestRender(),
});
let activeInspectorTab = getInitialInspectorTab(
  savedSession?.inspectorTab,
  urlSearchParams.get('inspector') ?? undefined
);
let activeModelPreviewMode = getNextModelPreviewMode(savedSession?.modelPreviewMode);
let activeTimekeeperDisplayMode = getNextTimekeeperDisplayMode(
  savedSession?.timekeeperDisplayMode
);
let activeCompassDisplayMode = getNextCompassDisplayMode(
  savedSession?.compassDisplayMode
);
let activeMinimapDisplayMode = getNextMinimapDisplayMode(
  savedSession?.minimapDisplayMode
);
let minimapZoom = clamp(savedSession?.minimapZoom ?? 1, 0.7, 2);
const celestialEventModeState = {
  mode: getNextCelestialEventMode(savedSession?.celestialEventMode),
};
const uiRenderState = {
  lastStatusSignature: '',
  lastStatusUpdateNowMs: Number.NEGATIVE_INFINITY,
  lastViewportHudSignature: '',
  lastViewportHudUpdateNowMs: Number.NEGATIVE_INFINITY,
  lastEventSummarySignature: '',
  lastTextViewportSignature: '',
  lastSextantSignature: '',
  lastDebugSignature: '',
  lastTimekeeperSignature: '',
  lastCompassSignature: '',
  lastTimekeeperMiniSignature: '',
  lastCompassMiniSignature: '',
  lastMinimapMiniSignature: '',
};
const STATUS_DOM_UPDATE_INTERVAL_MS = 250;
const hmrNoticeState = {
  message: '',
  visibleUntilMs: null as number | null,
};
const pageVisibilityState = {
  hidden: typeof document !== 'undefined' ? document.hidden : false,
};
const debugSnapshotState = {
  latestSnapshot: null as DebugSnapshot | null,
  lastSampleNowMs: null as number | null,
};
const MAX_DEBUG_RECENT_EVENTS = 64;
const DEBUG_RECENT_EVENT_WINDOW_MS = 30_000;
const debugRecentEventsState = {
  events: [] as DebugSnapshotRecentEvent[],
};
const debugResourceTrendState = {
  materialSamples: [] as Array<{
    nowMs: number;
    materialCount: number;
    playerX: number;
    playerY: number;
  }>,
  rendererChurnSamples: [] as Array<{
    nowMs: number;
    tileNodeBuildsPerSecond: number;
    playerX: number;
    playerY: number;
  }>,
  heapSamples: [] as Array<{
    nowMs: number;
    heapUsedMb: number;
    playerX: number;
    playerY: number;
  }>,
  performanceSamples: [] as Array<{
    nowMs: number;
    fps: number;
    frameMs: number;
    targetFps: 60 | 30;
    visibilityRadius: number;
    renderQualityLevel: string;
    drawCalls: number;
    triangles: number;
    objectCount: number;
    materialCount: number;
    geometryCount: number;
    heapUsedMb: number | null;
    tileBuildsPerSecond: number;
    lodReplacementsPerSecond: number;
    visibleTileCount: number;
    visibleTreeCount: number;
    activeLightCount: number;
    activeParticleSystemCount?: number;
    activeParticleCount?: number;
    generationQueueSize: number;
  }>,
};
const renderBudgetState = {
  ...DEFAULT_RENDER_BUDGET_STATE,
};
const APP_VERSION = appPackage.version;
const BUILD_ID =
  (import.meta.env as Record<string, string | undefined>).VITE_GIT_COMMIT ?? null;
let latestEnvironment: WorldEnvironmentLike = getCurrentEnvironment();

(state as typeof state & { celestialEventMode?: string }).celestialEventMode =
  celestialEventModeState.mode;

const keys = new Set<string>();

renderContentPackControls();
updateContentPackLabel();
updateFreezeTimeButton();
updateViewModeUi();
updateTimekeeperDisplayModeUi();
updateCompassDisplayModeUi();
updateMinimapDisplayModeUi();
updateAudioPreferenceUi();
if (debugSeedInput) {
  debugSeedInput.value = currentWorldSeed;
}
updateDebugTeleportOptions();

function updateViewModeUi(): void {
  if (toggleButton) {
    toggleButton.textContent = getViewModeToggleLabel(state.viewMode);
  }
}

function updateStatus(
  spatial = getPlayerSpatialSummary(state),
  environment: WorldEnvironmentLike = getCurrentEnvironment(),
  cycle = getCurrentCycle(environment)
) {
  const nowMs = performance.now();
  const tile = spatial.tile;
  const definition = registry.resolveTileDefinition(
    tile.kind,
    state.getTileDefinition(tile.kind)
  );
  const gps = spatial.gps;
  const context = spatial.context;
  const facing = cardinalFromAngle(spatial.facing);
  const gridX = spatial.gridX;
  const gridY = spatial.gridY;
  const timeLabel = formatCycleTime(cycle.dayProgress);
  const dateLabel = getCelestialDateLabel(cycle);
  const cycleLabel = timeState.frozen ? 'Frozen' : 'Running';
  const seasonLabel = cycle.activeConstellation.name;
  const moonLabel = cycle.moonPhaseName;
  const weatherLabel = formatWeatherSummary(environment);
  const forecastLabel = formatForecastSummary(environment);
  const eventModeLabel = formatCelestialEventModeLabel(celestialEventModeState.mode);
  const eventsLabel = describeActiveCelestialEvents(cycle);
  const sunriseLabel = cardinalFromAngle(cycle.sunriseAzimuth);
  const tileLabel = definition?.name ?? tile.kind;
  const playerLevel = normalizePlayerLevel(state.playerLevel);
  const hint =
    getInspectionHint(state, spatial.playerX, spatial.playerY) ??
    tile.note ??
    'Explore the frontier.';
  const interactionPrompt = getInteractionPromptFromResolvedState({
    map: state.getCurrentMap(),
    player: { x: spatial.playerX, y: spatial.playerY },
    tile,
    contextLabel: context.label,
  });
  const statusSignature = getStatusSignature({
    viewMode: state.viewMode,
    playerLevel,
    contextLabel: context.label,
    tileLabel,
    facing,
    playerX: spatial.playerX,
    playerY: spatial.playerY,
    gridX,
    gridY,
    latitude: gps.latitude,
    longitude: gps.longitude,
    timeLabel,
    dateLabel,
    cycleLabel,
    seasonLabel,
    moonLabel,
    weatherLabel,
    forecastLabel,
    eventModeLabel,
    eventsLabel,
    sunriseLabel,
    depth: context.depth,
    hint,
  });
  if (
    statusView &&
    statusSignature !== uiRenderState.lastStatusSignature &&
    nowMs - uiRenderState.lastStatusUpdateNowMs >= STATUS_DOM_UPDATE_INTERVAL_MS
  ) {
    statusView.update({
      viewMode: state.viewMode,
      playerLevel,
      contextLabel: context.label,
      tileLabel,
      facing,
      playerX: spatial.playerX,
      playerY: spatial.playerY,
      gridX,
      gridY,
      latitude: gps.latitude,
      longitude: gps.longitude,
      timeLabel,
      dateLabel,
      cycleLabel,
      seasonLabel,
      moonLabel,
      weatherLabel,
      forecastLabel,
      eventModeLabel,
      eventsLabel,
      sunriseLabel,
      depth: context.depth,
      hint,
    });
    uiRenderState.lastStatusSignature = statusSignature;
    uiRenderState.lastStatusUpdateNowMs = nowMs;
  }

  if (viewportHudView) {
    const showViewportCompass = isInspectorSectionVisible(
      activeInspectorTab,
      'viewport-compass'
    );
    const headingLabel = formatCompassHeading(compassHeadingState.angle);
    const viewportHudSignature = getViewportHudSignature({
      timekeeperDisplayMode: activeTimekeeperDisplayMode,
      compassDisplayMode: activeCompassDisplayMode,
      timeLabel,
      dateLabel,
      facing,
      headingLabel,
      showCompass: showViewportCompass,
      interactionPrompt,
    });
    if (
      viewportHudSignature !== uiRenderState.lastViewportHudSignature &&
      nowMs - uiRenderState.lastViewportHudUpdateNowMs >=
        STATUS_DOM_UPDATE_INTERVAL_MS
    ) {
      viewportHudView.update({
        timekeeperDisplayMode: activeTimekeeperDisplayMode,
        compassDisplayMode: activeCompassDisplayMode,
        timeLabel,
        dateLabel,
        facing,
        headingLabel,
        showCompass: showViewportCompass,
        interactionPrompt,
      });
      uiRenderState.lastViewportHudSignature = viewportHudSignature;
      uiRenderState.lastViewportHudUpdateNowMs = nowMs;
    }
  }

  if (viewportTimekeeperMini) {
    const showGraphicTimekeeper = activeTimekeeperDisplayMode === 'graphical';
    viewportTimekeeperMini.classList.toggle('is-hidden', !showGraphicTimekeeper);
    viewportTimekeeperMini.hidden = !showGraphicTimekeeper;
  }
  if (viewportCompassMini) {
    const showGraphicCompass =
      isInspectorSectionVisible(activeInspectorTab, 'viewport-compass') &&
      activeCompassDisplayMode === 'graphical';
    viewportCompassMini.classList.toggle('is-hidden', !showGraphicCompass);
    viewportCompassMini.hidden = !showGraphicCompass;
  }
  if (viewportMinimapMini) {
    const showMinimap =
      state.viewMode === '3d' && activeMinimapDisplayMode === 'graphical';
    viewportMinimapMini.classList.toggle('is-hidden', !showMinimap);
    viewportMinimapMini.hidden = !showMinimap;
  }
}

function resizeCanvas(): void {
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

function getCurrentRenderScale(
  appliedPixelRatio: number,
  devicePixelRatio: number
): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) {
    return 1;
  }
  return appliedPixelRatio / devicePixelRatio;
}

function updateModelPreviewModeUi(): void {
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

function formatTimekeeperDisplayModeLabel(mode: TimekeeperDisplayMode): string {
  if (mode === 'hidden') return 'None';
  if (mode === 'time') return 'Time';
  if (mode === 'graphical') return 'Graphical';
  return 'Time + Date';
}

function cycleTimekeeperDisplayMode(mode: TimekeeperDisplayMode): TimekeeperDisplayMode {
  if (mode === 'hidden') return 'time';
  if (mode === 'time') return 'time-date';
  if (mode === 'time-date') return 'graphical';
  return 'hidden';
}

function updateTimekeeperDisplayModeUi(): void {
  if (toggleTimekeeperDisplayButton) {
    toggleTimekeeperDisplayButton.textContent = `HUD Time: ${formatTimekeeperDisplayModeLabel(
      activeTimekeeperDisplayMode
    )}`;
  }
}

function formatCompassDisplayModeLabel(mode: CompassDisplayMode): string {
  if (mode === 'hidden') return 'Hidden';
  if (mode === 'graphical') return 'Graphical';
  return 'Letters';
}

function cycleCompassDisplayMode(mode: CompassDisplayMode): CompassDisplayMode {
  if (mode === 'hidden') return 'letters';
  if (mode === 'letters') return 'graphical';
  return 'hidden';
}

function updateCompassDisplayModeUi(): void {
  if (toggleCompassDisplayButton) {
    toggleCompassDisplayButton.textContent = `HUD Compass: ${formatCompassDisplayModeLabel(
      activeCompassDisplayMode
    )}`;
  }
}

function formatMinimapDisplayModeLabel(mode: MinimapDisplayMode): string {
  return mode === 'graphical' ? 'Visible' : 'Hidden';
}

function cycleMinimapDisplayMode(mode: MinimapDisplayMode): MinimapDisplayMode {
  return mode === 'hidden' ? 'graphical' : 'hidden';
}

function updateMinimapDisplayModeUi(): void {
  if (toggleMinimapDisplayButton) {
    toggleMinimapDisplayButton.textContent = `Mini Map: ${formatMinimapDisplayModeLabel(
      activeMinimapDisplayMode
    )}`;
  }
  if (zoomOutMinimapButton) {
    zoomOutMinimapButton.disabled = activeMinimapDisplayMode === 'hidden' || minimapZoom <= 0.7;
  }
  if (zoomInMinimapButton) {
    zoomInMinimapButton.disabled = activeMinimapDisplayMode === 'hidden' || minimapZoom >= 2;
  }
}

function updateAudioPreferenceUi(): void {
  if (toggleMusicButton) {
    toggleMusicButton.textContent = formatMusicToggleLabel(
      audioPreferenceState.musicEnabled
    );
    toggleMusicButton.classList.toggle('is-active', audioPreferenceState.musicEnabled);
  }
  if (toggleSoundButton) {
    toggleSoundButton.textContent = formatSoundToggleLabel(
      audioPreferenceState.soundEnabled
    );
    toggleSoundButton.classList.toggle('is-active', audioPreferenceState.soundEnabled);
  }
}

function toggleAudioPreferenceSetting(
  key: 'musicEnabled' | 'soundEnabled'
): void {
  const nextPreferences = toggleAudioPreference(audioPreferenceState, key);
  audioPreferenceState.musicEnabled = nextPreferences.musicEnabled;
  audioPreferenceState.soundEnabled = nextPreferences.soundEnabled;
  updateAudioPreferenceUi();
  saveSession();
  requestRender();
}

function updateCelestialEventModeUi(): void {
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
  eventModeEclipseButton?.classList.toggle(
    'is-active',
    celestialEventModeState.mode === 'eclipse'
  );
}

function setModelPreviewMode(mode: ModelPreviewMode): void {
  activeModelPreviewMode = mode;
  updateModelPreviewModeUi();
  saveSession();
  resizeCanvas();
  requestRender();
}

function setTimekeeperDisplayMode(modeId: string | undefined): void {
  activeTimekeeperDisplayMode = getNextTimekeeperDisplayMode(modeId);
  updateTimekeeperDisplayModeUi();
  saveSession();
  requestRender();
}

function setCompassDisplayMode(modeId: string | undefined): void {
  activeCompassDisplayMode = getNextCompassDisplayMode(modeId);
  updateCompassDisplayModeUi();
  saveSession();
  requestRender();
}

function setMinimapDisplayMode(modeId: string | undefined): void {
  activeMinimapDisplayMode = getNextMinimapDisplayMode(modeId);
  updateMinimapDisplayModeUi();
  saveSession();
  requestRender();
}

function adjustMinimapZoom(delta: number): void {
  minimapZoom = clamp(Math.round((minimapZoom + delta) * 10) / 10, 0.7, 2);
  updateMinimapDisplayModeUi();
  saveSession();
  requestRender();
}

function setCelestialEventMode(modeId: string | undefined): void {
  celestialEventModeState.mode = getNextCelestialEventMode(modeId);
  (state as typeof state & { celestialEventMode?: string }).celestialEventMode =
    celestialEventModeState.mode;
  updateCelestialEventModeUi();
  saveSession();
  requestRender();
}

function toggleView(): void {
  if (state.viewMode === '3d' && mouseLookState.dragging) {
    mouseLookState.dragging = false;
    mouseLookState.pointerId = -1;
    viewportStage?.classList.remove('is-mouse-looking');
  }
  state.viewMode = cycleViewMode(state.viewMode);
  syncViewportModeUi();
  restore3dViewportKeyboardFocus(state.viewMode, viewport3d);
  saveSession();
  requestRender();
}

function syncViewportModeUi(): void {
  viewport2d.classList.toggle('is-hidden', state.viewMode !== '2d');
  viewport3d.classList.toggle('is-hidden', state.viewMode !== '3d');
  viewportText?.classList.toggle('is-hidden', state.viewMode !== 'text');
  if (viewport3d) {
    viewport3d.setAttribute('aria-hidden', String(state.viewMode !== '3d'));
  }
  if (viewportText) {
    viewportText.hidden = state.viewMode !== 'text';
    viewportText.setAttribute('aria-hidden', String(state.viewMode !== 'text'));
  }
  updateViewModeUi();
}

function updateContentPackLabel(): void {
  if (!contentPackLabel) return;
  contentPackLabel.textContent = `Content Packs: ${activePacks.map((pack) => pack.name).join(' + ')}`;
}

function renderContentPackControls(): void {
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

function rebuildRuntime(nextPackIds: string[]): void {
  const normalizedPackIds = normalizeSelectedPackIds(nextPackIds);
  const placedPois = getSavedPlayerPlacedPois();
  const playerLevel = normalizePlayerLevel(state.playerLevel);
  runtime = createWorldRuntime({
    seed: currentWorldSeedHash,
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
  state.playerLevel = playerLevel;
  syncPlayerPlacedPoisIntoState(placedPois);
  (state as typeof state & { celestialEventMode?: string }).celestialEventMode =
    celestialEventModeState.mode;
  activePackIds = normalizedPackIds;
  drawAtlas(atlasCanvas.getContext('2d'));
  renderContentPackControls();
  updateContentPackLabel();
  updateDebugTeleportOptions();
  saveSession();
  requestRender();
}

function setPlayerLevel(nextLevel: number): void {
  const previousLevel = normalizePlayerLevel(state.playerLevel);
  const normalizedLevel = normalizePlayerLevel(nextLevel);
  const change = getPlayerLevelChange(previousLevel, normalizedLevel);
  if (change === null) {
    return;
  }

  state.playerLevel = normalizedLevel;
  if (change === 'level-up') {
    const position = { x: state.player.x, y: state.player.y };
    soundEffects.triggerProgression({
      nowMs: performance.now(),
      level: normalizedLevel,
      emitter: position,
      listener: position,
    });
  }
  saveSession();
  requestRender();
}

function syncDebugSeedInput(): void {
  if (debugSeedInput && debugSeedInput.value !== currentWorldSeed) {
    debugSeedInput.value = currentWorldSeed;
  }
}

function updateDebugTeleportOptions(): void {
  if (!debugTileKindSelect) {
    return;
  }

  const previousValue = debugTileKindSelect.value;
  const options = listTileTeleportOptions(
    registry.listResolvedTileDefinitions().map(([kind, definition]) => [
      kind,
      {
        name: definition.name,
        walkable: definition.walkable,
      },
    ])
  );

  debugTileKindSelect.innerHTML = options
    .map(
      (option) =>
        `<option value="${option.kind}">${option.label}</option>`
    )
    .join('');

  const hasPreviousValue = options.some((option) => option.kind === previousValue);
  if (hasPreviousValue) {
    debugTileKindSelect.value = previousValue;
  }
}

function applyWorldSeed(seed: string): void {
  const nextSeed = normalizeWorldSeed(seed, DEFAULT_WORLD_SEED);
  if (nextSeed === currentWorldSeed) {
    syncDebugSeedInput();
    requestRender();
    return;
  }
  currentWorldSeed = nextSeed;
  currentWorldSeedHash = registerHashSeed(currentWorldSeed);
  rebuildRuntime(activePackIds);
  syncDebugSeedInput();
  showHmrNotice(`World seed applied: ${currentWorldSeed}`);
}

function loadSavedWorldSeed(): void {
  const profile = characterStorage.loadProfile();
  if (profile) {
    applyWorldSeed(profile.worldSeed ?? DEFAULT_WORLD_SEED);
    return;
  }
  const parsed = parseSavedSession(window.localStorage.getItem(SESSION_STORAGE_KEY));
  applyWorldSeed(parsed?.worldSeed ?? DEFAULT_WORLD_SEED);
}

function collectCurrentDebugSnapshot(
  nowMs: number,
  spatial: ReturnType<typeof getPlayerSpatialSummary>,
  options: {
    recordDiagnostics: boolean;
  }
): DebugSnapshot {
  const rendererStats = renderer3d.getStats();
  const worldStats = getDebugWorldStats(
    state as typeof state & {
      activeCharacterIds?: string[];
      characterRoster?: {
        characters: Array<{
          availability: 'active' | 'available' | 'dropped';
        }>;
      };
    }
  );
  const performanceStats = performance as PerformanceWithMemory;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const appliedRenderPixelRatio = Math.min(devicePixelRatio, 2);

  if (options.recordDiagnostics) {
    recordMaterialGrowthSample(debugResourceTrendState.materialSamples, {
      nowMs,
      materialCount: rendererStats.materialCount,
      playerX: spatial.playerX,
      playerY: spatial.playerY,
    });
    recordRendererChurnSample(debugResourceTrendState.rendererChurnSamples, {
      nowMs,
      tileNodeBuildsPerSecond: rendererStats.tileNodeBuildsPerSecond,
      playerX: spatial.playerX,
      playerY: spatial.playerY,
    });
  }

  const heapUsedMb =
    typeof performanceStats.memory?.usedJSHeapSize === 'number'
      ? performanceStats.memory.usedJSHeapSize / (1024 * 1024)
      : null;
  if (options.recordDiagnostics && heapUsedMb !== null) {
    recordHeapUsageSample(debugResourceTrendState.heapSamples, {
      nowMs,
      heapUsedMb,
      playerX: spatial.playerX,
      playerY: spatial.playerY,
    });
  }

  const debugSnapshot: DebugSnapshot = {
    fps: 1000 / Math.max(1, renderBudgetState.currentFrameMs),
    averageFps: renderBudgetState.averageFps,
    frameMs: renderBudgetState.currentFrameMs,
    worstRecentFrameMs: renderBudgetState.worstRecentFrameMs,
    targetFps: renderBudgetState.targetFps,
    performanceTier: resolvePerformanceTier(renderBudgetState.smoothedFrameMs),
    renderQualityLevel: formatRenderQualityLevel(
      getRenderQualityLevel(renderBudgetState)
    ),
    renderQualityLimiters: getRenderQualityLimiters(renderBudgetState).join(', '),
    playerLevel: normalizePlayerLevel(state.playerLevel),
    visibilityRadius: renderBudgetState.visibilityRadius,
    drawCalls: rendererStats.drawCalls,
    triangles: rendererStats.triangles,
    points: rendererStats.points,
    lines: rendererStats.lines,
    renderWidth: Math.max(1, Math.floor(viewport2d.width)),
    renderHeight: Math.max(1, Math.floor(viewport2d.height)),
    devicePixelRatio,
    renderScale: getCurrentRenderScale(
      appliedRenderPixelRatio,
      devicePixelRatio
    ),
    sceneChildCount: rendererStats.sceneChildCount,
    visibleTileCount: rendererStats.visibleTileCount,
    visibleTreeCount: rendererStats.visibleTreeCount,
    loadedChunkCount: rendererStats.visibleTileCount,
    chunkGenerationQueueSize: rendererStats.pendingTileCount,
    pendingTileCount: rendererStats.pendingTileCount,
    averagePendingFlushTiles: rendererStats.averagePendingFlushTiles,
    maxPendingFlushTiles: rendererStats.maxPendingFlushTiles,
    averageTileBuildMs: rendererStats.averageTileBuildMs,
    maxTileBuildMs: rendererStats.maxTileBuildMs,
    averageTilePluginBuildMs: rendererStats.averageTilePluginBuildMs,
    maxTilePluginBuildMs: rendererStats.maxTilePluginBuildMs,
    slowestTilePluginLabel: rendererStats.slowestTilePluginLabel,
    tileModelBudgetViolationsPerSecond:
      rendererStats.tileModelBudgetViolationsPerSecond,
    tileModelBudgetViolationTopPluginLabel:
      rendererStats.tileModelBudgetViolationTopPluginLabel,
    tileModelBudgetViolationSummary:
      rendererStats.tileModelBudgetViolationSummary,
    tileNodeBuildsPerSecond: rendererStats.tileNodeBuildsPerSecond,
    tileBuildsPerSecond: rendererStats.tileBuildsPerSecond,
    lodChecksPerSecond: rendererStats.lodChecksPerSecond,
    lodReplacementsPerSecond: rendererStats.lodReplacementsPerSecond,
    object3dCount: rendererStats.object3dCount,
    visibleObjectCount: rendererStats.visibleObjectCount,
    invisibleObjectCount: rendererStats.invisibleObjectCount,
    groupCount: rendererStats.groupCount,
    meshCount: rendererStats.meshCount,
    instancedMeshCount: rendererStats.instancedMeshCount,
    visibleInstancedMeshCount: rendererStats.visibleInstancedMeshCount,
    renderedInstanceCount: rendererStats.renderedInstanceCount,
    visibleMeshCount: rendererStats.visibleMeshCount,
    maxHierarchyDepth: rendererStats.maxHierarchyDepth,
    averageHierarchyDepth: rendererStats.averageHierarchyDepth,
    emptyGroupCount: rendererStats.emptyGroupCount,
    oneChildGroupCount: rendererStats.oneChildGroupCount,
    matrixAutoUpdateCount: rendererStats.matrixAutoUpdateCount,
    staticMatrixAutoUpdateCount: rendererStats.staticMatrixAutoUpdateCount,
    pointsCount: rendererStats.pointsCount,
    lineObjectCount: rendererStats.lineObjectCount,
    cameraCount: rendererStats.cameraCount,
    activeParticleSystemCount: rendererStats.activeParticleSystemCount,
    activeParticleCount: rendererStats.activeParticleCount,
    spriteCount: rendererStats.spriteCount,
    lightCount: rendererStats.lightCount,
    ambientLightCount: rendererStats.ambientLightCount,
    directionalLightCount: rendererStats.directionalLightCount,
    pointLightCount: rendererStats.pointLightCount,
    spotLightCount: rendererStats.spotLightCount,
    hemisphereLightCount: rendererStats.hemisphereLightCount,
    dynamicLightCount: rendererStats.dynamicLightCount,
    shadowLightCount: rendererStats.shadowLightCount,
    activeNpcCount: worldStats.activeNpcCount,
    fullSimulationEntityCount: worldStats.fullSimulationEntityCount,
    reducedSimulationEntityCount: worldStats.reducedSimulationEntityCount,
    activeAudioSourceCount:
      soundEffects.getActiveSourceCount() + musicController.getActiveSourceCount(),
    materialRefCount: rendererStats.materialRefCount,
    materialCount: rendererStats.materialCount,
    sharedMaterialCount: rendererStats.sharedMaterialCount,
    clonedMaterialCount: rendererStats.clonedMaterialCount,
    transparentMaterialCount: rendererStats.transparentMaterialCount,
    alphaTestMaterialCount: rendererStats.alphaTestMaterialCount,
    doubleSidedMaterialCount: rendererStats.doubleSidedMaterialCount,
    fogMaterialCount: rendererStats.fogMaterialCount,
    customShaderMaterialCount: rendererStats.customShaderMaterialCount,
    materialTypes: rendererStats.materialTypes,
    materialsCreatedDuringSamplingWindow:
      rendererStats.materialsCreatedDuringSamplingWindow,
    materialsDisposedDuringSamplingWindow:
      rendererStats.materialsDisposedDuringSamplingWindow,
    geometryRefCount: rendererStats.geometryRefCount,
    geometryCount: rendererStats.geometryCount,
    sharedGeometryCount: rendererStats.sharedGeometryCount,
    gpuGeometryCount: rendererStats.gpuGeometryCount,
    geometryBytes: rendererStats.geometryBytes,
    vertexBufferBytes: rendererStats.vertexBufferBytes,
    indexBufferBytes: rendererStats.indexBufferBytes,
    averageVerticesPerGeometry: rendererStats.averageVerticesPerGeometry,
    largestGeometryVertexCount: rendererStats.largestGeometryVertexCount,
    largestGeometryBytes: rendererStats.largestGeometryBytes,
    vertexCount: rendererStats.vertexCount,
    geometryMemoryCount: rendererStats.gpuGeometryCount,
    treeObjectCount: rendererStats.treeObjectCount,
    treeMeshCount: rendererStats.treeMeshCount,
    treeMaterialRefCount: rendererStats.treeMaterialRefCount,
    visibleTileKindSummary: rendererStats.visibleTileKindSummary,
    textureCount: rendererStats.textureCount,
    textureMemoryEstimateMb: rendererStats.textureMemoryEstimateBytes / (1024 * 1024),
    programCount: rendererStats.programCount,
    latitude: spatial.gps.latitude,
    longitude: spatial.gps.longitude,
    gridX: spatial.gridX,
    gridY: spatial.gridY,
    worldSeed: currentWorldSeed,
    heapUsedMb,
    heapLimitMb:
      typeof performanceStats.memory?.jsHeapSizeLimit === 'number'
        ? performanceStats.memory.jsHeapSizeLimit / (1024 * 1024)
        : null,
    resourceWarnings: [],
  };

  const materialGrowthWarning = getMaterialGrowthWarning(
    debugResourceTrendState.materialSamples
  );
  const stationaryTileBuildWarning = getStationaryTileBuildWarning(
    debugResourceTrendState.rendererChurnSamples
  );
  const heapGrowthWarning = getHeapGrowthWarning(debugResourceTrendState.heapSamples);
  const idleAllocationWarning = getIdleAllocationWarning(
    debugResourceTrendState.heapSamples
  );
  debugSnapshot.resourceWarnings = [
    ...getPerformanceWarnings(debugSnapshot),
    ...getWorkQueueWarnings(debugSnapshot),
    ...getSynchronousTileBuildWarnings(debugSnapshot),
    ...getRenderBudgetViolationWarnings(debugSnapshot),
    ...getUnloadedRegionWarnings(debugSnapshot),
    ...getSceneBudgetWarnings(debugSnapshot),
    ...(materialGrowthWarning ? [materialGrowthWarning] : []),
    ...(heapGrowthWarning ? [heapGrowthWarning] : []),
    ...(idleAllocationWarning ? [idleAllocationWarning] : []),
    ...(stationaryTileBuildWarning ? [stationaryTileBuildWarning] : []),
  ];

  const previousSnapshot = debugSnapshotState.latestSnapshot;
  if (
    options.recordDiagnostics &&
    previousSnapshot &&
    (
      previousSnapshot.targetFps !== debugSnapshot.targetFps ||
      previousSnapshot.visibilityRadius !== debugSnapshot.visibilityRadius ||
      previousSnapshot.renderQualityLevel !== debugSnapshot.renderQualityLevel
    )
  ) {
    recordDebugRecentEvent({
      nowMs,
      type: 'graphics-quality-changed',
      fromTargetFps: previousSnapshot.targetFps,
      targetFps: debugSnapshot.targetFps,
      fromVisibilityRadius: previousSnapshot.visibilityRadius,
      visibilityRadius: debugSnapshot.visibilityRadius,
      fromRenderQualityLevel: previousSnapshot.renderQualityLevel,
      renderQualityLevel: debugSnapshot.renderQualityLevel,
    });
  }

  if (options.recordDiagnostics) {
    recordPerformanceHistorySample(debugResourceTrendState.performanceSamples, {
      nowMs,
      fps: debugSnapshot.fps,
      frameMs: debugSnapshot.frameMs,
      targetFps: debugSnapshot.targetFps,
      visibilityRadius: debugSnapshot.visibilityRadius,
      renderQualityLevel: debugSnapshot.renderQualityLevel,
      drawCalls: debugSnapshot.drawCalls,
      triangles: debugSnapshot.triangles,
      objectCount: debugSnapshot.object3dCount,
      materialCount: debugSnapshot.materialCount,
      geometryCount: debugSnapshot.geometryCount,
      heapUsedMb: debugSnapshot.heapUsedMb,
      tileBuildsPerSecond: debugSnapshot.tileBuildsPerSecond,
      lodReplacementsPerSecond: debugSnapshot.lodReplacementsPerSecond,
      visibleTileCount: debugSnapshot.visibleTileCount,
      visibleTreeCount: debugSnapshot.visibleTreeCount,
      activeLightCount: debugSnapshot.lightCount,
      activeParticleSystemCount: debugSnapshot.activeParticleSystemCount,
      activeParticleCount: debugSnapshot.activeParticleCount,
      generationQueueSize: debugSnapshot.chunkGenerationQueueSize,
    });
  }

  debugSnapshot.peakMaterialCount = Math.max(
    debugSnapshot.materialCount,
    ...debugResourceTrendState.materialSamples.map((sample) => sample.materialCount)
  );

  debugSnapshotState.latestSnapshot = { ...debugSnapshot };
  return debugSnapshot;
}

function downloadCurrentDebugSnapshot(): void {
  const nowMs = performance.now();
  const latestSnapshot = collectCurrentDebugSnapshot(
    nowMs,
    getPlayerSpatialSummary(state),
    { recordDiagnostics: false }
  );
  const rendererStats = renderer3d.getStats();

  const timestamp = new Date();
  const currentContext = state.getCurrentContext();
  const pendingWorldBuildBudget = getPendingWorldBuildBudget(renderBudgetState);
  const renderBudgetCaps = getRenderBudgetCaps(renderBudgetState);
  const graphicsCapabilities = collectGraphicsCapabilities();
  const lodThresholds = getLodThresholdSummary();
  const exportPayload = buildDebugSnapshotExport({
    timestamp,
    gameVersion: APP_VERSION,
    buildId: BUILD_ID,
    worldSeed: currentWorldSeed,
    context: {
      id: currentContext.id,
      type: currentContext.type,
      label: currentContext.label,
      depth: currentContext.depth,
    },
    player: {
      gridX: snapWorldCoordinate(state.player.x),
      gridY: snapWorldCoordinate(state.player.y),
      worldX: state.player.x,
      worldY: state.player.y,
      facing: state.player.facing,
    },
    rendererMode: state.viewMode,
    activeContentPacks: activePacks.map((pack) => ({
      id: pack.id,
      name: pack.name,
    })),
    enabledPlugins: registry.plugins.map((plugin) => plugin.name),
    graphicsQuality: {
      level: latestSnapshot.renderQualityLevel,
      limiters: latestSnapshot.renderQualityLimiters,
      renderRadius: latestSnapshot.visibilityRadius,
      targetFps: latestSnapshot.targetFps,
      performanceTier: latestSnapshot.performanceTier,
    },
    device: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform:
        (navigator as Navigator & {
          userAgentData?: { platform?: string };
        }).userAgentData?.platform ?? navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGb:
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    },
    graphicsCapabilities,
    performanceBudget: {
      currentFrameMs: renderBudgetState.currentFrameMs,
      smoothedFrameMs: renderBudgetState.smoothedFrameMs,
      targetFps: renderBudgetState.targetFps,
      visibilityRadius: renderBudgetState.visibilityRadius,
      pendingBuildBudgetMs: pendingWorldBuildBudget.pendingBuildBudgetMs,
      maxPendingBuildTiles: pendingWorldBuildBudget.maxPendingBuildTiles,
      caps: renderBudgetCaps,
    },
    lod: {
      thresholds: lodThresholds,
    },
    recentEvents: collectMergedRecentDebugEvents(nowMs, rendererStats.recentEvents),
    snapshot: latestSnapshot,
    history: debugResourceTrendState.performanceSamples,
  });
  const blob = new Blob([`${JSON.stringify(exportPayload, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = formatDebugSnapshotFilename(timestamp);
  anchor.click();
  URL.revokeObjectURL(url);
}

function recordDebugRecentEvent(event: DebugSnapshotRecentEvent): void {
  debugRecentEventsState.events.push(event);
  if (debugRecentEventsState.events.length > MAX_DEBUG_RECENT_EVENTS) {
    debugRecentEventsState.events.splice(
      0,
      debugRecentEventsState.events.length - MAX_DEBUG_RECENT_EVENTS
    );
  }
}

function collectMergedRecentDebugEvents(
  nowMs: number,
  rendererEvents: Array<{
    nowMs: number;
    type: 'lod-changed' | 'model-rejected' | 'plugin-exceeded-budget';
    tileKey?: string;
    plugin?: string;
    summary?: string;
    fromDetailLevel?: string;
    toDetailLevel?: string;
  }>
): DebugSnapshotRecentEvent[] {
  const minimumTime = nowMs - DEBUG_RECENT_EVENT_WINDOW_MS;
  return [...debugRecentEventsState.events, ...rendererEvents]
    .filter((event) => event.nowMs >= minimumTime)
    .sort((left, right) => left.nowMs - right.nowMs)
    .slice(-MAX_DEBUG_RECENT_EVENTS);
}

function canLandOnOverworldTile(x: number, y: number): boolean {
  const tile = generator.sampleOverworld(x, y);
  const definition =
    registry.resolveTileDefinition(tile.kind, state.getTileDefinition(tile.kind)) ??
    state.getTileDefinition(tile.kind);
  return (
    Boolean(definition?.walkable) &&
    tile.kind !== 'river' &&
    tile.kind !== 'ocean'
  );
}

function getCurrentWorldTimeMs(): number {
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
    (environment.celestial ?? {}) as CelestialEnvironmentOverrides
  );
}

function canMoveTo(nextX: number, nextY: number): boolean {
  const canOccupy3d =
    state.viewMode !== '3d' || renderer3d.canOccupy(state, nextX, nextY);
  return state.canWalk(nextX, nextY) && canOccupy3d;
}

function commitMove(nextX: number, nextY: number): void {
  state.player.x = nextX;
  state.player.y = nextY;
  saveSession();
}

function getBridgeAxis(): 'ew' | 'ns' | null {
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

function getNearbyPoiMusicProfile() {
  const queryState = getNearbyOverworldQueryState(state);
  if (!queryState) {
    nearbyPoiMusicState.cache.clear();
    nearbyPoiMusicState.profile = null;
    return null;
  }

  const { centerX, centerY, contextId } = queryState;
  const cacheKey = `${currentWorldSeed}:${contextId}:${centerX}:${centerY}`;
  const cachedProfile = nearbyPoiMusicState.cache.get(cacheKey);
  if (cachedProfile !== undefined) {
    nearbyPoiMusicState.profile = cachedProfile ?? null;
    return nearbyPoiMusicState.profile;
  }

  const searchRadius = 7;
  let best:
    | null
    | {
        tileKind?: string;
        poiType?: string;
        contextType?: string;
        mix: number;
        clusterX: number;
        clusterY: number;
        emitter: { x: number; y: number };
        distance: number;
      } = null;

  for (let y = centerY - searchRadius; y <= centerY + searchRadius; y += 1) {
    for (let x = centerX - searchRadius; x <= centerX + searchRadius; x += 1) {
      const tile = state.getCurrentTile(x, y);
      const poiType =
        typeof tile.poi?.type === 'string' ? tile.poi.type : undefined;
      if (!poiType) {
        continue;
      }
      const distance = Math.hypot(state.player.x - x, state.player.y - y);
      const mix = resolvePoiMusicMix(distance);
      if (mix <= 0.001) {
        continue;
      }
      if (best && distance >= best.distance) {
        continue;
      }
      best = {
        tileKind: tile.kind,
        poiType,
        contextType: poiType,
        mix,
        clusterX: Math.floor(x / 12),
        clusterY: Math.floor(y / 12),
        emitter: { x, y },
        distance,
      };
    }
  }

  nearbyPoiMusicState.profile = best
    ? {
        tileKind: best.tileKind,
        poiType: best.poiType,
        contextType: best.contextType,
        mix: best.mix,
        clusterX: best.clusterX,
        clusterY: best.clusterY,
        emitter: best.emitter,
      }
    : null;
  nearbyPoiMusicState.cache.set(cacheKey, nearbyPoiMusicState.profile);
  return nearbyPoiMusicState.profile;
}

function getNearbyTrainAudioProfile() {
  const queryState = getNearbyOverworldQueryState(state);
  if (!queryState) {
    nearbyTrainAudioState.cache.clear();
    nearbyTrainAudioState.profile = null;
    return null;
  }

  const { centerX, centerY, contextId } = queryState;
  const trainTimeBucket = Math.floor((state.timeMs ?? 0) / 2000);
  const cacheKey = `${currentWorldSeed}:${contextId}:${centerX}:${centerY}:${trainTimeBucket}`;
  const cachedProfile = nearbyTrainAudioState.cache.get(cacheKey);
  if (cachedProfile !== undefined) {
    nearbyTrainAudioState.profile = cachedProfile ?? null;
    return nearbyTrainAudioState.profile;
  }

  const best = findNearestTrafficProfile({
    state,
    centerX,
    centerY,
    searchRadius: 8,
    selectTraffic(tile) {
      return tile.train as
        | {
            progress?: number;
            x: number;
            y: number;
          }
        | undefined;
    },
  });

  nearbyTrainAudioState.profile = best;
  nearbyTrainAudioState.cache.set(cacheKey, nearbyTrainAudioState.profile);
  return nearbyTrainAudioState.profile;
}

function getNearbyPaddleBoatAudioProfile() {
  const queryState = getNearbyOverworldQueryState(state);
  if (!queryState) {
    nearbyPaddleBoatAudioState.cache.clear();
    nearbyPaddleBoatAudioState.profile = null;
    return null;
  }

  const { centerX, centerY, contextId } = queryState;
  const boatTimeBucket = Math.floor((state.timeMs ?? 0) / 2000);
  const cacheKey = `${currentWorldSeed}:${contextId}:${centerX}:${centerY}:${boatTimeBucket}`;
  const cachedProfile = nearbyPaddleBoatAudioState.cache.get(cacheKey);
  if (cachedProfile !== undefined) {
    nearbyPaddleBoatAudioState.profile = cachedProfile ?? null;
    return nearbyPaddleBoatAudioState.profile;
  }

  const best = findNearestTrafficProfile({
    state,
    centerX,
    centerY,
    searchRadius: 8,
    selectTraffic(tile) {
      return tile.boat as
        | {
            progress?: number;
            whistlePhase?: 'arrival' | 'departure';
            x: number;
            y: number;
          }
        | undefined;
    },
    mapProfile(traffic) {
      return {
        whistlePhase: traffic.whistlePhase,
      };
    },
  });

  nearbyPaddleBoatAudioState.profile = best;
  nearbyPaddleBoatAudioState.cache.set(cacheKey, nearbyPaddleBoatAudioState.profile);
  return nearbyPaddleBoatAudioState.profile;
}

function attemptMove(stepX: number, stepY: number): void {
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
    return;
  }

  if (state.viewMode !== '3d') {
    return;
  }
  const blockedTileKind = state.getCurrentTile(nextX, nextY).kind;
  if (!shouldPlayBlockedMovementSound(blockedTileKind)) {
    return;
  }
  soundEffects.triggerBlockedMovement({
    nowMs: performance.now(),
    tileKind: blockedTileKind,
    emitter: {
      x: snapWorldCoordinate(nextX),
      y: snapWorldCoordinate(nextY),
    },
    listener: { x: state.player.x, y: state.player.y },
  });
}

function forwardDelta(): WorldPoint {
  const angle = state.player.facing;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

function handleInteraction(): void {
  const currentTile = state.getCurrentTile();
  const emitter = {
    x: snapWorldCoordinate(state.player.x),
    y: snapWorldCoordinate(state.player.y),
  };
  if (!state.interact()) {
    return;
  }
  soundEffects.resume();
  soundEffects.triggerInteraction({
    nowMs: performance.now(),
    event: 'open',
    tileKind: currentTile.kind,
    emitter,
    listener: { x: state.player.x, y: state.player.y },
  });
  saveSession();
}

function handleTryExit(): void {
  const currentTile = state.getCurrentTile();
  const emitter = {
    x: snapWorldCoordinate(state.player.x),
    y: snapWorldCoordinate(state.player.y),
  };
  if (!state.tryExit()) {
    return;
  }
  soundEffects.resume();
  soundEffects.triggerInteraction({
    nowMs: performance.now(),
    event: 'close',
    tileKind: currentTile.kind,
    emitter,
    listener: { x: state.player.x, y: state.player.y },
  });
  saveSession();
}

function getSavedPlayerPlacedPois(): PlayerPlacedPoiLike[] {
  return listPlayerPlacedPois(state);
}

function syncPlayerPlacedPoisIntoState(pois: PlayerPlacedPoiLike[]): void {
  setPlayerPlacedPois(state, pois);
  (state as typeof state & { overworldTileRevision?: number }).overworldTileRevision = 0;
}

function handleBuildPoi(): void {
  const selectedKind = buildPoiKindSelect?.value;
  if (
    selectedKind !== 'town' &&
    selectedKind !== 'cave' &&
    selectedKind !== 'dungeon' &&
    selectedKind !== 'quarry' &&
    selectedKind !== 'lighthouse' &&
    selectedKind !== 'ship'
  ) {
    return;
  }

  const built = buildPlayerPoi(state, currentWorldSeedHash, selectedKind);
  if (!built) {
    showHmrNotice('Unable to build here. Move to an open overworld tile without an existing point of interest.');
    return;
  }

  const publishTargets = worldMapStorage.getPreferredPoiPublishTargets?.() ?? [];
  const publishPrompt = formatWorldMapPoiPublishPrompt(
    built.poi.name,
    publishTargets
  );
  let publishedServerIds: string[] = [];
  if (
    publishPrompt &&
    typeof window.confirm === 'function' &&
    window.confirm(publishPrompt)
  ) {
    publishedServerIds = worldMapStorage.publishPoiToPreferredServers?.(built) ?? [];
  }

  saveSession();
  const publishSummary =
    publishedServerIds.length > 0
      ? ` Published to ${publishedServerIds.join(', ')}.`
      : '';
  showHmrNotice(`Built ${built.poi.name}.${publishSummary}`);
  requestRender();
}

function resetMotionState(): void {
  motion.jumpHeight = 0;
  motion.isJumping = false;
  motion.spaceHeld = false;
  motion.spaceReady = true;
  motion.jumpVelocity = 0;
  motion.jumpHoldElapsed = 0;
  motion.longJumpActivated = false;
  motion.headBob = DEFAULT_HEAD_BOB_STATE;
}

function travelToOverworld(
  x: number,
  y: number,
  facing = state.player.facing
): void {
  resetStateToOverworld(state, { x, y }, facing);
  resetMotionState();
  saveSession();
  requestRender();
}

function jumpToRandomPlains(): void {
  const destination =
    findRandomTileDestination('plains', {
      sampleOverworld: generator.sampleOverworld,
      canLandAt: canLandOnOverworldTile,
    }) ?? { x: 0, y: 0 };
  travelToOverworld(destination.x, destination.y);
}

function jumpHome(): void {
  travelToOverworld(0, 0, 0);
}

function teleportToSelectedTileKind(): void {
  const targetKind = debugTileKindSelect?.value;
  if (!targetKind) {
    showHmrNotice('Select a tile type first.');
    return;
  }

  const destination = findRandomTileDestination(targetKind, {
    sampleOverworld: generator.sampleOverworld,
    canLandAt: canLandOnOverworldTile,
  });

  if (!destination) {
    showHmrNotice(`Unable to find a nearby landing spot for ${targetKind}.`);
    return;
  }

  travelToOverworld(destination.x, destination.y);
  showHmrNotice(`Jumped to ${targetKind} near ${destination.x}, ${destination.y}.`);
}

function skipTimeByHours(hours: number): void {
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

function skipSeasonByCount(seasons: number): void {
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

function jumpToTimePreset(
  preset: 'dawn' | 'noon' | 'dusk' | 'midnight'
): void {
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

function setInspectorTab(tabId: string | undefined): void {
  activeInspectorTab = getNextInspectorTab(tabId);
  inspectorTabButtons.forEach((button) => {
    const isActive = button.id === `tab-${activeInspectorTab}`;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  Object.entries(inspectorPanels).forEach(([panelId, panel]) => {
    const isActive = isInspectorSectionVisible(
      activeInspectorTab,
      panelId as 'timekeeper' | 'model' | 'events' | 'compass' | 'sextant' | 'debug'
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

function updateFreezeTimeButton(): void {
  if (!freezeTimeButton) return;
  freezeTimeButton.textContent = timeState.frozen
    ? 'Resume Time'
    : 'Freeze Time';
  freezeTimeButton.classList.toggle('is-active', timeState.frozen);
}

function toggleTimeFreeze(): void {
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

function jump(): void {
  if (state.viewMode !== '3d') return;
  if (motion.isJumping) return;
  soundEffects.resume();
  soundEffects.triggerJump({
    nowMs: performance.now(),
    tileKind: state.getCurrentTile().kind,
    emitter: { x: state.player.x, y: state.player.y },
    listener: { x: state.player.x, y: state.player.y },
  });
  motion.isJumping = true;
  motion.jumpHeight = 0;
  motion.jumpVelocity = motion.shortJumpVelocity;
  motion.jumpHoldElapsed = 0;
  motion.longJumpActivated = false;
  requestRender();
}

function updateMovement(deltaMs: number): void {
  state.timeMs = getCurrentWorldTimeMs();
  const nowMs = performance.now();
  const previousX = state.player.x;
  const previousY = state.player.y;
  const previousFacing = state.player.facing;
  const turnSpeed = 0.0034 * deltaMs;
  const moveSpeed = 0.0052 * deltaMs;
  const intent = getMovementIntent(keys);

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

  if (intent.turnLeft) {
    state.player.facing = normalizeAngle(state.player.facing - turnSpeed);
  }
  if (intent.turnRight) {
    state.player.facing = normalizeAngle(state.player.facing + turnSpeed);
  }
  if (intent.moveForward) {
    moveX += forward.x;
    moveY += forward.y;
  }
  if (intent.moveBackward) {
    moveX -= forward.x;
    moveY -= forward.y;
  }
  if (intent.strafeLeft) {
    moveX -= strafe.x;
    moveY -= strafe.y;
  }
  if (intent.strafeRight) {
    moveX += strafe.x;
    moveY += strafe.y;
  }

  const magnitude = Math.hypot(moveX, moveY);
  const walking = magnitude > 0 && state.viewMode === '3d' && !motion.isJumping;
  if (magnitude > 0) {
    const normalizedX = (moveX / magnitude) * moveSpeed;
    const normalizedY = (moveY / magnitude) * moveSpeed;
    attemptMove(normalizedX, normalizedY);
  }
  motion.headBob = advanceHeadBobState(motion.headBob, {
    deltaMs,
    walking,
    enabled: state.viewMode === '3d',
  });

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

  const shouldResolveSoundContext = shouldResolve3dSoundContext(state.viewMode);
  const currentTileKind = shouldResolveSoundContext
    ? state.getCurrentTile().kind
    : undefined;
  const currentWeather = shouldResolveSoundContext
    ? latestEnvironment.weather?.current
    : undefined;
  const nearbyTrainAudio = shouldResolveSoundContext
    ? getNearbyTrainAudioProfile()
    : null;
  const nearbyPaddleBoatAudio = shouldResolveSoundContext
    ? getNearbyPaddleBoatAudioProfile()
    : null;
  soundEffects.update(buildSoundUpdatePayload({
    nowMs,
    walking,
    isJumping: motion.isJumping,
    viewMode: state.viewMode,
    tileKind: currentTileKind,
    weatherKind: currentWeather?.kind,
    weatherIntensity: currentWeather?.intensity,
    windStrength: currentWeather?.windStrength,
    nearbyTrain: nearbyTrainAudio,
    nearbyPaddleBoat: nearbyPaddleBoatAudio,
    emitterX: state.player.x,
    emitterY: state.player.y,
    listenerX: state.player.x,
    listenerY: state.player.y,
  }));

  if (
    previousX !== state.player.x ||
    previousY !== state.player.y ||
    previousFacing !== state.player.facing
  ) {
    saveSession();
  }
}

function render(): FrameLoopActivityLike {
  const nowMs = performance.now();
  const timeMs = getCurrentWorldTimeMs();
  state.timeMs = timeMs;
  const environment = getCurrentEnvironment(timeMs);
  latestEnvironment = environment;
  const actualCycle = applyCelestialEnvironmentOverrides(
    getDaylightCycleState(timeMs, environment.cycle ?? {}),
    (environment.celestial ?? {}) as CelestialEnvironmentOverrides
  );
  const displayCycle = updateDisplayedCycle(actualCycle);
  const spatial = getPlayerSpatialSummary(state);
  const context = spatial.context;
  const currentTile = spatial.tile;
  const musicClusterX = Math.floor(spatial.playerX / 12);
  const musicClusterY = Math.floor(spatial.playerY / 12);
  const nearbyPoiMusic = getNearbyPoiMusicProfile();
  const musicUpdate = gateMusicUpdate({
    nowMs,
    tileKind: currentTile.kind,
    contextType: context.type,
    dayProgress: actualCycle.dayProgress,
    yearProgress: actualCycle.yearProgress,
    weatherKind: environment.weather?.current?.kind,
    weatherIntensity: environment.weather?.current?.intensity,
    clusterX: musicClusterX,
    clusterY: musicClusterY,
    emitterX: musicClusterX * 12 + 6,
    emitterY: musicClusterY * 12 + 6,
    listenerX: spatial.playerX,
    listenerY: spatial.playerY,
    nearbyPoi: nearbyPoiMusic,
  });
  if (musicUpdate) {
    musicController.update(musicUpdate);
  }
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
  } else if (state.viewMode === 'text') {
    if (!viewportText) return;
    const grid = buildTextViewportGrid(state, {
      columns: 29,
      rows: 19,
    });
    const textViewportSignature = getTextViewportSignature(grid);
    if (textViewportSignature !== uiRenderState.lastTextViewportSignature) {
      viewportText.innerHTML = buildTextViewportMarkup(grid);
      uiRenderState.lastTextViewportSignature = textViewportSignature;
    }
  } else {
    const pendingWorldBuildBudget = getPendingWorldBuildBudget(renderBudgetState);
    const frameGenerationBudget = getFrameGenerationBudget(renderBudgetState);
    const renderBudget = createRenderBudget(renderBudgetState, {
      generationBudgetMs: frameGenerationBudget.generationBudgetMs,
      pendingBuildBudgetMs: pendingWorldBuildBudget.pendingBuildBudgetMs,
      maxPendingBuildTiles: pendingWorldBuildBudget.maxPendingBuildTiles,
    });
    renderer3d.render(state, {
      jumpHeight: motion.jumpHeight,
      timeMs,
      environment,
      cameraPitch: mouseLookState.pitch,
      cameraBobOffset: motion.headBob.offset,
      visibilityRadius: renderBudgetState.visibilityRadius,
      renderBudget,
      generationBudgetMs: frameGenerationBudget.generationBudgetMs,
      pendingBuildBudgetMs: pendingWorldBuildBudget.pendingBuildBudgetMs,
      maxPendingBuildTiles: pendingWorldBuildBudget.maxPendingBuildTiles,
    });
  }

  if (timeWheelCanvas && !timeWheelCanvas.hidden) {
    const timekeeperSignature = getTimekeeperMiniSignature({
      width: timeWheelCanvas.width,
      height: timeWheelCanvas.height,
      dayProgress: displayCycle.dayProgress,
      yearProgress: displayCycle.yearProgress,
      moonAngle: displayCycle.moonAngle,
      moonMidnightAngle: displayCycle.moonMidnightAngle,
      sunriseAzimuth: displayCycle.sunriseAzimuth,
      sunsetAzimuth: displayCycle.sunsetAzimuth,
      daylightDuration: displayCycle.daylightDuration,
    });
    if (timekeeperSignature !== uiRenderState.lastTimekeeperSignature) {
      drawTimeWheel(timeWheelCanvas, displayCycle);
      uiRenderState.lastTimekeeperSignature = timekeeperSignature;
    }
  }
  if (
    viewportTimekeeperMini &&
    activeTimekeeperDisplayMode === 'graphical' &&
    !viewportTimekeeperMini.hidden
  ) {
    const timekeeperMiniSignature = getTimekeeperMiniSignature({
      width: viewportTimekeeperMini.width,
      height: viewportTimekeeperMini.height,
      dayProgress: displayCycle.dayProgress,
      yearProgress: displayCycle.yearProgress,
      moonAngle: displayCycle.moonAngle,
      moonMidnightAngle: displayCycle.moonMidnightAngle,
      sunriseAzimuth: displayCycle.sunriseAzimuth,
      sunsetAzimuth: displayCycle.sunsetAzimuth,
      daylightDuration: displayCycle.daylightDuration,
    });
    if (timekeeperMiniSignature !== uiRenderState.lastTimekeeperMiniSignature) {
      drawTimeWheel(viewportTimekeeperMini, displayCycle);
      uiRenderState.lastTimekeeperMiniSignature = timekeeperMiniSignature;
    }
  }
  if (
    viewportMinimapMini &&
    activeMinimapDisplayMode === 'graphical' &&
    !viewportMinimapMini.hidden
  ) {
    const minimapMiniSignature = getMinimapMiniSignature({
      width: viewportMinimapMini.width,
      height: viewportMinimapMini.height,
      playerX: spatial.playerX,
      playerY: spatial.playerY,
      facingAngle: spatial.facing,
      zoom: minimapZoom,
    });
    if (minimapMiniSignature !== uiRenderState.lastMinimapMiniSignature) {
      const minimapContext = viewportMinimapMini.getContext('2d');
      if (minimapContext) {
        minimapContext.imageSmoothingEnabled = false;
        minimapContext.clearRect(
          0,
          0,
          viewportMinimapMini.width,
          viewportMinimapMini.height
        );
        render2D(minimapContext, state, {
          width: viewportMinimapMini.width,
          height: viewportMinimapMini.height,
          rotation: 0,
          facingAngle: spatial.facing,
          zoom: minimapZoom,
          showTimeOverlay: false,
        });
        uiRenderState.lastMinimapMiniSignature = minimapMiniSignature;
      }
    }
  }
  celestialPreview.render(displayCycle, environment, state.player.facing, generator);
  solarSystemPreview.render(displayCycle);
  const compassFrameState = resolveCompassFrameState({
    miniVisible:
      Boolean(viewportCompassMini) &&
      activeCompassDisplayMode === 'graphical' &&
      !viewportCompassMini.hidden,
    fullVisible: Boolean(compassDialCanvas) && !compassDialCanvas?.hidden,
    resolveFacingAngle: () => updateDisplayedCompass(spatial.facing),
    resolveHeadingAngle: () =>
      updateDisplayedCompassHeading(
        compassHeadingState.angle,
        compassDialPointerState.draggingMode === 'heading-bug'
      ),
  });
  if (
    viewportCompassMini &&
    activeCompassDisplayMode === 'graphical' &&
    !viewportCompassMini.hidden &&
    compassFrameState
  ) {
    const compassMiniSignature = getCompassMiniSignature({
      width: viewportCompassMini.width,
      height: viewportCompassMini.height,
      facingAngle: compassFrameState.displayedFacingAngle,
      headingAngle: compassFrameState.displayedHeadingAngle,
    });
    if (compassMiniSignature !== uiRenderState.lastCompassMiniSignature) {
      drawCompassDial(
        viewportCompassMini,
        compassFrameState.displayedFacingAngle,
        compassFrameState.displayedHeadingAngle
      );
      uiRenderState.lastCompassMiniSignature = compassMiniSignature;
    }
  }
  const eventsInspectorVisible = isInspectorSectionVisible(activeInspectorTab, 'events');
  const sextantInspectorVisible = isInspectorSectionVisible(activeInspectorTab, 'sextant');
  const debugInspectorVisible = isInspectorSectionVisible(activeInspectorTab, 'debug');
  if (eventSummary && eventsInspectorVisible) {
    const eventDetails = getActiveCelestialEventDetails(displayCycle);
    const modeLabel = formatCelestialEventModeLabel(celestialEventModeState.mode);
    const activeEventsLabel = describeActiveCelestialEvents(displayCycle);
    const eventSummarySignature = getEventSummarySignature({
      modeLabel,
      activeEventsLabel,
      detailLabels: getDetailLabels(eventDetails),
    });
    if (eventSummarySignature !== uiRenderState.lastEventSummarySignature) {
      eventSummary.innerHTML = buildEventSummaryMarkup({
        modeLabel,
        activeEventsLabel,
        details: eventDetails,
      });
      uiRenderState.lastEventSummarySignature = eventSummarySignature;
    }
  }
  syncHmrNotice(nowMs);
  if (compassDialCanvas && !compassDialCanvas.hidden && compassFrameState) {
    const compassSignature = getCompassMiniSignature({
      width: compassDialCanvas.width,
      height: compassDialCanvas.height,
      facingAngle: compassFrameState.displayedFacingAngle,
      headingAngle: compassFrameState.displayedHeadingAngle,
    });
    if (compassSignature !== uiRenderState.lastCompassSignature) {
      drawCompassDial(
        compassDialCanvas,
        compassFrameState.displayedFacingAngle,
        compassFrameState.displayedHeadingAngle
      );
      uiRenderState.lastCompassSignature = compassSignature;
    }
  }
  updateStatus(spatial, environment, displayCycle);
  const needsCoordinateSummary = sextantInspectorVisible || debugInspectorVisible;
  const gps = needsCoordinateSummary ? spatial.gps : null;
  const gridX = needsCoordinateSummary ? spatial.gridX : 0;
  const gridY = needsCoordinateSummary ? spatial.gridY : 0;
  if (sextantSummary && sextantInspectorVisible && gps) {
    const sextantSignature = getSextantSignature({
      latitude: gps.latitude,
      longitude: gps.longitude,
      gridX,
      gridY,
    });
    if (sextantSignature !== uiRenderState.lastSextantSignature) {
      sextantSummary.innerHTML = buildSextantMarkup({
        latitude: gps.latitude,
        longitude: gps.longitude,
        gridX,
        gridY,
      });
      uiRenderState.lastSextantSignature = sextantSignature;
    }
  }
  if (
    shouldCollectDebugSnapshot({
      debugInspectorVisible,
      hasDebugSummary: Boolean(debugSummary),
      hasGps: gps !== null,
      nowMs,
      lastSampleNowMs: debugSnapshotState.lastSampleNowMs,
    })
  ) {
    const debugSnapshot = collectCurrentDebugSnapshot(nowMs, spatial, {
      recordDiagnostics: true,
    });
    debugSnapshotState.lastSampleNowMs = nowMs;
    const debugSignature = getDebugSignature(debugSnapshot);
    if (debugSummary && debugSignature !== uiRenderState.lastDebugSignature) {
      debugSummary.innerHTML = buildDebugMarkup(debugSnapshot);
      uiRenderState.lastDebugSignature = debugSignature;
    }
  }
  return getFrameLoopActivity({
    nowMs,
    timeFrozen: timeState.frozen,
    tabHidden: pageVisibilityState.hidden,
    keys,
    isJumping: motion.isJumping,
    compassVelocity: compassState.velocity,
    headingVisualAngle: compassHeadingVisualState.angle,
    headingTargetAngle: compassHeadingState.angle,
    headBobOffset: motion.headBob.offset,
    headBobIntensity: motion.headBob.intensity,
    previewInteracting:
      celestialPreview.isInteracting() || solarSystemPreview.isInteracting(),
    compassDragging: compassDialPointerState.draggingMode !== null,
    hmrNoticeVisibleUntilMs: hmrNoticeState.visibleUntilMs,
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

function requestRender(): void {
  if (pageVisibilityState.hidden) {
    return;
  }
  if (pendingFrameHandle !== 0) {
    return;
  }
  pendingFrameHandle = requestAnimationFrame(loop);
}

function showHmrNotice(message: string, durationMs = 8000): void {
  hmrNoticeState.message = message;
  hmrNoticeState.visibleUntilMs = getHmrNoticeVisibleUntil(performance.now(), durationMs);
  requestRender();
}

function syncHmrNotice(nowMs: number): void {
  if (!hmrNotice) {
    return;
  }
  const visible = shouldShowHmrNotice(hmrNoticeState.visibleUntilMs, nowMs);
  hmrNotice.classList.toggle('is-hidden', !visible);
  hmrNotice.hidden = !visible;
  if (visible && hmrNotice.textContent !== hmrNoticeState.message) {
    hmrNotice.textContent = hmrNoticeState.message;
  }
  if (!visible && hmrNotice.textContent !== '') {
    hmrNotice.textContent = '';
  }
}

function formatCycleTime(dayProgress: number): string {
  const totalMinutes = Math.floor(dayProgress * 24 * 60);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function renderCompass(facing: CardinalFacing): string {
  return ['N', 'E', 'S', 'W']
    .map((direction) =>
      direction === facing
        ? `<span class="is-active">${direction}</span>`
        : `<span>${direction}</span>`
    )
    .join('');
}

function formatWeatherSummary(environment: WorldEnvironmentLike): string {
  const current = environment.weather?.current;
  if (!current) {
    return 'Clear';
  }
  return `${current.label} ${Math.round(current.temperature)}\u00b0F, wind ${Math.round(
    current.front.windDirectionDegrees
  )}\u00b0`;
}

function formatForecastSummary(environment: WorldEnvironmentLike): string {
  const forecast = environment.weather?.forecast ?? [];
  if (forecast.length === 0) {
    return 'No forecast available';
  }
  return forecast
    .map(
      (day) =>
        `${day.label} ${day.condition.label} ${day.highTemperature}\u00b0/${day.lowTemperature}\u00b0F`
    )
    .join(' • ');
}

function formatCelestialEventModeLabel(mode: CelestialEventMode): string {
  if (mode === 'aurora') {
    return 'Aurora';
  }
  if (mode === 'meteor-shower') {
    return 'Meteor Shower';
  }
  if (mode === 'comet') {
    return 'Comet';
  }
  if (mode === 'eclipse') {
    return 'Eclipse';
  }
  return 'Auto';
}

function describeActiveCelestialEvents(
  cycle: ReturnType<typeof getDaylightCycleState> & {
    auroraBands?: Array<{ intensity: number }>;
    visibleEvents?: Array<{ type?: string; visibility?: number }>;
    solarEclipse?: { active?: boolean; coverage?: number };
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
    (cycle.solarEclipse?.active ?? false) &&
    (cycle.solarEclipse?.coverage ?? 0) > 0.03
  ) {
    activeEvents.push('Solar eclipse active');
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
    solarEclipse?: { active?: boolean; coverage?: number };
  }
) {
  const details: Array<{
    kind: 'aurora' | 'meteor-shower' | 'comet' | 'eclipse' | 'none';
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
  const eclipseCoverage = cycle.solarEclipse?.active
    ? cycle.solarEclipse.coverage ?? 0
    : 0;

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
  if (eclipseCoverage > 0.03) {
    details.push({
      kind: 'eclipse',
      label: `Eclipse ${(eclipseCoverage * 100).toFixed(0)}%`,
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

function updateDisplayedCycle(
  cycle: ReturnType<typeof getDaylightCycleState>
): DisplayedCycle {
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

function easeWrappedProgress(
  current: number,
  target: number,
  factor: number
): number {
  let delta = target - current;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  const next = current + delta * factor;
  return ((next % 1) + 1) % 1;
}

function updateDisplayedCompass(targetAngle: number): number {
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

function faceDirection(angle: number): void {
  if (compassState.initialized) {
    compassState.velocity += getCompassWobbleBoost(compassState.angle, angle);
  }
  state.player.facing = normalizeAngle(angle);
  saveSession();
  requestRender();
}

function loop(timestamp: number): void {
  pendingFrameHandle = 0;
  const frameStep = runAnimationFrameStep({
    timestamp,
    lastFrameTimestamp: lastFrame,
    pageHidden: pageVisibilityState.hidden,
    requestNextFrame: () => requestRender(),
    runFrame: (deltaMs) => {
      const nextBudgetState = advanceRenderBudgetState(renderBudgetState, {
        deltaMs,
        active3d: state.viewMode === '3d',
        weatherVisibility: latestEnvironment.weather?.current?.visibility,
      });
      renderBudgetState.smoothedFrameMs = nextBudgetState.smoothedFrameMs;
      renderBudgetState.visibilityRadius = nextBudgetState.visibilityRadius;
      renderBudgetState.weatherVisibility = nextBudgetState.weatherVisibility;
      renderBudgetState.weatherVisibilityRadiusCap =
        nextBudgetState.weatherVisibilityRadiusCap;
      renderBudgetState.targetFps = nextBudgetState.targetFps;
      renderBudgetState.currentFrameMs = nextBudgetState.currentFrameMs;
      renderBudgetState.recentFrameMs = nextBudgetState.recentFrameMs;
      renderBudgetState.averageFps = nextBudgetState.averageFps;
      renderBudgetState.worstRecentFrameMs = nextBudgetState.worstRecentFrameMs;
      renderBudgetState.severeFrameStreak = nextBudgetState.severeFrameStreak;
      if (
        shouldAdvanceSimulation({
          timeFrozen: timeState.frozen,
          keys,
          isJumping: motion.isJumping,
        })
      ) {
        updateMovement(deltaMs);
      }
      return render();
    },
  });
  lastFrame = frameStep.lastFrameTimestamp;
  if (frameStep.skipped) {
    return;
  }
}

window.addEventListener('resize', () => {
  resizeCanvas();
  requestRender();
});

document.addEventListener('visibilitychange', () => {
  pageVisibilityState.hidden = document.hidden;
  if (pageVisibilityState.hidden) {
    sessionPersistence.flush();
    lastFrame = 0;
    return;
  }
  requestRender();
});

window.addEventListener('pagehide', () => {
  sessionPersistence.flush();
});

import.meta.hot?.on('vite:beforeUpdate', () => {
  showHmrNotice(getHmrNoticeText('before-update'));
});

import.meta.hot?.on('vite:afterUpdate', () => {
  showHmrNotice(getHmrNoticeText('after-update'));
});

window.addEventListener('keydown', (event) => {
  if (isEditableKeyboardTarget(event.target)) {
    return;
  }
  soundEffects.resume();
  musicController.resume();
  const key = normalizeKeyboardKey(event.key);
  if (
    state.viewMode === '3d' &&
    shouldRestoreViewportFocusForGameplayKey(key)
  ) {
    restore3dViewportKeyboardFocus(state.viewMode, viewport3d);
  }
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
  if (key === 'x') handleTryExit();
  requestRender();

  if (shouldPreventDefaultGameplayKey(event.key)) {
    event.preventDefault();
  }
}, true);

window.addEventListener('keyup', (event) => {
  if (isEditableKeyboardTarget(event.target)) {
    return;
  }
  const key = normalizeKeyboardKey(event.key);
  keys.delete(key);
  if (event.key === ' ') {
    motion.spaceHeld = false;
    motion.spaceReady = true;
  }
  requestRender();
}, true);

toggleButton.addEventListener('click', toggleView);
actionButton.addEventListener('click', handleInteraction);
buildPoiButton?.addEventListener('click', handleBuildPoi);
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
debugApplySeedButton?.addEventListener('click', () => {
  applyWorldSeed(debugSeedInput?.value ?? currentWorldSeed);
});
debugLoadSeedButton?.addEventListener('click', loadSavedWorldSeed);
debugTeleportTileButton?.addEventListener('click', teleportToSelectedTileKind);
debugLevelDownButton?.addEventListener('click', () => {
  setPlayerLevel(normalizePlayerLevel(state.playerLevel) - 1);
});
debugLevelUpButton?.addEventListener('click', () => {
  setPlayerLevel(normalizePlayerLevel(state.playerLevel) + 1);
});
debugDownloadSnapshotButton?.addEventListener('click', downloadCurrentDebugSnapshot);
debugSeedInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    applyWorldSeed(debugSeedInput.value);
  }
});
debugTileKindSelect?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    teleportToSelectedTileKind();
  }
});
modelPreviewWorldButton?.addEventListener('click', () => setModelPreviewMode('world'));
modelPreviewSolarButton?.addEventListener('click', () => setModelPreviewMode('solar-system'));
modelPreviewSplitButton?.addEventListener('click', () => setModelPreviewMode('split'));
eventModeAutoButton?.addEventListener('click', () => setCelestialEventMode('auto'));
eventModeAuroraButton?.addEventListener('click', () => setCelestialEventMode('aurora'));
eventModeMeteorButton?.addEventListener('click', () => setCelestialEventMode('meteor-shower'));
eventModeCometButton?.addEventListener('click', () => setCelestialEventMode('comet'));
eventModeEclipseButton?.addEventListener('click', () => setCelestialEventMode('eclipse'));
toggleTimekeeperDisplayButton?.addEventListener('click', () => {
  setTimekeeperDisplayMode(cycleTimekeeperDisplayMode(activeTimekeeperDisplayMode));
});
toggleCompassDisplayButton?.addEventListener('click', () => {
  setCompassDisplayMode(cycleCompassDisplayMode(activeCompassDisplayMode));
});
toggleMinimapDisplayButton?.addEventListener('click', () => {
  setMinimapDisplayMode(cycleMinimapDisplayMode(activeMinimapDisplayMode));
});
toggleMusicButton?.addEventListener('click', () => {
  toggleAudioPreferenceSetting('musicEnabled');
});
toggleSoundButton?.addEventListener('click', () => {
  toggleAudioPreferenceSetting('soundEnabled');
});
zoomOutMinimapButton?.addEventListener('click', () => adjustMinimapZoom(-0.1));
zoomInMinimapButton?.addEventListener('click', () => adjustMinimapZoom(0.1));
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

viewportStage?.addEventListener('pointerdown', (event) => {
  soundEffects.resume();
  musicController.resume();
  if (
    !shouldRestore3dViewportKeyboardFocusOnPointerDown(
      state.viewMode,
      event.button
    )
  ) {
    return;
  }
  restore3dViewportKeyboardFocus(state.viewMode, viewport3d);
});

viewport3d?.addEventListener('pointerdown', (event) => {
  const activated = restore3dViewportKeyboardFocusOnPointerDown(
    state.viewMode,
    event.button,
    viewport3d
  );
  if (!activated) {
    return;
  }
  mouseLookState.dragging = true;
  mouseLookState.pointerId = event.pointerId;
  mouseLookState.startPointerX = event.clientX;
  mouseLookState.startPointerY = event.clientY;
  mouseLookState.startFacing = state.player.facing;
  mouseLookState.startPitch = mouseLookState.pitch;
  viewport3d.setPointerCapture(event.pointerId);
  viewportStage?.classList.add('is-mouse-looking');
  requestRender();
});

viewport3d?.addEventListener('pointermove', (event) => {
  if (
    state.viewMode !== '3d' ||
    !mouseLookState.dragging ||
    event.pointerId !== mouseLookState.pointerId
  ) {
    return;
  }
  const nextLook = getMouseLookAngles(
    {
      pointerX: mouseLookState.startPointerX,
      pointerY: mouseLookState.startPointerY,
      facing: mouseLookState.startFacing,
      pitch: mouseLookState.startPitch,
    },
    event.clientX,
    event.clientY
  );
  state.player.facing = nextLook.facing;
  mouseLookState.pitch = nextLook.pitch;
  requestRender();
});

const releaseMouseLook = (event: PointerEvent) => {
  if (event.pointerId !== mouseLookState.pointerId) {
    return;
  }
  mouseLookState.dragging = false;
  mouseLookState.pointerId = -1;
  if (viewport3d.hasPointerCapture(event.pointerId)) {
    viewport3d.releasePointerCapture(event.pointerId);
  }
  viewportStage?.classList.remove('is-mouse-looking');
  restore3dViewportKeyboardFocus(state.viewMode, viewport3d);
  saveSession();
  requestRender();
};

viewport3d?.addEventListener('pointerup', releaseMouseLook);
viewport3d?.addEventListener('pointercancel', releaseMouseLook);

resizeCanvas();
syncViewportModeUi();
setInspectorTab(activeInspectorTab);
updateModelPreviewModeUi();
updateTimekeeperDisplayModeUi();
updateCompassDisplayModeUi();
updateMinimapDisplayModeUi();
updateCelestialEventModeUi();
restore3dViewportKeyboardFocus(state.viewMode, viewport3d);
requestRender();

function saveSession(): void {
  sessionPersistence.schedule();
}

function flushSessionSave(): void {
  try {
    const characterProfile = buildCharacterProfileSnapshot();
    const serializedCharacterProfile = serializeCharacterProfile(characterProfile);
    if (serializedCharacterProfile !== lastSavedCharacterSnapshot) {
      characterStorage.saveProfile(characterProfile);
      lastSavedCharacterSnapshot = serializedCharacterProfile;
    }
    const inventoryProfile = buildInventoryProfileSnapshot();
    const serializedInventoryProfile = serializeInventoryProfile(inventoryProfile);
    if (serializedInventoryProfile !== lastSavedInventorySnapshot) {
      inventoryStorage.saveProfile(inventoryProfile);
      lastSavedInventorySnapshot = serializedInventoryProfile;
    }
    const worldMapProfile = buildWorldMapProfileSnapshot();
    const serializedWorldMapProfile = serializeWorldMapProfile(worldMapProfile);
    if (serializedWorldMapProfile !== lastSavedWorldMapSnapshot) {
      worldMapStorage.saveProfile(worldMapProfile);
      lastSavedWorldMapSnapshot = serializedWorldMapProfile;
    }
    const snapshot = serializeSessionSnapshot({
      characterProfile,
      inventoryProfile,
      worldMapProfile,
      player: {
        x: state.player.x,
        y: state.player.y,
        facing: state.player.facing,
      },
      packIds: activePackIds,
      stack: state.stack,
      viewMode: state.viewMode,
      timekeeperDisplayMode: activeTimekeeperDisplayMode,
      compassDisplayMode: activeCompassDisplayMode,
      minimapDisplayMode: activeMinimapDisplayMode,
      minimapZoom,
      timeOffsetMs: timeState.offsetMs,
      timeFrozen: timeState.frozen,
      frozenWorldTimeMs: timeState.frozenWorldTimeMs,
      inspectorTab: activeInspectorTab,
      modelPreviewMode: activeModelPreviewMode,
      celestialEventMode: celestialEventModeState.mode,
      musicEnabled: audioPreferenceState.musicEnabled,
      soundEnabled: audioPreferenceState.soundEnabled,
      compassHeadingAngle: compassHeadingState.angle,
      cameraPitch: mouseLookState.pitch,
      worldSeed: currentWorldSeed,
      playerLevel: normalizePlayerLevel(state.playerLevel),
      playerProfession: state.playerProfession,
      completedQuestIds: [...(state.completedQuestIds ?? [])],
      inventory: [...(state.inventory ?? [])],
      playerPlacedPois: getSavedPlayerPlacedPois(),
    });
    if (snapshot === lastSavedSnapshot) return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, snapshot);
    lastSavedSnapshot = snapshot;
  } catch {
    // Ignore storage write failures so play continues normally.
  }
}

function loadSession(): ReturnType<typeof parseSavedSession> {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  const parsed = parseSavedSession(raw);
  if (!parsed) {
    return null;
  }
  lastSavedSnapshot = raw ?? '';
  return parsed;
}

function buildCharacterProfileSnapshot(): CharacterProfileSnapshot {
  characterRosterState.roster = syncPrimaryPlayerCharacter(characterRosterState.roster, {
    player: {
      x: state.player.x,
      y: state.player.y,
      facing: state.player.facing,
    },
    stack: state.stack,
    worldSeed: currentWorldSeed,
    playerLevel: normalizePlayerLevel(state.playerLevel),
    playerProfession: state.playerProfession,
    completedQuestIds: [...(state.completedQuestIds ?? [])],
  });
  return {
    player: {
      x: state.player.x,
      y: state.player.y,
      facing: state.player.facing,
    },
    packIds: activePackIds,
    stack: state.stack,
    worldSeed: currentWorldSeed,
    playerLevel: normalizePlayerLevel(state.playerLevel),
    playerProfession: state.playerProfession,
    completedQuestIds: [...(state.completedQuestIds ?? [])],
    characterRoster: characterRosterState.roster,
  };
}

function getLegacyCharacterProfile(
  session: ReturnType<typeof parseSavedSession>
): SavedCharacterProfile | null {
  if (!session) {
    return null;
  }
  return {
    player: session.player,
    packIds: session.packIds,
    stack: session.stack,
    worldSeed: session.worldSeed,
    playerLevel: session.playerLevel,
    playerProfession: session.playerProfession,
    completedQuestIds: session.completedQuestIds,
  };
}

function loadCharacterProfile(
  session: ReturnType<typeof parseSavedSession>
): SavedCharacterProfile | null {
  const profile =
    characterStorage.loadProfile() ??
    session?.characterProfile ??
    getLegacyCharacterProfile(session);
  if (!profile) {
    return null;
  }
  const roster = ensurePlayerCharacterRoster(profile.characterRoster ?? null, {
    player: profile.player,
    stack: profile.stack,
    worldSeed: profile.worldSeed ?? DEFAULT_WORLD_SEED,
    playerLevel: normalizePlayerLevel(profile.playerLevel),
    playerProfession: profile.playerProfession,
    completedQuestIds: profile.completedQuestIds ?? [],
  });
  profile.characterRoster = roster;
  lastSavedCharacterSnapshot = serializeCharacterProfile({
    player: profile.player,
    packIds: profile.packIds ?? [],
    stack: profile.stack,
    worldSeed: profile.worldSeed ?? DEFAULT_WORLD_SEED,
    playerLevel: normalizePlayerLevel(profile.playerLevel),
    playerProfession: profile.playerProfession,
    completedQuestIds: [...(profile.completedQuestIds ?? [])],
    characterRoster: roster,
  });
  return profile;
}

function buildInventoryProfileSnapshot(): InventoryProfileSnapshot {
  return {
    items: [...(state.inventory ?? [])],
  };
}

function buildWorldMapProfileSnapshot(): WorldMapProfileSnapshot {
  return {
    playerPlacedPois: getSavedPlayerPlacedPois(),
    preferredServerIds: [...worldMapServerPreferenceState.preferredServerIds],
  };
}

function getLegacyInventoryProfile(
  session: ReturnType<typeof parseSavedSession>
): SavedInventoryProfile | null {
  if (!session) {
    return null;
  }
  return {
    items: session.inventory,
  };
}

function loadInventoryProfile(
  session: ReturnType<typeof parseSavedSession>
): SavedInventoryProfile | null {
  const profile =
    inventoryStorage.loadProfile() ??
    session?.inventoryProfile ??
    getLegacyInventoryProfile(session);
  if (!profile) {
    return null;
  }
  lastSavedInventorySnapshot = serializeInventoryProfile({
    items: [...(profile.items ?? [])],
  });
  return profile;
}

function getLegacyWorldMapProfile(
  session: ReturnType<typeof parseSavedSession>,
  characterProfile: SavedCharacterProfile | null
): SavedWorldMapProfile | null {
  if (!session && !characterProfile) {
    return null;
  }
  return {
    playerPlacedPois:
      session?.playerPlacedPois ??
      characterProfile?.playerPlacedPois ??
      [],
    preferredServerIds: ['local'],
  };
}

function loadWorldMapProfile(
  session: ReturnType<typeof parseSavedSession>
): SavedWorldMapProfile | null {
  const profile =
    worldMapStorage.loadProfile() ??
    session?.worldMapProfile ??
    getLegacyWorldMapProfile(session, savedCharacterProfile);
  if (!profile) {
    return null;
  }
  lastSavedWorldMapSnapshot = serializeWorldMapProfile({
    playerPlacedPois: profile.playerPlacedPois ?? [],
    preferredServerIds:
      profile.preferredServerIds ??
      worldMapStorage.getPreferredServerIds?.() ??
      ['local'],
  });
  return profile;
}
