import {
  buildSoundDebugSnapshot,
  SOUND_DEBUG_PRESETS,
  type SoundDebugSnapshot,
} from './sound-debug-presets.ts';
import { buildSoundDebugWaveformMarkup } from './sound-debug-waveform.ts';
import { renderProceduralSoundToBufferData } from './procedural-sound-render.ts';

const SOUND_DEBUG_SAMPLE_RATE = 48_000;

export type SoundDebugRenderableSnapshot = SoundDebugSnapshot & {
  sampleRate: number;
  samples: Float32Array;
};

export function createSoundDebugRenderableSnapshot(
  presetId?: string
): SoundDebugRenderableSnapshot {
  const snapshot = buildSoundDebugSnapshot(presetId);
  if (!snapshot.renderable) {
    throw new Error(`Sound preset "${snapshot.preset.id}" is not renderable.`);
  }

  return {
    ...snapshot,
    sampleRate: SOUND_DEBUG_SAMPLE_RATE,
    samples: renderProceduralSoundToBufferData(
      snapshot.effect,
      SOUND_DEBUG_SAMPLE_RATE
    ),
  };
}

export function buildSoundDebugShellMarkup(
  snapshot: SoundDebugRenderableSnapshot
): string {
  const presetButtons = SOUND_DEBUG_PRESETS.map((preset) => {
    const active =
      preset.id === snapshot.preset.id ? ' data-active="true"' : '';
    return `
      <button
        type="button"
        class="sound-debug-preset-button"
        data-preset-id="${preset.id}"${active}
      >
        <span class="sound-debug-preset-category">${preset.category}</span>
        <strong>${preset.label}</strong>
        <span>${preset.description}</span>
      </button>
    `;
  }).join('');

  return `
    <main class="sound-debug-shell">
      <section class="sound-debug-hero">
        <p class="sound-debug-kicker">bworlds</p>
        <h1>Sound Debug</h1>
        <p class="sound-debug-lede">
          Preview deterministic procedural sound effects, inspect their recipe identity, and export the rendered result as a WAV file.
        </p>
      </section>
      <section class="sound-debug-layout">
        <aside class="sound-debug-sidebar">
          <h2>Sound Presets</h2>
          <div id="sound-debug-preset-list" class="sound-debug-preset-list" aria-label="Sound presets">
            ${presetButtons}
          </div>
        </aside>
        <section class="sound-debug-panel">
          <div class="sound-debug-panel-head">
            <div>
              <p class="sound-debug-panel-category">${snapshot.preset.category}</p>
              <h2 id="sound-debug-title">${snapshot.preset.label}</h2>
              <p id="sound-debug-description">${snapshot.preset.description}</p>
            </div>
            <div class="sound-debug-actions">
              <button id="sound-debug-play" type="button">Play Sound</button>
              <button id="sound-debug-download" type="button">Download WAV</button>
            </div>
          </div>
          <section class="sound-debug-waveform" aria-label="Waveform preview">
            ${buildSoundDebugWaveformMarkup(snapshot.samples)}
          </section>
          <dl id="sound-debug-details" class="sound-debug-details">
            <div><dt>Kind</dt><dd>${snapshot.preset.kind}</dd></div>
            <div><dt>Tile</dt><dd>${snapshot.details.tileKind}</dd></div>
            <div><dt>Variant</dt><dd>${snapshot.details.identityVariant}</dd></div>
            <div><dt>Family</dt><dd>${snapshot.details.family}</dd></div>
            <div><dt>Recipe</dt><dd>${snapshot.details.recipeId}</dd></div>
            <div><dt>Waveform</dt><dd>${snapshot.effect.waveform}</dd></div>
            <div><dt>Duration</dt><dd>${snapshot.effect.durationMs}ms</dd></div>
            <div><dt>Layers</dt><dd>${snapshot.effect.layers?.length ?? 0}</dd></div>
            <div class="sound-debug-details-wide"><dt>Identity</dt><dd>${snapshot.details.signature}</dd></div>
          </dl>
        </section>
      </section>
    </main>
  `;
}

export function normalizeSoundDebugPresetId(value: unknown): string {
  const presetId = typeof value === 'string' ? value : '';
  return SOUND_DEBUG_PRESETS.some((preset) => preset.id === presetId)
    ? presetId
    : (SOUND_DEBUG_PRESETS[0]?.id ?? '');
}
