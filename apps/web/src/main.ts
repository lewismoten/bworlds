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
  WORLD_TILES_WIDE,
  cardinalFromAngle,
  normalizeAngle,
  snapWorldCoordinate,
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
  stabilizeDisplayedDaylightAnchors,
} from './timekeeper.ts';
import {
  describeActiveCelestialEvents,
  getActiveCelestialEventDetails,
  summarizeCelestialEvents,
} from './celestial-event-summary.ts';
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
  SESSION_STORAGE_KEY,
  parseSavedSession,
  serializeSessionSnapshot,
} from './session-state.ts';
import { installDeferredClientErrorSnapshotReporter } from './client-error-snapshot-loader.ts';
import { createTeleportPin, normalizeTeleportPins } from './teleport-pins.ts';
import {
  AUDIO_CATEGORIES,
  getAudioCategoryLabel,
  type AudioCategory,
} from './audio-categories.ts';
import {
  DEFAULT_AUDIO_PREFERENCES,
  formatAudioCategoryVolumeLabel,
  formatAmbianceToggleLabel,
  formatMusicToggleLabel,
  formatSoundToggleLabel,
  normalizeAudioPreferences,
  setAudioCategoryVolume,
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
  formatCompassHeading,
  getCompassDialFacingAngle,
  getCompassDialInteractionMode,
  getCompassDialRadius,
  getCompassHeadingDragPreview,
  getCompassWobbleBoost,
  resolveCompassHeadingRelease,
} from './compass.ts';
import { getFrameLoopActivity } from './frame-loop.ts';
import { createFrameLoopRunner } from './frame-loop-runner.ts';
import { createAnimationFrameRunner } from './frame-scheduler.ts';
import { loadHmrState, saveHmrState } from './hmr-state.ts';
import { advanceHeadBobState, DEFAULT_HEAD_BOB_STATE } from './head-bob.ts';
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
  resolvePerformanceTierForRenderQuality,
  resolvePerformanceTierFromBudgetStatuses,
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
import {
  collectMergedRecentDebugEvents,
  formatRecentDebugEventReason,
  getMostRecentDebugEventByType,
} from './recent-debug-events.ts';
import { shouldCollectDebugSnapshot } from './debug-sampling.ts';
import { collectGraphicsCapabilities } from './graphics-capabilities.ts';
import {
  findRandomTileDestination,
  listTileTeleportOptions,
} from './debug-teleport.ts';
import { resetStateToOverworld } from './overworld-travel.ts';
import { getDebugWorldStats } from './debug-world-stats.ts';
import {
  createRenderBudgetBuilder,
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
import { resolveDialogueMusicDuckingIntensity } from './music-dialogue-ducking.ts';
import {
  createSoundEffectController,
  createWebAudioSoundEffectSink,
  shouldPlayBlockedMovementSound,
} from './sound-effects.ts';
import {
  shouldResolveNearbyEnvironmentalAudioWork,
  shouldResolvePoiMusicWork,
} from './audio-work-gates.ts';
import { createSoundUpdateGate } from './sound-update-gate.ts';
import { findNearestTrafficProfile } from './nearby-traffic.ts';
import {
  getPlayerLevelChange,
  normalizePlayerLevel,
} from './player-progression.ts';
import {
  createMusicController,
  resolveMusicEncounterMode,
  resolvePoiMusicMix,
} from './procedural-music.ts';
import { createWebAudioMusicSink } from './procedural-music-audio-sink.ts';
import { createMusicUpdateGate } from './music-update-gate.ts';
import { createEnvironmentFrameCache } from './environment-frame-cache.ts';
import { createCycleFrameCache } from './cycle-frame-cache.ts';
import { createDebouncedPersistence } from './debounced-persistence.ts';
import { createBoundedCache } from './bounded-cache.ts';
import { getPlayerSpatialSummary } from './player-spatial-summary.ts';
import { createPlayerSpatialSummaryCache } from './player-spatial-summary-cache.ts';
import { resolveCompassFrameState } from './compass-frame-state.ts';
import {
  createNearbyOverworldQueryStateCache,
  getNearbyOverworldQueryState,
} from './nearby-overworld-query.ts';
import {
  findNearbyAmbientProfile,
  type NearbyAmbientProfile,
} from './nearby-ambient.ts';
import {
  buildSextantMarkup,
  buildEventSummaryMarkup,
  buildTextViewportMarkup,
  getCompassMiniSignature,
  getDetailLabels,
  getEventSummarySignature,
  getMinimapMiniSignature,
  getSextantSignature,
  getTextViewportSignature,
  getTimekeeperMiniSignature,
  getViewportHudSignature,
} from './ui-signatures.ts';
import { annotateTextViewportGridWithVisibleTileLods } from './text-viewport-lod.ts';
import { createViewportHudView } from './status-view.ts';
import { getViewportRenderSize } from './viewport-resize.ts';
import {
  loadPersistedPageScrollY,
  restorePersistedPageScrollY,
  savePersistedPageScrollY,
} from './page-scroll-state.ts';
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
  isInspectorSectionVisible,
  isModelPreviewVisible,
  getTimePresetProgress,
} from './time-controls.ts';

type CelestialEnvironmentOverrides = Parameters<
  typeof applyCelestialEnvironmentOverrides
>[1];
type CompassDisplayMode = ReturnType<typeof getNextCompassDisplayMode>;
type MinimapDisplayMode = ReturnType<typeof getNextMinimapDisplayMode>;
type ModelPreviewMode = ReturnType<typeof getNextModelPreviewMode>;
type TimekeeperDisplayMode = ReturnType<typeof getNextTimekeeperDisplayMode>;
type CelestialEventMode = ReturnType<typeof getNextCelestialEventMode>;
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

const CHARACTER_STORAGE_KEY = 'bworlds:character';
const INVENTORY_STORAGE_KEY = 'bworlds:inventory';
const WORLD_MAP_STORAGE_KEY = 'bworlds:world-map';
const DEFAULT_WORLD_SEED = 'bworlds-alpha';
const builtinPackCatalog = createBuiltinContentPackCatalog();
const builtinPackManifests = builtinPackCatalog.list();
const REQUIRED_PACK_ID = 'default-content-pack';
const MAIN_PAGE_SCROLL_STORAGE_KEY = 'bworlds:main-page-scroll';
const MAIN_PAGE_HMR_STATE_KEY = 'bworlds:main-page-hmr';

const root = document.querySelector<HTMLElement>('#app');
const mainPageScrollStorage = globalThis.sessionStorage ?? null;
const initialMainPageHmrState = loadHmrState<{
  scrollY: number;
  sessionSnapshot: string | null;
}>(import.meta.hot, MAIN_PAGE_HMR_STATE_KEY);
const initialMainPageScrollY =
  initialMainPageHmrState?.scrollY ??
  loadPersistedPageScrollY(mainPageScrollStorage, MAIN_PAGE_SCROLL_STORAGE_KEY);

root.innerHTML = `
  <main class="shell">
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
          <div
            id="viewport-minimap-controls"
            class="viewport-minimap-controls is-hidden"
            aria-hidden="true"
            hidden
          >
            <button id="zoom-in-minimap" type="button" title="Zoom the mini map in">+</button>
            <button id="zoom-out-minimap" type="button" title="Zoom the mini map out">-</button>
          </div>
          <div id="viewport-hud" class="viewport-hud"></div>
        </div>
      </div>
      <aside class="sidebar">
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
                id="tab-build"
                class="inspector-tab"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="panel-build"
              >
                Build
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
              <button
                id="toggle-timekeeper-display"
                class="inspector-icon-button"
                type="button"
                title="Toggle the timekeeper HUD display"
                aria-label="Toggle the timekeeper HUD display"
              >
                ⏲
              </button>
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
            id="panel-build"
            class="inspector-panel is-hidden"
            role="tabpanel"
            aria-hidden="true"
            hidden
          >
            <div class="build-controls build-controls-panel">
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
            <p class="inspector-note">
              Build a nearby landmark or settlement on a valid overworld tile.
            </p>
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
            <div class="time-toggle-row">
              <button
                id="toggle-compass-display"
                class="inspector-icon-button"
                type="button"
                title="Toggle the compass HUD display"
                aria-label="Toggle the compass HUD display"
              >
                ⊕
              </button>
            </div>
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
              <button id="debug-freeze-lod-toggle" type="button">
                Freeze LOD
              </button>
              <button id="debug-show-cached-models-toggle" type="button">
                Show Cached LOD
              </button>
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
      </aside>
    </section>
    <section class="control-dock card" aria-label="Quick controls">
      <div class="dock-row">
        <button
          id="view-menu-button"
          class="dock-icon-button"
          type="button"
          title="Choose a viewport mode"
          aria-label="Choose a viewport mode"
        >
          ▣
        </button>
        <button
          id="action"
          class="dock-icon-button dock-icon-button-emphasis"
          type="button"
          title="Interact with the current tile"
          aria-label="Interact with the current tile"
        >
          ✦
        </button>
        <div class="dock-split-button">
          <button
            id="jump-random"
            class="dock-icon-button"
            type="button"
            title="Jump to a random location"
            aria-label="Jump to a random location"
          >
            ⤮
          </button>
          <button
            id="jump-random-menu-button"
            class="dock-icon-button dock-icon-button-arrow"
            type="button"
            title="Choose a random destination type"
            aria-label="Choose a random destination type"
          >
            ▾
          </button>
        </div>
        <button
          id="teleport-menu-button"
          class="dock-icon-button"
          type="button"
          title="Open teleport destinations"
          aria-label="Open teleport destinations"
        >
          ⌖
        </button>
        <button
          id="toggle-minimap-display"
          class="dock-icon-button"
          type="button"
          title="Toggle the mini map HUD"
          aria-label="Toggle the mini map HUD"
        >
          ▤
        </button>
        <button
          id="settings-button"
          class="dock-icon-button"
          type="button"
          title="Open settings"
          aria-label="Open settings"
        >
          ⚙
        </button>
      </div>
    </section>
    <dialog id="view-dialog" class="control-dialog">
      <form method="dialog" class="control-dialog-shell">
        <div class="control-dialog-head">
          <div>
            <h2>View Modes</h2>
            <p>Choose the active viewport. More experimental modes can slot in here later.</p>
          </div>
          <button type="submit" class="dialog-close-button" aria-label="Close view modes">✕</button>
        </div>
        <div class="view-mode-grid">
          <button id="view-mode-2d" type="button" class="view-mode-card" data-view-mode="2d">2D Map</button>
          <button id="view-mode-3d" type="button" class="view-mode-card" data-view-mode="3d">3D World</button>
          <button id="view-mode-text" type="button" class="view-mode-card" data-view-mode="text">Text</button>
          <button type="button" class="view-mode-card" disabled title="Coming later">Ortho</button>
          <button type="button" class="view-mode-card" disabled title="Coming later">Blobber</button>
          <button type="button" class="view-mode-card" disabled title="Coming later">Zoom Map</button>
        </div>
      </form>
    </dialog>
    <dialog id="random-dialog" class="control-dialog">
      <form method="dialog" class="control-dialog-shell">
        <div class="control-dialog-head">
          <div>
            <h2>Random Destination</h2>
            <p>Jump anywhere or bias the search toward a specific terrain.</p>
          </div>
          <button type="submit" class="dialog-close-button" aria-label="Close random destinations">✕</button>
        </div>
        <div class="view-mode-grid">
          <button id="random-any" type="button" class="view-mode-card">Anywhere</button>
          <button id="random-plains" type="button" class="view-mode-card">Plains</button>
          <button id="random-forest" type="button" class="view-mode-card">Forest</button>
          <button id="random-mountain" type="button" class="view-mode-card">Mountain</button>
          <button id="random-river" type="button" class="view-mode-card">River</button>
          <button id="random-ocean" type="button" class="view-mode-card">Ocean</button>
          <button id="random-town" type="button" class="view-mode-card">Town</button>
          <button id="random-ruins" type="button" class="view-mode-card">Ruins</button>
        </div>
      </form>
    </dialog>
    <dialog id="teleport-dialog" class="control-dialog">
      <form method="dialog" class="control-dialog-shell">
        <div class="control-dialog-head">
          <div>
            <h2>Teleport</h2>
            <p>Jump home, use saved pins, or enter world or GPS coordinates.</p>
          </div>
          <button type="submit" class="dialog-close-button" aria-label="Close teleport">✕</button>
        </div>
        <div class="teleport-actions">
          <button id="teleport-home" type="button">Home</button>
        </div>
        <div class="teleport-grid">
          <label class="teleport-field">
            <span>World X</span>
            <input id="teleport-world-x" type="number" step="0.1" />
          </label>
          <label class="teleport-field">
            <span>World Y</span>
            <input id="teleport-world-y" type="number" step="0.1" />
          </label>
          <button id="teleport-world-submit" type="button">Jump To World</button>
          <label class="teleport-field">
            <span>Latitude</span>
            <input id="teleport-gps-latitude" type="number" step="0.0001" min="-90" max="90" />
          </label>
          <label class="teleport-field">
            <span>Longitude</span>
            <input id="teleport-gps-longitude" type="number" step="0.0001" min="-180" max="180" />
          </label>
          <button id="teleport-gps-submit" type="button">Jump To GPS</button>
        </div>
        <div class="teleport-save-grid">
          <label class="teleport-field teleport-field-wide">
            <span>Save Current Location</span>
            <input
              id="teleport-pin-name"
              type="text"
              maxlength="40"
              placeholder="Camp, Cave Entrance, Hidden Tower..."
            />
          </label>
          <button id="teleport-pin-save" type="button">Save Pin</button>
        </div>
        <div class="teleport-pin-list-shell">
          <h3>Pinned Locations</h3>
          <div id="teleport-pin-list" class="teleport-pin-list"></div>
        </div>
      </form>
    </dialog>
    <dialog id="settings-dialog" class="control-dialog">
      <form method="dialog" class="control-dialog-shell">
        <div class="control-dialog-head">
          <div>
            <h2>Settings</h2>
            <p>Audio, HUD, and comfort controls live here instead of the main dock.</p>
          </div>
          <button type="submit" class="dialog-close-button" aria-label="Close settings">✕</button>
        </div>
        <div class="settings-toggle-grid">
          <button id="toggle-music" type="button">Music: On</button>
          <button id="toggle-sound" type="button">Sound: On</button>
          <button id="toggle-ambiance" type="button">Ambiance: On</button>
          <button id="toggle-runtime-performance-tracking" type="button">
            Runtime Performance Tracking: On
          </button>
        </div>
        <div class="audio-volume-controls" aria-label="Audio volume controls">
          <label class="audio-volume-control" for="audio-volume-music">
            <span>Music Volume</span>
            <div class="audio-volume-row">
              <input id="audio-volume-music" type="range" min="0" max="100" step="5" value="100" />
              <output id="audio-volume-music-value" for="audio-volume-music">100%</output>
            </div>
          </label>
          <label class="audio-volume-control" for="audio-volume-ui">
            <span>UI Volume</span>
            <div class="audio-volume-row">
              <input id="audio-volume-ui" type="range" min="0" max="100" step="5" value="100" />
              <output id="audio-volume-ui-value" for="audio-volume-ui">100%</output>
            </div>
          </label>
          <label class="audio-volume-control" for="audio-volume-speech">
            <span>Speech Volume</span>
            <div class="audio-volume-row">
              <input id="audio-volume-speech" type="range" min="0" max="100" step="5" value="100" />
              <output id="audio-volume-speech-value" for="audio-volume-speech">100%</output>
            </div>
          </label>
          <label class="audio-volume-control" for="audio-volume-combat">
            <span>Combat Volume</span>
            <div class="audio-volume-row">
              <input id="audio-volume-combat" type="range" min="0" max="100" step="5" value="100" />
              <output id="audio-volume-combat-value" for="audio-volume-combat">100%</output>
            </div>
          </label>
          <label class="audio-volume-control" for="audio-volume-environment">
            <span>Environment Volume</span>
            <div class="audio-volume-row">
              <input id="audio-volume-environment" type="range" min="0" max="100" step="5" value="100" />
              <output id="audio-volume-environment-value" for="audio-volume-environment">100%</output>
            </div>
          </label>
          <label class="audio-volume-control" for="audio-volume-creatures">
            <span>Creatures Volume</span>
            <div class="audio-volume-row">
              <input id="audio-volume-creatures" type="range" min="0" max="100" step="5" value="100" />
              <output id="audio-volume-creatures-value" for="audio-volume-creatures">100%</output>
            </div>
          </label>
        </div>
      </form>
    </dialog>
  </main>
  <div class="app-utility-storage" aria-hidden="true">
    <div
      id="hmr-notice"
      class="hmr-notice is-hidden"
      aria-live="polite"
      hidden
    ></div>
    <canvas id="atlas" width="256" height="256" hidden></canvas>
  </div>
`;

const viewport2d = document.querySelector<HTMLCanvasElement>('#viewport-2d');
const viewportStage = document.querySelector<HTMLElement>('#viewport-stage');
const viewport3d = document.querySelector<HTMLElement>('#viewport-3d');
const viewportText = document.querySelector<HTMLElement>('#viewport-text');
const viewportHud = document.querySelector<HTMLElement>('#viewport-hud');
const viewportHudView = viewportHud ? createViewportHudView(viewportHud) : null;
const viewportTimekeeperMini = document.querySelector<HTMLCanvasElement>(
  '#viewport-timekeeper-mini'
);
const viewportCompassMini = document.querySelector<HTMLCanvasElement>(
  '#viewport-compass-mini'
);
const viewportMinimapMini = document.querySelector<HTMLCanvasElement>(
  '#viewport-minimap-mini'
);
const hmrNotice = document.querySelector<HTMLElement>('#hmr-notice');
const pageLifecycleAbortController =
  typeof AbortController === 'function' ? new AbortController() : null;
const pageLifecycleSignal = pageLifecycleAbortController?.signal;
const scheduleMainAfterPaint =
  globalThis.requestAnimationFrame?.bind(globalThis) ??
  ((callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 0));
scheduleMainAfterPaint(() => {
  restorePersistedPageScrollY(initialMainPageScrollY);
});
const atlasCanvas = document.querySelector<HTMLCanvasElement>('#atlas');
const timeWheelCanvas =
  document.querySelector<HTMLCanvasElement>('#time-wheel');
const celestialPreviewHost =
  document.querySelector<HTMLElement>('#celestial-preview');
const solarSystemPreviewHost = document.querySelector<HTMLElement>(
  '#solar-system-preview'
);
const compassDialCanvas =
  document.querySelector<HTMLCanvasElement>('#compass-dial');
const faceNorthButton =
  document.querySelector<HTMLButtonElement>('#face-north');
const faceEastButton = document.querySelector<HTMLButtonElement>('#face-east');
const faceSouthButton =
  document.querySelector<HTMLButtonElement>('#face-south');
const faceWestButton = document.querySelector<HTMLButtonElement>('#face-west');
const viewMenuButton =
  document.querySelector<HTMLButtonElement>('#view-menu-button');
const viewDialog = document.querySelector<HTMLDialogElement>('#view-dialog');
const viewModeButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-view-mode]')
);
const randomMenuButton = document.querySelector<HTMLButtonElement>(
  '#jump-random-menu-button'
);
const randomDialog =
  document.querySelector<HTMLDialogElement>('#random-dialog');
const teleportMenuButton = document.querySelector<HTMLButtonElement>(
  '#teleport-menu-button'
);
const teleportDialog =
  document.querySelector<HTMLDialogElement>('#teleport-dialog');
const settingsButton =
  document.querySelector<HTMLButtonElement>('#settings-button');
const settingsDialog =
  document.querySelector<HTMLDialogElement>('#settings-dialog');
const toggleTimekeeperDisplayButton = document.querySelector<HTMLButtonElement>(
  '#toggle-timekeeper-display'
);
const toggleCompassDisplayButton = document.querySelector<HTMLButtonElement>(
  '#toggle-compass-display'
);
const toggleMinimapDisplayButton = document.querySelector<HTMLButtonElement>(
  '#toggle-minimap-display'
);
const toggleMusicButton =
  document.querySelector<HTMLButtonElement>('#toggle-music');
const toggleSoundButton =
  document.querySelector<HTMLButtonElement>('#toggle-sound');
const toggleAmbianceButton =
  document.querySelector<HTMLButtonElement>('#toggle-ambiance');
const toggleRuntimePerformanceTrackingButton =
  document.querySelector<HTMLButtonElement>(
    '#toggle-runtime-performance-tracking'
  );
const audioCategoryVolumeInputs = new Map<
  AudioCategory,
  HTMLInputElement | null
>(
  AUDIO_CATEGORIES.map((category) => [
    category,
    document.querySelector<HTMLInputElement>(`#audio-volume-${category}`),
  ])
);
const audioCategoryVolumeOutputs = new Map<
  AudioCategory,
  HTMLOutputElement | null
>(
  AUDIO_CATEGORIES.map((category) => [
    category,
    document.querySelector<HTMLOutputElement>(
      `#audio-volume-${category}-value`
    ),
  ])
);
const zoomOutMinimapButton =
  document.querySelector<HTMLButtonElement>('#zoom-out-minimap');
const zoomInMinimapButton =
  document.querySelector<HTMLButtonElement>('#zoom-in-minimap');
const viewportMinimapControls = document.querySelector<HTMLElement>(
  '#viewport-minimap-controls'
);
const actionButton = document.querySelector<HTMLButtonElement>('#action');
const buildPoiButton = document.querySelector<HTMLButtonElement>('#build-poi');
const buildPoiKindSelect =
  document.querySelector<HTMLSelectElement>('#build-poi-kind');
const randomJumpButton =
  document.querySelector<HTMLButtonElement>('#jump-random');
const teleportHomeButton =
  document.querySelector<HTMLButtonElement>('#teleport-home');
const teleportWorldXInput =
  document.querySelector<HTMLInputElement>('#teleport-world-x');
const teleportWorldYInput =
  document.querySelector<HTMLInputElement>('#teleport-world-y');
const teleportWorldSubmitButton = document.querySelector<HTMLButtonElement>(
  '#teleport-world-submit'
);
const teleportGpsLatitudeInput = document.querySelector<HTMLInputElement>(
  '#teleport-gps-latitude'
);
const teleportGpsLongitudeInput = document.querySelector<HTMLInputElement>(
  '#teleport-gps-longitude'
);
const teleportGpsSubmitButton = document.querySelector<HTMLButtonElement>(
  '#teleport-gps-submit'
);
const teleportPinNameInput =
  document.querySelector<HTMLInputElement>('#teleport-pin-name');
const teleportPinSaveButton =
  document.querySelector<HTMLButtonElement>('#teleport-pin-save');
const teleportPinList =
  document.querySelector<HTMLElement>('#teleport-pin-list');
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
const modelMinusSeasonButton = document.querySelector<HTMLButtonElement>(
  '#model-minus-season'
);
const modelPlusSeasonButton =
  document.querySelector<HTMLButtonElement>('#model-plus-season');
const modelPreviewWorldButton = document.querySelector<HTMLButtonElement>(
  '#model-preview-world'
);
const modelPreviewSolarButton = document.querySelector<HTMLButtonElement>(
  '#model-preview-solar'
);
const modelPreviewSplitButton = document.querySelector<HTMLButtonElement>(
  '#model-preview-split'
);
const eventModeAutoButton =
  document.querySelector<HTMLButtonElement>('#event-mode-auto');
const eventModeAuroraButton =
  document.querySelector<HTMLButtonElement>('#event-mode-aurora');
const eventModeMeteorButton = document.querySelector<HTMLButtonElement>(
  '#event-mode-meteor-shower'
);
const eventModeCometButton =
  document.querySelector<HTMLButtonElement>('#event-mode-comet');
const eventModeEclipseButton = document.querySelector<HTMLButtonElement>(
  '#event-mode-eclipse'
);
const modelPreviewGrid = document.querySelector<HTMLElement>(
  '.model-preview-grid'
);
const modelPreviewWorldCard = document.querySelector<HTMLElement>(
  '#model-preview-card-world'
);
const modelPreviewSolarCard = document.querySelector<HTMLElement>(
  '#model-preview-card-solar'
);
const eventSummary = document.querySelector<HTMLElement>('#event-summary');
const sextantSummary = document.querySelector<HTMLElement>('#sextant-summary');
const debugSummary = document.querySelector<HTMLElement>('#debug-summary');
const debugSeedInput =
  document.querySelector<HTMLInputElement>('#debug-seed-input');
const debugApplySeedButton =
  document.querySelector<HTMLButtonElement>('#debug-apply-seed');
const debugLoadSeedButton =
  document.querySelector<HTMLButtonElement>('#debug-load-seed');
const debugTileKindSelect =
  document.querySelector<HTMLSelectElement>('#debug-tile-kind');
const debugTeleportTileButton = document.querySelector<HTMLButtonElement>(
  '#debug-teleport-tile'
);
const debugLevelDownButton =
  document.querySelector<HTMLButtonElement>('#debug-level-down');
const debugLevelUpButton =
  document.querySelector<HTMLButtonElement>('#debug-level-up');
const debugFreezeLodButton = document.querySelector<HTMLButtonElement>(
  '#debug-freeze-lod-toggle'
);
const debugShowCachedModelsButton = document.querySelector<HTMLButtonElement>(
  '#debug-show-cached-models-toggle'
);
const debugDownloadSnapshotButton = document.querySelector<HTMLButtonElement>(
  '#debug-download-snapshot'
);
const freezeTimeButton = document.querySelector<HTMLButtonElement>(
  '#time-freeze-toggle'
);
const celestialToolsCard = document.querySelector<HTMLElement>(
  '#celestial-tools-card'
);
const inspectorTabButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('.inspector-tab')
);
const sidebarCards = Array.from(
  document.querySelectorAll<HTMLElement>('.sidebar > .card')
);
const inspectorPanels = {
  timekeeper: document.querySelector<HTMLElement>('#panel-timekeeper'),
  build: document.querySelector<HTMLElement>('#panel-build'),
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

const savedSession = loadSession(
  initialMainPageHmrState?.sessionSnapshot ?? null
);
const savedCharacterProfile = loadCharacterProfile(savedSession);
const savedInventoryProfile = loadInventoryProfile(savedSession);
const savedWorldMapProfile = loadWorldMapProfile(savedSession);
const worldMapServerPreferenceState = {
  preferredServerIds: normalizePreferredWorldMapServerIds(
    savedWorldMapProfile?.preferredServerIds ??
      worldMapStorage.getPreferredServerIds?.() ?? ['local'],
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
const initialWorldGenerationStartedAtMs = performance.now();
let runtime = createWorldRuntime({
  seed: currentWorldSeedHash,
  packIds: activePackIds,
  player: savedCharacterProfile?.player ?? savedSession?.player,
  stack: savedCharacterProfile?.stack ?? savedSession?.stack,
  viewMode: getNextViewMode(savedSession?.viewMode),
});
const initialWorldGenerationMs =
  performance.now() - initialWorldGenerationStartedAtMs;
let { contentPacks: activePacks, generator, registry, state } = runtime;
state.playerLevel = normalizePlayerLevel(
  savedCharacterProfile?.playerLevel ?? savedSession?.playerLevel
);
state.playerProfession = savedCharacterProfile?.playerProfession;
state.completedQuestIds = [...(savedCharacterProfile?.completedQuestIds ?? [])];
const characterRosterState = {
  roster: ensurePlayerCharacterRoster(
    savedCharacterProfile?.characterRoster ?? null,
    {
      player:
        savedCharacterProfile?.player ?? savedSession?.player ?? state.player,
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
    }
  ),
};
(
  state as typeof state & {
    characterRoster?: PlayerCharacterRosterSnapshot;
    activeCharacterIds?: string[];
  }
).characterRoster = characterRosterState.roster;
(
  state as typeof state & {
    activeCharacterIds?: string[];
  }
).activeCharacterIds = [...characterRosterState.roster.activeCharacterIds];
state.inventory = [
  ...(savedInventoryProfile?.items ?? savedSession?.inventory ?? []),
];
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
    null | {
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
    null | {
      progress?: number;
      emitter: { x: number; y: number };
    }
  >(48),
  profile: null as null | {
    progress?: number;
    emitter: { x: number; y: number };
  },
};
const nearbyPaddleBoatAudioState = {
  cache: createBoundedCache<
    string,
    null | {
      progress?: number;
      whistlePhase?: 'arrival' | 'departure';
      emitter: { x: number; y: number };
    }
  >(48),
  profile: null as null | {
    progress?: number;
    whistlePhase?: 'arrival' | 'departure';
    emitter: { x: number; y: number };
  },
};
const nearbyAmbientAudioState = {
  cache: createBoundedCache<string, NearbyAmbientProfile | null>(48),
  profile: null as NearbyAmbientProfile | null,
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
const MOON_PHASE_ILLUMINATIONS = [
  0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25,
] as const;

drawAtlas(atlasCanvas.getContext('2d'));
const renderer3d = create3DRenderer(viewport3d);
const audioPreferenceState = {
  ...normalizeAudioPreferences(savedSession ?? DEFAULT_AUDIO_PREFERENCES),
};
const runtimePerformanceTrackingState = {
  enabled: savedSession?.runtimePerformanceTrackingEnabled ?? true,
  initialWorldGenerationMs,
  startupReported: false,
  lastReportedContextId: null as string | null,
  lastIssueSampleNowMs: null as number | null,
};
type RuntimePerformanceSnapshotTrigger = 'startup' | 'region-change';
const RUNTIME_PERFORMANCE_ISSUE_SAMPLE_INTERVAL_MS = 2_000;
let runtimePerformanceIssueReporterPromise: Promise<
  (
    issue:
      | import('./runtime-performance-issue.ts').RuntimePerformanceIssueReport
      | null
  ) => Promise<boolean>
> | null = null;
installDeferredClientErrorSnapshotReporter({
  tracking: () => runtimePerformanceTrackingState,
  eventTarget: window,
  abortSignal: pageLifecycleSignal,
});
function getAudioCategoryVolume(category: AudioCategory): number {
  return audioPreferenceState.categoryVolumes[category];
}
const soundEffects = createEnabledSoundEffectController(
  createSoundEffectController(
    createWebAudioSoundEffectSink({
      getCategoryVolume: getAudioCategoryVolume,
    })
  ),
  () => audioPreferenceState.soundEnabled
);
const gateSoundUpdate = createSoundUpdateGate();
const musicController = createEnabledMusicController(
  createMusicController(
    createWebAudioMusicSink({
      getCategoryVolume: getAudioCategoryVolume,
    })
  ),
  () => audioPreferenceState.musicEnabled
);
const gateMusicUpdate = createMusicUpdateGate();
const sessionPersistence = createDebouncedPersistence(flushSessionSave);
const celestialPreview = createCelestialPreviewRenderer(celestialPreviewHost, {
  onRenderRequested: () => requestRender(),
});
const solarSystemPreview = createSolarSystemPreviewRenderer(
  solarSystemPreviewHost,
  {
    onRenderRequested: () => requestRender(),
  }
);
let activeInspectorTab = getInitialInspectorTab(
  savedSession?.inspectorTab,
  urlSearchParams.get('inspector') ?? undefined
);
let activeModelPreviewMode = getNextModelPreviewMode(
  savedSession?.modelPreviewMode
);
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
let teleportPins = normalizeTeleportPins(savedSession?.teleportPins);
const celestialEventModeState = {
  mode: getNextCelestialEventMode(savedSession?.celestialEventMode),
};
const uiRenderState = {
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
const VIEWPORT_HUD_DOM_UPDATE_INTERVAL_MS = 250;
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
const debugTileLodState = {
  selectionFrozen: false,
  showCachedModelAvailability: false,
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
  (import.meta.env as Record<string, string | undefined>).VITE_GIT_COMMIT ??
  null;
const resolveCachedEnvironment = createEnvironmentFrameCache(({ timeMs }) =>
  registry.resolveWorldEnvironment({
    state,
    timeMs,
  })
);
const resolveCachedCycle = createCycleFrameCache(
  ({ timeMs, cycleConfig, celestialOverrides }) =>
    applyCelestialEnvironmentOverrides(
      getDaylightCycleState(timeMs, cycleConfig ?? {}),
      (celestialOverrides ?? {}) as CelestialEnvironmentOverrides
    )
);
const resolveCachedPlayerSpatialSummary = createPlayerSpatialSummaryCache(
  getPlayerSpatialSummary
);
const resolveCachedNearbyOverworldQueryState =
  createNearbyOverworldQueryStateCache(getNearbyOverworldQueryState);
const buildReusableRenderBudget = createRenderBudgetBuilder();
let latestEnvironment: WorldEnvironmentLike = getCurrentEnvironment();

(state as typeof state & { celestialEventMode?: string }).celestialEventMode =
  celestialEventModeState.mode;

const keys = new Set<string>();
const runLoopFrame = createFrameLoopRunner({
  renderBudgetState,
  getDrawCalls: () => renderer3d.getDrawCalls(),
  getMaxChunkDrawCalls: () => renderer3d.getMaxChunkDrawCalls(),
  getMaxChunkObjects: () => renderer3d.getMaxChunkObjects(),
  getMaxChunkMeshes: () => renderer3d.getMaxChunkMeshes(),
  getMaxChunkTriangles: () => renderer3d.getMaxChunkTriangles(),
  getLightCount: () => renderer3d.getLightCount(),
  getShadowLightCount: () => renderer3d.getShadowLightCount(),
  getMaterialCount: () => renderer3d.getMaterialCount(),
  getTextureCount: () => renderer3d.getTextureCount(),
  getVisibleObjectCount: () => renderer3d.getVisibleObjectCount(),
  getEstimatedGpuMemoryBytes: () => renderer3d.getEstimatedGpuMemoryBytes(),
  getVisibleTriangleCount: () => renderer3d.getVisibleTriangleCount(),
  getVisibleVertexCount: () => renderer3d.getVisibleVertexCount(),
  getVisibleMeshCount: () => renderer3d.getVisibleMeshCount(),
  getWeatherVisibility: () => latestEnvironment.weather?.current?.visibility,
  is3dViewActive: () => state.viewMode === '3d',
  isTimeFrozen: () => timeState.frozen,
  keys,
  isJumping: () => motion.isJumping,
  updateMovement,
  render,
});

updateFreezeTimeButton();
updateFreezeLodButton();
updateShowCachedModelsButton();
updateViewModeUi();
updateTimekeeperDisplayModeUi();
updateCompassDisplayModeUi();
updateMinimapDisplayModeUi();
updateAudioPreferenceUi();
updateRuntimePerformanceTrackingUi();
if (debugSeedInput) {
  debugSeedInput.value = currentWorldSeed;
}
updateDebugTeleportOptions();

function updateViewModeUi(): void {
  viewModeButtons.forEach((button) => {
    const mode = button.dataset.viewMode;
    const isActive = mode === state.viewMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function updateStatus(
  spatial = resolveCachedPlayerSpatialSummary(state),
  environment: WorldEnvironmentLike = getCurrentEnvironment(),
  cycle = getCurrentCycle(environment)
) {
  const nowMs = performance.now();
  const tile = spatial.tile;
  const context = spatial.context;
  const facing = cardinalFromAngle(spatial.facing);
  const timeLabel = formatCycleTime(cycle.dayProgress);
  const dateLabel = getCelestialDateLabel(cycle);
  const interactionPrompt = getInteractionPromptFromResolvedState({
    map: state.getCurrentMap(),
    player: { x: spatial.playerX, y: spatial.playerY },
    tile,
    contextLabel: context.label,
  });
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
        VIEWPORT_HUD_DOM_UPDATE_INTERVAL_MS
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
    viewportTimekeeperMini.classList.toggle(
      'is-hidden',
      !showGraphicTimekeeper
    );
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
  const viewportSize = getViewportRenderSize(viewportStage, viewport2d);
  viewport2d.width = Math.floor(viewportSize.width * ratio);
  viewport2d.height = Math.floor(viewportSize.height * ratio);
  if (compassDialCanvas) {
    const compassSize = Math.floor(320 * ratio);
    compassDialCanvas.width = compassSize;
    compassDialCanvas.height = compassSize;
    compassDialCanvas.style.width = '100%';
    compassDialCanvas.style.maxWidth = '320px';
  }
  renderer3d.resize(viewportSize.width, viewportSize.height, ratio);
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
  const showSolar = isModelPreviewVisible(
    activeModelPreviewMode,
    'solar-system'
  );
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

function cycleTimekeeperDisplayMode(
  mode: TimekeeperDisplayMode
): TimekeeperDisplayMode {
  if (mode === 'hidden') return 'time';
  if (mode === 'time') return 'time-date';
  if (mode === 'time-date') return 'graphical';
  return 'hidden';
}

function updateTimekeeperDisplayModeUi(): void {
  if (toggleTimekeeperDisplayButton) {
    const label = `HUD Time: ${formatTimekeeperDisplayModeLabel(
      activeTimekeeperDisplayMode
    )}`;
    toggleTimekeeperDisplayButton.textContent = '⏲';
    toggleTimekeeperDisplayButton.title = label;
    toggleTimekeeperDisplayButton.setAttribute('aria-label', label);
    toggleTimekeeperDisplayButton.classList.toggle(
      'is-active',
      activeTimekeeperDisplayMode !== 'hidden'
    );
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
    const label = `HUD Compass: ${formatCompassDisplayModeLabel(
      activeCompassDisplayMode
    )}`;
    toggleCompassDisplayButton.textContent = '⊕';
    toggleCompassDisplayButton.title = label;
    toggleCompassDisplayButton.setAttribute('aria-label', label);
    toggleCompassDisplayButton.classList.toggle(
      'is-active',
      activeCompassDisplayMode !== 'hidden'
    );
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
    const label = `Mini Map: ${formatMinimapDisplayModeLabel(
      activeMinimapDisplayMode
    )}`;
    toggleMinimapDisplayButton.textContent = '▤';
    toggleMinimapDisplayButton.title = label;
    toggleMinimapDisplayButton.setAttribute('aria-label', label);
    toggleMinimapDisplayButton.classList.toggle(
      'is-active',
      activeMinimapDisplayMode !== 'hidden'
    );
  }
  if (viewportMinimapControls) {
    const showMinimap =
      state.viewMode === '3d' && activeMinimapDisplayMode === 'graphical';
    viewportMinimapControls.classList.toggle('is-hidden', !showMinimap);
    viewportMinimapControls.hidden = !showMinimap;
    viewportMinimapControls.setAttribute('aria-hidden', String(!showMinimap));
  }
  if (zoomOutMinimapButton) {
    zoomOutMinimapButton.disabled =
      activeMinimapDisplayMode === 'hidden' || minimapZoom <= 0.7;
  }
  if (zoomInMinimapButton) {
    zoomInMinimapButton.disabled =
      activeMinimapDisplayMode === 'hidden' || minimapZoom >= 2;
  }
}

function updateAudioPreferenceUi(): void {
  if (toggleMusicButton) {
    const label = formatMusicToggleLabel(audioPreferenceState.musicEnabled);
    toggleMusicButton.textContent = label;
    toggleMusicButton.title = label;
    toggleMusicButton.classList.toggle(
      'is-active',
      audioPreferenceState.musicEnabled
    );
  }
  if (toggleSoundButton) {
    const label = formatSoundToggleLabel(audioPreferenceState.soundEnabled);
    toggleSoundButton.textContent = label;
    toggleSoundButton.title = label;
    toggleSoundButton.classList.toggle(
      'is-active',
      audioPreferenceState.soundEnabled
    );
  }
  if (toggleAmbianceButton) {
    const label = formatAmbianceToggleLabel(
      audioPreferenceState.ambianceEnabled
    );
    toggleAmbianceButton.textContent = label;
    toggleAmbianceButton.title = label;
    toggleAmbianceButton.classList.toggle(
      'is-active',
      audioPreferenceState.ambianceEnabled
    );
  }
  AUDIO_CATEGORIES.forEach((category) => {
    const input = audioCategoryVolumeInputs.get(category);
    const output = audioCategoryVolumeOutputs.get(category);
    const value = audioPreferenceState.categoryVolumes[category];
    if (input) {
      input.value = String(Math.round(value * 100));
      input.setAttribute(
        'aria-label',
        `${getAudioCategoryLabel(category)} volume`
      );
    }
    if (output) {
      const label = formatAudioCategoryVolumeLabel(value);
      output.value = label;
      output.textContent = label;
    }
  });
}

function updateRuntimePerformanceTrackingUi(): void {
  if (!toggleRuntimePerformanceTrackingButton) {
    return;
  }
  const label = `Runtime Performance Tracking: ${
    runtimePerformanceTrackingState.enabled ? 'On' : 'Off'
  }`;
  toggleRuntimePerformanceTrackingButton.textContent = label;
  toggleRuntimePerformanceTrackingButton.title = label;
  toggleRuntimePerformanceTrackingButton.classList.toggle(
    'is-active',
    runtimePerformanceTrackingState.enabled
  );
}

function toggleAudioPreferenceSetting(
  key: 'musicEnabled' | 'soundEnabled' | 'ambianceEnabled'
): void {
  const nextPreferences = toggleAudioPreference(audioPreferenceState, key);
  audioPreferenceState.musicEnabled = nextPreferences.musicEnabled;
  audioPreferenceState.soundEnabled = nextPreferences.soundEnabled;
  audioPreferenceState.ambianceEnabled = nextPreferences.ambianceEnabled;
  audioPreferenceState.categoryVolumes = nextPreferences.categoryVolumes;
  updateAudioPreferenceUi();
  saveSession();
  requestRender();
}

function setAudioCategoryVolumeSetting(
  category: AudioCategory,
  nextValue: number
): void {
  const nextPreferences = setAudioCategoryVolume(
    audioPreferenceState,
    category,
    nextValue
  );
  audioPreferenceState.musicEnabled = nextPreferences.musicEnabled;
  audioPreferenceState.soundEnabled = nextPreferences.soundEnabled;
  audioPreferenceState.ambianceEnabled = nextPreferences.ambianceEnabled;
  audioPreferenceState.categoryVolumes = nextPreferences.categoryVolumes;
  updateAudioPreferenceUi();
  saveSession();
}

function toggleRuntimePerformanceTrackingSetting(): void {
  runtimePerformanceTrackingState.enabled =
    !runtimePerformanceTrackingState.enabled;
  updateRuntimePerformanceTrackingUi();
  saveSession();
}

function reportRuntimePerformanceSnapshot(
  trigger: RuntimePerformanceSnapshotTrigger,
  spatial: ReturnType<typeof getPlayerSpatialSummary>,
  metrics: Record<string, number | null | object> = {}
): void {
  if (!runtimePerformanceTrackingState.enabled) {
    return;
  }

  void (async () => {
    const runtimePerformanceTracking =
      await import('./runtime-performance-tracking.ts');
    const debugSnapshot = collectCurrentDebugSnapshot(
      performance.now(),
      spatial,
      {
        recordDiagnostics: false,
      }
    );
    const snapshot = runtimePerformanceTracking.buildRuntimePerformanceSnapshot(
      {
        source: 'game',
        trigger,
        route: window.location.pathname || '/',
        worldSeed: currentWorldSeed,
        context: {
          id: spatial.context.id,
          label: spatial.context.label,
          depth: spatial.context.depth,
        },
        metrics: {
          ...runtimePerformanceTracking.buildRuntimePerformanceSnapshotMetricsFromDebugSnapshot(
            debugSnapshot,
            {
              initialWorldGenerationMs:
                trigger === 'startup'
                  ? runtimePerformanceTrackingState.initialWorldGenerationMs
                  : null,
              memoryAfterRegionChangeMb:
                trigger === 'region-change' ? debugSnapshot.heapUsedMb : null,
            }
          ),
          ...metrics,
        },
      }
    );

    await runtimePerformanceTracking.postRuntimePerformanceSnapshot(snapshot);
  })();
}

function maybeReportRuntimePerformanceIssue(
  nowMs: number,
  spatial: ReturnType<typeof getPlayerSpatialSummary>
): void {
  if (!runtimePerformanceTrackingState.enabled) {
    return;
  }
  if (
    runtimePerformanceTrackingState.lastIssueSampleNowMs !== null &&
    nowMs - runtimePerformanceTrackingState.lastIssueSampleNowMs <
      RUNTIME_PERFORMANCE_ISSUE_SAMPLE_INTERVAL_MS
  ) {
    return;
  }
  runtimePerformanceTrackingState.lastIssueSampleNowMs = nowMs;

  const debugSnapshot = collectCurrentDebugSnapshot(nowMs, spatial, {
    recordDiagnostics: false,
  });
  void reportRuntimePerformanceIssue(debugSnapshot, spatial);
}

async function reportRuntimePerformanceIssue(
  debugSnapshot: ReturnType<typeof collectCurrentDebugSnapshot>,
  spatial: ReturnType<typeof getPlayerSpatialSummary>
): Promise<void> {
  const issueModule = await import('./runtime-performance-issue.ts');
  const issue = issueModule.buildRuntimePerformanceIssueReport({
    createdAt: new Date(),
    source: 'game',
    route: window.location.pathname || '/',
    worldSeed: currentWorldSeed,
    context: {
      id: spatial.context.id,
      label: spatial.context.label,
      depth: spatial.context.depth,
    },
    debugSnapshot,
  });
  if (!runtimePerformanceIssueReporterPromise) {
    runtimePerformanceIssueReporterPromise = Promise.resolve(
      issueModule.createRuntimePerformanceIssueReporter()
    );
  }
  const reporter = await runtimePerformanceIssueReporterPromise;
  await reporter(issue);
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

function setViewMode(modeId: string | undefined): void {
  const nextMode = getNextViewMode(modeId);
  if (state.viewMode === nextMode) {
    return;
  }
  if (state.viewMode === '3d' && mouseLookState.dragging) {
    mouseLookState.dragging = false;
    mouseLookState.pointerId = -1;
    viewportStage?.classList.remove('is-mouse-looking');
  }
  state.viewMode = nextMode;
  syncViewportModeUi();
  restore3dViewportKeyboardFocus(state.viewMode, viewport3d);
  saveSession();
  requestRender();
}

function toggleView(): void {
  setViewMode(cycleViewMode(state.viewMode));
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
    .map((option) => `<option value="${option.kind}">${option.label}</option>`)
    .join('');

  const hasPreviousValue = options.some(
    (option) => option.kind === previousValue
  );
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
  const parsed = parseSavedSession(
    window.localStorage.getItem(SESSION_STORAGE_KEY)
  );
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
  const renderBudgetCaps = getRenderBudgetCaps(renderBudgetState);
  const pendingWorldBuildBudget = getPendingWorldBuildBudget(renderBudgetState);
  const renderQualityLevel = formatRenderQualityLevel(
    getRenderQualityLevel(renderBudgetState)
  );
  const renderQualityLimiters = getRenderQualityLimiters(renderBudgetState);
  const previousSnapshot = debugSnapshotState.latestSnapshot;
  const qualityChangeEvent =
    options.recordDiagnostics &&
    previousSnapshot &&
    (previousSnapshot.targetFps !== renderBudgetState.targetFps ||
      previousSnapshot.visibilityRadius !==
        renderBudgetState.visibilityRadius ||
      previousSnapshot.renderQualityLevel !== renderQualityLevel)
      ? {
          nowMs,
          type: 'graphics-quality-changed' as const,
          fromTargetFps: previousSnapshot.targetFps,
          targetFps: renderBudgetState.targetFps,
          fromVisibilityRadius: previousSnapshot.visibilityRadius,
          visibilityRadius: renderBudgetState.visibilityRadius,
          fromRenderQualityLevel: previousSnapshot.renderQualityLevel,
          renderQualityLevel,
          summary: renderQualityLimiters.join(', '),
        }
      : null;

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
    performanceTier: resolvePerformanceTierForRenderQuality(
      resolvePerformanceTierFromBudgetStatuses(
        [
          getIncreasingLimitStatus(
            renderBudgetState.smoothedFrameMs,
            renderBudgetCaps.frameMs.soft,
            renderBudgetCaps.frameMs.hard
          ),
          getDecreasingLimitStatus(
            renderBudgetState.visibilityRadius,
            renderBudgetCaps.visibilityRadius.full,
            renderBudgetCaps.visibilityRadius.minimum
          ),
          getDecreasingLimitStatus(
            pendingWorldBuildBudget.pendingBuildBudgetMs,
            renderBudgetCaps.pendingBuildBudgetMs.soft,
            renderBudgetCaps.pendingBuildBudgetMs.minimum
          ),
          getDecreasingLimitStatus(
            pendingWorldBuildBudget.maxPendingBuildTiles,
            renderBudgetCaps.pendingBuildTiles.soft,
            renderBudgetCaps.pendingBuildTiles.hard
          ),
          getIncreasingLimitStatus(
            renderBudgetState.estimatedGpuMemoryBytes,
            renderBudgetCaps.estimatedGpuMemoryBytes.soft,
            renderBudgetCaps.estimatedGpuMemoryBytes.hard
          ),
        ],
        resolvePerformanceTier(renderBudgetState.smoothedFrameMs)
      ),
      renderQualityLevel
    ),
    renderQualityLevel,
    renderQualityLimiters: renderQualityLimiters.join(', '),
    playerLevel: normalizePlayerLevel(state.playerLevel),
    visibilityRadius: renderBudgetState.visibilityRadius,
    weatherVisibilityRadiusCap: renderBudgetState.weatherVisibilityRadiusCap,
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
    loadedChunkCount: rendererStats.loadedChunkCount,
    chunkGenerationQueueSize: rendererStats.pendingTileCount,
    pendingTileCount: rendererStats.pendingTileCount,
    averagePendingFlushTiles: rendererStats.averagePendingFlushTiles,
    maxPendingFlushTiles: rendererStats.maxPendingFlushTiles,
    averageTileBuildMs: rendererStats.averageTileBuildMs,
    maxTileBuildMs: rendererStats.maxTileBuildMs,
    averageFullTileBuildMs: rendererStats.averageFullTileBuildMs,
    maxFullTileBuildMs: rendererStats.maxFullTileBuildMs,
    averageLowTileBuildMs: rendererStats.averageLowTileBuildMs,
    maxLowTileBuildMs: rendererStats.maxLowTileBuildMs,
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
    lodReplacementTopPluginLabel: rendererStats.lodReplacementTopPluginLabel,
    lodReplacementSummary: rendererStats.lodReplacementSummary,
    lowerLodRecoveriesPerSecond: rendererStats.lowerLodRecoveriesPerSecond,
    fallbackBoxesPerSecond: rendererStats.fallbackBoxesPerSecond,
    fallbackBoxTopPluginLabel: rendererStats.fallbackBoxTopPluginLabel,
    fallbackBoxSummary: rendererStats.fallbackBoxSummary,
    drawCallTopPluginLabel: rendererStats.drawCallTopPluginLabel,
    drawCallSummary: rendererStats.drawCallSummary,
    objectTopPluginLabel: rendererStats.objectTopPluginLabel,
    objectSummary: rendererStats.objectSummary,
    meshTopPluginLabel: rendererStats.meshTopPluginLabel,
    meshSummary: rendererStats.meshSummary,
    instancedMeshTopPluginLabel: rendererStats.instancedMeshTopPluginLabel,
    instancedMeshSummary: rendererStats.instancedMeshSummary,
    renderedInstanceTopPluginLabel:
      rendererStats.renderedInstanceTopPluginLabel,
    renderedInstanceSummary: rendererStats.renderedInstanceSummary,
    instancingWarningTopPluginLabel:
      rendererStats.instancingWarningTopPluginLabel,
    instancingWarningSummary: rendererStats.instancingWarningSummary,
    materialTopPluginLabel: rendererStats.materialTopPluginLabel,
    materialSummary: rendererStats.materialSummary,
    sceneUniqueMaterialTopPluginLabel:
      rendererStats.sceneUniqueMaterialTopPluginLabel,
    sceneUniqueMaterialSummary: rendererStats.sceneUniqueMaterialSummary,
    clonedMaterialTopPluginLabel: rendererStats.clonedMaterialTopPluginLabel,
    clonedMaterialSummary: rendererStats.clonedMaterialSummary,
    staticMatrixUpdateTopPluginLabel:
      rendererStats.staticMatrixUpdateTopPluginLabel,
    staticMatrixUpdateSummary: rendererStats.staticMatrixUpdateSummary,
    object3dCount: rendererStats.object3dCount,
    visibleObjectCount: rendererStats.visibleObjectCount,
    invisibleObjectCount: rendererStats.invisibleObjectCount,
    maxChunkDrawCalls: renderBudgetState.maxChunkDrawCalls,
    maxChunkObjectCount: renderBudgetState.maxChunkObjectCount,
    maxChunkMeshes: renderBudgetState.maxChunkMeshes,
    maxChunkTriangleCount: renderBudgetState.maxChunkTriangleCount,
    groupCount: rendererStats.groupCount,
    meshCount: rendererStats.meshCount,
    instancedMeshCount: rendererStats.instancedMeshCount,
    visibleInstancedMeshCount: rendererStats.visibleInstancedMeshCount,
    renderedInstanceCount: rendererStats.renderedInstanceCount,
    visibleMeshCount: rendererStats.visibleMeshCount,
    visibleTriangleCount: renderBudgetState.visibleTriangleCount,
    visibleVertexCount: renderBudgetState.visibleVertexCount,
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
      soundEffects.getActiveSourceCount() +
      musicController.getActiveSourceCount(),
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
    textureMemoryEstimateMb:
      rendererStats.textureMemoryEstimateBytes / (1024 * 1024),
    programCount: rendererStats.programCount,
    estimatedGpuMemoryBytes: renderBudgetState.estimatedGpuMemoryBytes,
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
  const heapGrowthWarning = getHeapGrowthWarning(
    debugResourceTrendState.heapSamples
  );
  const idleAllocationWarning = getIdleAllocationWarning(
    debugResourceTrendState.heapSamples
  );
  const lastLodFailureEvent = getMostRecentDebugEventByType(
    rendererStats.recentEvents,
    'model-rejected'
  );
  const lastFallbackEvent = getMostRecentDebugEventByType(
    rendererStats.recentEvents,
    'fallback-box'
  );
  const currentTileDebugInfo = renderer3d.getVisibleTileDebugInfo(
    spatial.gridX,
    spatial.gridY
  );
  const latestGraphicsQualityChangeEvent =
    qualityChangeEvent ??
    getMostRecentDebugEventByType(
      debugRecentEventsState.events,
      'graphics-quality-changed'
    );
  debugSnapshot.lastLodFailureReason = lastLodFailureEvent
    ? (formatRecentDebugEventReason(lastLodFailureEvent) ?? undefined)
    : undefined;
  debugSnapshot.lastFallbackReason = lastFallbackEvent
    ? (formatRecentDebugEventReason(lastFallbackEvent) ?? undefined)
    : undefined;
  debugSnapshot.latestQualityChangeLimiter = latestGraphicsQualityChangeEvent
    ? getPrimaryRenderQualityLimiter(latestGraphicsQualityChangeEvent.summary)
    : undefined;
  debugSnapshot.latestQualityChangeSummary = latestGraphicsQualityChangeEvent
    ? formatGraphicsQualityChangeSummary(latestGraphicsQualityChangeEvent)
    : undefined;
  debugSnapshot.currentTilePlugin = currentTileDebugInfo?.plugin ?? undefined;
  debugSnapshot.currentTileRequestedDetailLevel =
    currentTileDebugInfo?.requestedDetailLevel ?? undefined;
  debugSnapshot.currentTileRenderedDetailLevel =
    currentTileDebugInfo?.renderedDetailLevel ?? undefined;
  debugSnapshot.currentTileCachedDetailLevel =
    currentTileDebugInfo?.cachedDetailLevel ?? undefined;
  debugSnapshot.currentTileFallbackReason =
    currentTileDebugInfo?.fallbackReason ?? undefined;
  debugSnapshot.currentTileHasVisibleModel =
    currentTileDebugInfo?.hasVisibleModel ?? false;
  debugSnapshot.currentTileSupportsModel =
    currentTileDebugInfo?.supportsModel ?? null;
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

  if (qualityChangeEvent) {
    recordDebugRecentEvent(qualityChangeEvent);
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
    ...debugResourceTrendState.materialSamples.map(
      (sample) => sample.materialCount
    )
  );

  debugSnapshotState.latestSnapshot = { ...debugSnapshot };
  return debugSnapshot;
}

function getIncreasingLimitStatus(
  current: number,
  softLimit: number,
  hardLimit: number
): 'ok' | 'warning' | 'critical' {
  if (current >= hardLimit) {
    return 'critical';
  }
  if (current >= softLimit) {
    return 'warning';
  }
  return 'ok';
}

function getDecreasingLimitStatus(
  current: number,
  fullValue: number,
  hardLimit: number
): 'ok' | 'warning' | 'critical' {
  if (current <= hardLimit) {
    return 'critical';
  }
  if (current < fullValue) {
    return 'warning';
  }
  return 'ok';
}

function downloadCurrentDebugSnapshot(): void {
  const nowMs = performance.now();
  const latestSnapshot = collectCurrentDebugSnapshot(
    nowMs,
    resolveCachedPlayerSpatialSummary(state),
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
        (
          navigator as Navigator & {
            userAgentData?: { platform?: string };
          }
        ).userAgentData?.platform ?? navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGb:
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
        null,
    },
    graphicsCapabilities,
    performanceBudget: {
      currentFrameMs: renderBudgetState.currentFrameMs,
      smoothedFrameMs: renderBudgetState.smoothedFrameMs,
      targetFps: renderBudgetState.targetFps,
      visibilityRadius: renderBudgetState.visibilityRadius,
      estimatedGpuMemoryBytes: renderBudgetState.estimatedGpuMemoryBytes,
      pendingBuildBudgetMs: pendingWorldBuildBudget.pendingBuildBudgetMs,
      maxPendingBuildTiles: pendingWorldBuildBudget.maxPendingBuildTiles,
      caps: renderBudgetCaps,
    },
    lod: {
      thresholds: lodThresholds,
    },
    recentEvents: collectMergedRecentDebugEvents(
      debugRecentEventsState.events,
      rendererStats.recentEvents,
      nowMs,
      {
        windowMs: DEBUG_RECENT_EVENT_WINDOW_MS,
        maxEntries: MAX_DEBUG_RECENT_EVENTS,
      }
    ),
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

function getPrimaryRenderQualityLimiter(
  summary: string | undefined
): string | undefined {
  return summary
    ?.split(',')
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0 && entry !== 'None');
}

function formatGraphicsQualityChangeSummary(
  event: Pick<
    DebugSnapshotRecentEvent,
    | 'fromTargetFps'
    | 'targetFps'
    | 'fromVisibilityRadius'
    | 'visibilityRadius'
    | 'fromRenderQualityLevel'
    | 'renderQualityLevel'
    | 'summary'
  >
): string {
  const segments = [
    `Target FPS ${event.fromTargetFps ?? '?'} -> ${event.targetFps ?? '?'}`,
    `visibility radius ${formatQualityRadius(event.fromVisibilityRadius)} -> ${formatQualityRadius(event.visibilityRadius)}`,
    `quality ${event.fromRenderQualityLevel ?? '?'} -> ${event.renderQualityLevel ?? '?'}`,
  ];
  const limiters = event.summary?.trim();
  if (limiters && limiters !== 'None') {
    segments.push(`limiters: ${limiters}`);
  }
  return segments.join(', ');
}

function formatQualityRadius(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(1) : '?';
}

function canLandOnOverworldTile(x: number, y: number): boolean {
  const tile = generator.sampleOverworld(x, y);
  const definition =
    registry.resolveTileDefinition(
      tile.kind,
      state.getTileDefinition(tile.kind)
    ) ?? state.getTileDefinition(tile.kind);
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
  return resolveCachedEnvironment({
    timeMs,
    contextId: state.getCurrentContext().id,
    playerTileX: Math.round(state.player.x),
    playerTileY: Math.round(state.player.y),
  });
}

function getCurrentCycle(
  environment: WorldEnvironmentLike = getCurrentEnvironment(),
  timeMs = getCurrentWorldTimeMs()
) {
  return resolveCachedCycle({
    timeMs,
    cycleConfig: environment.cycle,
    celestialOverrides: environment.celestial,
  });
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
  const queryState = resolveCachedNearbyOverworldQueryState(state);
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
  let best: null | {
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
  const queryState = resolveCachedNearbyOverworldQueryState(state);
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
  const queryState = resolveCachedNearbyOverworldQueryState(state);
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
  nearbyPaddleBoatAudioState.cache.set(
    cacheKey,
    nearbyPaddleBoatAudioState.profile
  );
  return nearbyPaddleBoatAudioState.profile;
}

function getNearbyAmbientAudioProfile() {
  const queryState = resolveCachedNearbyOverworldQueryState(state);
  if (!queryState) {
    nearbyAmbientAudioState.cache.clear();
    nearbyAmbientAudioState.profile = null;
    return null;
  }

  const { centerX, centerY, contextId } = queryState;
  const cacheKey = `${currentWorldSeed}:${contextId}:${centerX}:${centerY}`;
  const cachedProfile = nearbyAmbientAudioState.cache.get(cacheKey);
  if (cachedProfile !== undefined) {
    nearbyAmbientAudioState.profile = cachedProfile ?? null;
    return nearbyAmbientAudioState.profile;
  }

  nearbyAmbientAudioState.profile = findNearbyAmbientProfile({
    state,
    centerX,
    centerY,
    searchRadius: 8,
  });
  nearbyAmbientAudioState.cache.set(cacheKey, nearbyAmbientAudioState.profile);
  return nearbyAmbientAudioState.profile;
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
  (
    state as typeof state & { overworldTileRevision?: number }
  ).overworldTileRevision = 0;
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
    showHmrNotice(
      'Unable to build here. Move to an open overworld tile without an existing point of interest.'
    );
    return;
  }

  const publishTargets =
    worldMapStorage.getPreferredPoiPublishTargets?.() ?? [];
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
    publishedServerIds =
      worldMapStorage.publishPoiToPreferredServers?.(built) ?? [];
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

function jumpToRandomDestination(targetKind?: string): void {
  const destination = targetKind
    ? findRandomTileDestination(targetKind, {
        sampleOverworld: generator.sampleOverworld,
        canLandAt: canLandOnOverworldTile,
      })
    : findRandomLandingDestination();
  if (!destination) {
    showHmrNotice(
      targetKind
        ? `Unable to find a random ${targetKind} destination right now.`
        : 'Unable to find a random destination right now.'
    );
    return;
  }
  travelToOverworld(destination.x, destination.y);
  closeDialog(randomDialog);
}

function jumpHome(): void {
  travelToOverworld(0, 0, 0);
}

function findRandomLandingDestination(maxAttempts = 1200): WorldPoint | null {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const x = Math.floor((Math.random() * 2 - 1) * HALF_WORLD_TILES);
    const y = Math.floor((Math.random() * 2 - 1) * HALF_WORLD_TILES * 0.5);
    if (canLandOnOverworldTile(x, y)) {
      return { x, y };
    }
  }
  return null;
}

function teleportToWorldCoordinates(
  x: number,
  y: number,
  facing = state.player.facing
): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    showHmrNotice('Enter valid world coordinates first.');
    return;
  }
  travelToOverworld(x, y, facing);
  closeDialog(teleportDialog);
}

function teleportToGpsCoordinates(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    showHmrNotice('Enter valid GPS coordinates first.');
    return;
  }
  const x = (longitude / 360) * WORLD_TILES_WIDE;
  const y = (-latitude / 180) * WORLD_TILES_WIDE;
  teleportToWorldCoordinates(x, y);
}

function saveCurrentTeleportPin(): void {
  const rawName = teleportPinNameInput?.value.trim() ?? '';
  if (!rawName) {
    showHmrNotice('Name the pin before saving it.');
    return;
  }
  const pin = createTeleportPin({
    id: `pin-${Date.now()}-${Math.round(state.player.x)}-${Math.round(
      state.player.y
    )}`,
    name: rawName,
    x: state.player.x,
    y: state.player.y,
    facing: state.player.facing,
  });
  teleportPins = [pin, ...teleportPins.filter((entry) => entry.id !== pin.id)];
  if (teleportPinNameInput) {
    teleportPinNameInput.value = '';
  }
  renderTeleportPins();
  saveSession();
  showHmrNotice(`Saved pin "${pin.name}".`);
}

function removeTeleportPin(pinId: string): void {
  teleportPins = teleportPins.filter((pin) => pin.id !== pinId);
  renderTeleportPins();
  saveSession();
}

function renderTeleportPins(): void {
  if (!teleportPinList) {
    return;
  }
  teleportPinList.innerHTML = '';
  if (teleportPins.length === 0) {
    teleportPinList.innerHTML =
      '<p class="inspector-note">No pinned destinations yet.</p>';
    return;
  }
  teleportPins.forEach((pin) => {
    const row = document.createElement('div');
    row.className = 'teleport-pin-row';
    const jumpButton = document.createElement('button');
    jumpButton.type = 'button';
    jumpButton.textContent = `${pin.name} (${pin.x.toFixed(1)}, ${pin.y.toFixed(
      1
    )})`;
    jumpButton.addEventListener('click', () => {
      teleportToWorldCoordinates(pin.x, pin.y, pin.facing);
    });
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'teleport-pin-remove';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      removeTeleportPin(pin.id);
    });
    row.append(jumpButton, removeButton);
    teleportPinList.append(row);
  });
}

function openDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) {
    return;
  }
  dialog.showModal?.();
}

function closeDialog(dialog: HTMLDialogElement | null): void {
  dialog?.close?.();
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
  showHmrNotice(
    `Jumped to ${targetKind} near ${destination.x}, ${destination.y}.`
  );
}

function skipTimeByHours(hours: number): void {
  const environment = getCurrentEnvironment();
  const nextOffsetMs = advanceWorldTimeOffsetByHours(
    timeState.offsetMs,
    hours,
    {
      dayLengthMs: environment.cycle?.dayLengthMs,
    }
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

function jumpToTimePreset(preset: 'dawn' | 'noon' | 'dusk' | 'midnight'): void {
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
      panelId as
        | 'timekeeper'
        | 'build'
        | 'model'
        | 'events'
        | 'compass'
        | 'sextant'
        | 'debug'
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
    timeWheelCanvas.hidden = !isInspectorSectionVisible(
      activeInspectorTab,
      'timekeeper'
    );
  }
  celestialPreviewHost?.classList.toggle(
    'is-hidden',
    !isInspectorSectionVisible(activeInspectorTab, 'model')
  );
  if (celestialPreviewHost) {
    celestialPreviewHost.hidden = !isInspectorSectionVisible(
      activeInspectorTab,
      'model'
    );
  }
  eventSummary?.classList.toggle(
    'is-hidden',
    !isInspectorSectionVisible(activeInspectorTab, 'events')
  );
  if (eventSummary) {
    eventSummary.hidden = !isInspectorSectionVisible(
      activeInspectorTab,
      'events'
    );
  }
  compassDialCanvas?.classList.toggle(
    'is-hidden',
    !isInspectorSectionVisible(activeInspectorTab, 'compass')
  );
  if (compassDialCanvas) {
    compassDialCanvas.hidden = !isInspectorSectionVisible(
      activeInspectorTab,
      'compass'
    );
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

function updateFreezeLodButton(): void {
  if (!debugFreezeLodButton) return;
  debugFreezeLodButton.textContent = debugTileLodState.selectionFrozen
    ? 'Resume LOD'
    : 'Freeze LOD';
  debugFreezeLodButton.classList.toggle(
    'is-active',
    debugTileLodState.selectionFrozen
  );
}

function updateShowCachedModelsButton(): void {
  if (!debugShowCachedModelsButton) return;
  debugShowCachedModelsButton.textContent =
    debugTileLodState.showCachedModelAvailability
      ? 'Hide Cached LOD'
      : 'Show Cached LOD';
  debugShowCachedModelsButton.classList.toggle(
    'is-active',
    debugTileLodState.showCachedModelAvailability
  );
}

function toggleFreezeLodSelection(): void {
  debugTileLodState.selectionFrozen = !debugTileLodState.selectionFrozen;
  updateFreezeLodButton();
  requestRender();
}

function toggleShowCachedModelAvailability(): void {
  debugTileLodState.showCachedModelAvailability =
    !debugTileLodState.showCachedModelAvailability;
  updateShowCachedModelsButton();
  requestRender();
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
  const actualCycle = getCurrentCycle(latestEnvironment, state.timeMs);
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

  const shouldResolveSoundContext = shouldResolveNearbyEnvironmentalAudioWork({
    viewMode: state.viewMode,
    soundEnabled: audioPreferenceState.soundEnabled,
    ambianceEnabled: audioPreferenceState.ambianceEnabled,
    environmentVolume: getAudioCategoryVolume('environment'),
  });
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
  const nearbyAmbientAudio = shouldResolveSoundContext
    ? getNearbyAmbientAudioProfile()
    : null;
  const soundUpdate = gateSoundUpdate({
    nowMs,
    walking,
    isJumping: motion.isJumping,
    viewMode: state.viewMode,
    ambianceEnabled: audioPreferenceState.ambianceEnabled,
    tileKind: currentTileKind,
    dayProgress: actualCycle.dayProgress,
    yearProgress: actualCycle.yearProgress,
    weatherKind: currentWeather?.kind,
    weatherIntensity: currentWeather?.intensity,
    windStrength: currentWeather?.windStrength,
    nearbyTrain: nearbyTrainAudio,
    nearbyPaddleBoat: nearbyPaddleBoatAudio,
    nearbyAmbient: nearbyAmbientAudio,
    emitterX: state.player.x,
    emitterY: state.player.y,
    listenerX: state.player.x,
    listenerY: state.player.y,
  });
  if (soundUpdate) {
    soundEffects.update(soundUpdate);
  }

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
  const actualCycle = getCurrentCycle(environment, timeMs);
  const displayCycle = updateDisplayedCycle(actualCycle);
  const spatial = resolveCachedPlayerSpatialSummary(state);
  const context = spatial.context;
  const currentTile = spatial.tile;
  const musicClusterX = Math.floor(spatial.playerX / 12);
  const musicClusterY = Math.floor(spatial.playerY / 12);
  const nearbyPoiMusic = shouldResolvePoiMusicWork({
    musicEnabled: audioPreferenceState.musicEnabled,
    musicVolume: getAudioCategoryVolume('music'),
  })
    ? getNearbyPoiMusicProfile()
    : null;
  const combatIntensity = soundEffects.getRecentCombatIntensity(nowMs);
  const prioritySoundIntensity =
    soundEffects.getRecentPrioritySoundIntensity(nowMs);
  const dialogueIntensity = resolveDialogueMusicDuckingIntensity(
    getInteractionPromptFromResolvedState({
      map: state.getCurrentMap(),
      player: { x: spatial.playerX, y: spatial.playerY },
      tile: currentTile,
      contextLabel: context.label,
    })
  );
  const encounterMode = resolveMusicEncounterMode({ combatIntensity });
  const musicUpdate = gateMusicUpdate({
    nowMs,
    tileKind: currentTile.kind,
    contextType: context.type,
    dayProgress: actualCycle.dayProgress,
    yearProgress: actualCycle.yearProgress,
    weatherKind: environment.weather?.current?.kind,
    weatherIntensity: environment.weather?.current?.intensity,
    combatIntensity,
    prioritySoundIntensity,
    dialogueIntensity,
    encounterMode,
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
    const grid = annotateTextViewportGridWithVisibleTileLods(
      buildTextViewportGrid(state, {
        columns: 29,
        rows: 19,
      }),
      renderer3d,
      {
        showCachedAvailability: debugTileLodState.showCachedModelAvailability,
      }
    );
    const textViewportSignature = getTextViewportSignature(grid);
    if (textViewportSignature !== uiRenderState.lastTextViewportSignature) {
      viewportText.innerHTML = buildTextViewportMarkup(grid);
      uiRenderState.lastTextViewportSignature = textViewportSignature;
    }
  } else {
    const pendingWorldBuildBudget =
      getPendingWorldBuildBudget(renderBudgetState);
    const frameGenerationBudget = getFrameGenerationBudget(renderBudgetState);
    const renderBudget = buildReusableRenderBudget(renderBudgetState, {
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
      freezeLodSelection: debugTileLodState.selectionFrozen,
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
  celestialPreview.render(
    displayCycle,
    environment,
    state.player.facing,
    generator
  );
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
  const eventsInspectorVisible = isInspectorSectionVisible(
    activeInspectorTab,
    'events'
  );
  const sextantInspectorVisible = isInspectorSectionVisible(
    activeInspectorTab,
    'sextant'
  );
  const debugInspectorVisible = isInspectorSectionVisible(
    activeInspectorTab,
    'debug'
  );
  if (eventSummary && eventsInspectorVisible) {
    const eventSummaryState = summarizeCelestialEvents(displayCycle);
    const eventDetails = getActiveCelestialEventDetails(eventSummaryState);
    const modeLabel = formatCelestialEventModeLabel(
      celestialEventModeState.mode
    );
    const activeEventsLabel = describeActiveCelestialEvents(eventSummaryState);
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
  const needsCoordinateSummary =
    sextantInspectorVisible || debugInspectorVisible;
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
  maybeReportRuntimePerformanceIssue(nowMs, spatial);
  if (!runtimePerformanceTrackingState.startupReported) {
    reportRuntimePerformanceSnapshot('startup', spatial);
    runtimePerformanceTrackingState.startupReported = true;
    runtimePerformanceTrackingState.lastReportedContextId = context.id;
  } else if (
    runtimePerformanceTrackingState.lastReportedContextId !== context.id
  ) {
    reportRuntimePerformanceSnapshot('region-change', spatial);
    runtimePerformanceTrackingState.lastReportedContextId = context.id;
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
const cancelPendingRenderFrame =
  globalThis.cancelAnimationFrame?.bind(globalThis) ??
  ((handle: number) => clearTimeout(handle));

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
  hmrNoticeState.visibleUntilMs = getHmrNoticeVisibleUntil(
    performance.now(),
    durationMs
  );
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
    Math.floor(dialState.yearProgress * constellationCount) %
    constellationCount;
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

const runScheduledAnimationFrame = createAnimationFrameRunner(
  requestRender,
  runLoopFrame
);

function loop(timestamp: number): void {
  pendingFrameHandle = 0;
  const frameStep = runScheduledAnimationFrame(
    timestamp,
    lastFrame,
    pageVisibilityState.hidden
  );
  lastFrame = frameStep.lastFrameTimestamp;
  if (frameStep.skipped) {
    return;
  }
}

window.addEventListener(
  'resize',
  () => {
    resizeCanvas();
    requestRender();
  },
  pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
);

document.addEventListener(
  'visibilitychange',
  () => {
    pageVisibilityState.hidden = document.hidden;
    if (pageVisibilityState.hidden) {
      sessionPersistence.flush();
      soundEffects.stopAll();
      musicController.stopAll();
      lastFrame = 0;
      return;
    }
    requestRender();
  },
  pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
);

window.addEventListener(
  'pagehide',
  () => {
    savePersistedPageScrollY(
      mainPageScrollStorage,
      MAIN_PAGE_SCROLL_STORAGE_KEY,
      window.scrollY
    );
    sessionPersistence.flush();
    persistMainPageHmrState();
  },
  pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
);

import.meta.hot?.on('vite:beforeUpdate', () => {
  savePersistedPageScrollY(
    mainPageScrollStorage,
    MAIN_PAGE_SCROLL_STORAGE_KEY,
    window.scrollY
  );
  saveSession();
  sessionPersistence.flush();
  persistMainPageHmrState();
  showHmrNotice(getHmrNoticeText('before-update'));
});

import.meta.hot?.on('vite:afterUpdate', () => {
  showHmrNotice(getHmrNoticeText('after-update'));
});

import.meta.hot?.dispose(() => {
  savePersistedPageScrollY(
    mainPageScrollStorage,
    MAIN_PAGE_SCROLL_STORAGE_KEY,
    window.scrollY
  );
  pageLifecycleAbortController?.abort();
  if (pendingFrameHandle !== 0) {
    cancelPendingRenderFrame(pendingFrameHandle);
    pendingFrameHandle = 0;
  }
  saveSession();
  sessionPersistence.flush();
  persistMainPageHmrState();
});

window.addEventListener(
  'keydown',
  (event) => {
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
  },
  pageLifecycleSignal ? { capture: true, signal: pageLifecycleSignal } : true
);

window.addEventListener(
  'keyup',
  (event) => {
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
  },
  pageLifecycleSignal ? { capture: true, signal: pageLifecycleSignal } : true
);

actionButton.addEventListener('click', handleInteraction);
buildPoiButton?.addEventListener('click', handleBuildPoi);
viewMenuButton?.addEventListener('click', () => openDialog(viewDialog));
randomJumpButton?.addEventListener('click', () => jumpToRandomDestination());
randomMenuButton?.addEventListener('click', () => openDialog(randomDialog));
teleportMenuButton?.addEventListener('click', () => openDialog(teleportDialog));
settingsButton?.addEventListener('click', () => openDialog(settingsDialog));
teleportHomeButton?.addEventListener('click', jumpHome);
teleportWorldSubmitButton?.addEventListener('click', () => {
  teleportToWorldCoordinates(
    Number(teleportWorldXInput?.value),
    Number(teleportWorldYInput?.value)
  );
});
teleportGpsSubmitButton?.addEventListener('click', () => {
  teleportToGpsCoordinates(
    Number(teleportGpsLatitudeInput?.value),
    Number(teleportGpsLongitudeInput?.value)
  );
});
teleportPinSaveButton?.addEventListener('click', saveCurrentTeleportPin);
document
  .querySelector<HTMLButtonElement>('#random-any')
  ?.addEventListener('click', () => jumpToRandomDestination());
document
  .querySelector<HTMLButtonElement>('#random-plains')
  ?.addEventListener('click', () => jumpToRandomDestination('plains'));
document
  .querySelector<HTMLButtonElement>('#random-forest')
  ?.addEventListener('click', () => jumpToRandomDestination('forest'));
document
  .querySelector<HTMLButtonElement>('#random-mountain')
  ?.addEventListener('click', () => jumpToRandomDestination('mountain'));
document
  .querySelector<HTMLButtonElement>('#random-river')
  ?.addEventListener('click', () => jumpToRandomDestination('river'));
document
  .querySelector<HTMLButtonElement>('#random-ocean')
  ?.addEventListener('click', () => jumpToRandomDestination('ocean'));
document
  .querySelector<HTMLButtonElement>('#random-town')
  ?.addEventListener('click', () => jumpToRandomDestination('town'));
document
  .querySelector<HTMLButtonElement>('#random-ruins')
  ?.addEventListener('click', () => jumpToRandomDestination('ruins'));
viewModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setViewMode(button.dataset.viewMode);
    closeDialog(viewDialog);
  });
});
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
debugDownloadSnapshotButton?.addEventListener(
  'click',
  downloadCurrentDebugSnapshot
);
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
modelPreviewWorldButton?.addEventListener('click', () =>
  setModelPreviewMode('world')
);
modelPreviewSolarButton?.addEventListener('click', () =>
  setModelPreviewMode('solar-system')
);
modelPreviewSplitButton?.addEventListener('click', () =>
  setModelPreviewMode('split')
);
eventModeAutoButton?.addEventListener('click', () =>
  setCelestialEventMode('auto')
);
eventModeAuroraButton?.addEventListener('click', () =>
  setCelestialEventMode('aurora')
);
eventModeMeteorButton?.addEventListener('click', () =>
  setCelestialEventMode('meteor-shower')
);
eventModeCometButton?.addEventListener('click', () =>
  setCelestialEventMode('comet')
);
eventModeEclipseButton?.addEventListener('click', () =>
  setCelestialEventMode('eclipse')
);
toggleTimekeeperDisplayButton?.addEventListener('click', () => {
  setTimekeeperDisplayMode(
    cycleTimekeeperDisplayMode(activeTimekeeperDisplayMode)
  );
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
toggleAmbianceButton?.addEventListener('click', () => {
  toggleAudioPreferenceSetting('ambianceEnabled');
});
toggleRuntimePerformanceTrackingButton?.addEventListener('click', () => {
  toggleRuntimePerformanceTrackingSetting();
});
AUDIO_CATEGORIES.forEach((category) => {
  audioCategoryVolumeInputs
    .get(category)
    ?.addEventListener('input', (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      setAudioCategoryVolumeSetting(category, Number(target.value) / 100);
    });
});
zoomOutMinimapButton?.addEventListener('click', () => adjustMinimapZoom(-0.1));
zoomInMinimapButton?.addEventListener('click', () => adjustMinimapZoom(0.1));
freezeTimeButton?.addEventListener('click', toggleTimeFreeze);
debugFreezeLodButton?.addEventListener('click', toggleFreezeLodSelection);
debugShowCachedModelsButton?.addEventListener(
  'click',
  toggleShowCachedModelAvailability
);
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
root
  .querySelectorAll<HTMLButtonElement>('[data-time-preset]')
  .forEach((button) => {
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
renderTeleportPins();
restore3dViewportKeyboardFocus(state.viewMode, viewport3d);
requestRender();

function saveSession(): void {
  sessionPersistence.schedule();
}

function flushSessionSave(): void {
  try {
    const characterProfile = buildCharacterProfileSnapshot();
    const serializedCharacterProfile =
      serializeCharacterProfile(characterProfile);
    if (serializedCharacterProfile !== lastSavedCharacterSnapshot) {
      characterStorage.saveProfile(characterProfile);
      lastSavedCharacterSnapshot = serializedCharacterProfile;
    }
    const inventoryProfile = buildInventoryProfileSnapshot();
    const serializedInventoryProfile =
      serializeInventoryProfile(inventoryProfile);
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
      ambianceEnabled: audioPreferenceState.ambianceEnabled,
      runtimePerformanceTrackingEnabled:
        runtimePerformanceTrackingState.enabled,
      categoryVolumes: audioPreferenceState.categoryVolumes,
      compassHeadingAngle: compassHeadingState.angle,
      cameraPitch: mouseLookState.pitch,
      worldSeed: currentWorldSeed,
      playerLevel: normalizePlayerLevel(state.playerLevel),
      playerProfession: state.playerProfession,
      completedQuestIds: [...(state.completedQuestIds ?? [])],
      inventory: [...(state.inventory ?? [])],
      playerPlacedPois: getSavedPlayerPlacedPois(),
      teleportPins,
    });
    if (snapshot === lastSavedSnapshot) return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, snapshot);
    lastSavedSnapshot = snapshot;
  } catch {
    // Ignore storage write failures so play continues normally.
  }
}

function persistMainPageHmrState(): void {
  saveHmrState(import.meta.hot, MAIN_PAGE_HMR_STATE_KEY, {
    scrollY: Math.max(0, Math.round(window.scrollY ?? 0)),
    sessionSnapshot: lastSavedSnapshot || null,
  });
}

function loadSession(
  preferredSnapshot: string | null = null
): ReturnType<typeof parseSavedSession> {
  const raw =
    preferredSnapshot ?? window.localStorage.getItem(SESSION_STORAGE_KEY);
  const parsed = parseSavedSession(raw);
  if (!parsed) {
    return null;
  }
  lastSavedSnapshot = raw ?? '';
  return parsed;
}

function buildCharacterProfileSnapshot(): CharacterProfileSnapshot {
  characterRosterState.roster = syncPrimaryPlayerCharacter(
    characterRosterState.roster,
    {
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
    }
  );
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
      session?.playerPlacedPois ?? characterProfile?.playerPlacedPois ?? [],
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
    preferredServerIds: profile.preferredServerIds ??
      worldMapStorage.getPreferredServerIds?.() ?? ['local'],
  });
  return profile;
}
