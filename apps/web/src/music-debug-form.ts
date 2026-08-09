import type { MusicDebugOptions } from './music-debug.ts';

type MusicDebugFormFieldLike = {
  value: string;
};

type MusicDebugFormLike = {
  elements: {
    namedItem(name: string): unknown;
  };
};

export function collectMusicDebugFormOptions(
  form: MusicDebugFormLike | null
): Partial<MusicDebugOptions> {
  if (!form) {
    return {};
  }
  return {
    tileKind: readMusicDebugFieldValue(
      form,
      'tileKind'
    ) as MusicDebugOptions['tileKind'],
    contextType: readMusicDebugFieldValue(
      form,
      'contextType'
    ) as MusicDebugOptions['contextType'],
    encounterMode: readMusicDebugFieldValue(
      form,
      'encounterMode'
    ) as MusicDebugOptions['encounterMode'],
    weatherKind: readMusicDebugFieldValue(
      form,
      'weatherKind'
    ) as MusicDebugOptions['weatherKind'],
    weatherIntensity: Number(
      readMusicDebugFieldValue(form, 'weatherIntensity')
    ),
    combatIntensity: Number(readMusicDebugFieldValue(form, 'combatIntensity')),
    dayProgress: Number(readMusicDebugFieldValue(form, 'dayProgress')),
    yearProgress: Number(readMusicDebugFieldValue(form, 'yearProgress')),
    clusterX: Number(readMusicDebugFieldValue(form, 'clusterX')),
    clusterY: Number(readMusicDebugFieldValue(form, 'clusterY')),
  };
}

export function setMusicDebugNamedFormValue(
  form: MusicDebugFormLike | null,
  name: string,
  value: string
): void {
  const field = form?.elements.namedItem(name);
  if (!isMusicDebugFormFieldLike(field)) {
    return;
  }
  field.value = value;
}

function readMusicDebugFieldValue(
  form: MusicDebugFormLike,
  name: string
): string {
  const field = form.elements.namedItem(name);
  return isMusicDebugFormFieldLike(field) ? field.value : '';
}

function isMusicDebugFormFieldLike(
  value: unknown
): value is MusicDebugFormFieldLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'string'
  );
}
