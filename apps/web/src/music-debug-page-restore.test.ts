import { describe, expect, it } from 'vitest';
import { normalizeMusicDebugPagePersistenceState } from './music-debug-page-persistence.ts';
import { restoreMusicDebugPageStateFromPersistence } from './music-debug-page-restore.ts';

const PREVIEW_OFFSET_MS = 17_500;

describe('music debug page restore', () => {
  it('restores persisted inputs and playback state without needing a snapshot render', () => {
    const form = createFakeForm();
    const loopInput = { checked: false } as HTMLInputElement;
    const playbackVariantSelect = { value: 'full' } as HTMLSelectElement;
    const playbackDryInput = { checked: false } as HTMLInputElement;
    const persistedState = normalizeMusicDebugPagePersistenceState({
      options: {
        tileKind: 'forest',
        contextType: 'building',
        encounterMode: 'battle',
        weatherKind: 'heavy-rain',
        weatherIntensity: 0.8,
        combatIntensity: 0.65,
        dayProgress: 0.2,
        yearProgress: 0.7,
        clusterX: 12,
        clusterY: -4,
      },
      loopEnabled: true,
      playbackVariant: 'melody-only',
      dryPlaybackEnabled: true,
      percussionPlaybackState: {
        soloVoiceIds: ['kick-35'],
        mutedVoiceIds: ['snare-38'],
      },
      hiddenRoles: ['harmony', 'percussion'],
      hiddenTimelineOverlays: ['motif', 'climax'],
      trackPlaybackState: {
        soloRoles: ['lead'],
        mutedRoles: ['bass'],
      },
      previewOffsetMs: PREVIEW_OFFSET_MS,
    });

    const restored = restoreMusicDebugPageStateFromPersistence({
      form: form as unknown as HTMLFormElement,
      persistedState,
      loopInput,
      playbackVariantSelect,
      playbackDryInput,
    });

    expect(form.values).toEqual(
      expect.objectContaining({
        tileKind: 'forest',
        contextType: 'building',
        encounterMode: persistedState.options.encounterMode,
        weatherKind: persistedState.options.weatherKind,
        weatherIntensity: '0.8',
        combatIntensity: '0.65',
        dayProgress: '0.2',
        yearProgress: '0.7',
        clusterX: '12',
        clusterY: '-4',
      })
    );
    expect(loopInput.checked).toBe(true);
    expect(playbackVariantSelect.value).toBe('melody-only');
    expect(playbackDryInput.checked).toBe(true);
    expect(restored).toEqual({
      previewOffsetMs: PREVIEW_OFFSET_MS,
      percussionPlaybackState: {
        soloVoiceIds: ['kick-35'],
        mutedVoiceIds: ['snare-38'],
      },
      hiddenRoles: ['harmony', 'percussion'],
      hiddenTimelineOverlays: ['motif', 'climax'],
      trackPlaybackState: {
        soloRoles: ['lead'],
        mutedRoles: ['bass'],
      },
    });
  });

  it('returns null when the form or persisted state is unavailable', () => {
    expect(
      restoreMusicDebugPageStateFromPersistence({
        form: null,
        persistedState: null,
        loopInput: null,
        playbackVariantSelect: null,
        playbackDryInput: null,
      })
    ).toBeNull();
  });
});

function createFakeForm() {
  const fields = new Map<string, { value: string }>();
  const form = {
    values: {} as Record<string, string>,
    elements: {
      namedItem(name: string) {
        let field = fields.get(name);
        if (!field) {
          field = {
            get value() {
              return form.values[name] ?? '';
            },
            set value(nextValue: string) {
              form.values[name] = nextValue;
            },
          };
          fields.set(name, field);
        }
        return field;
      },
    },
  };
  return form;
}
