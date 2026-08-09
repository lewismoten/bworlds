import { describe, expect, it } from 'vitest';

import {
  collectMusicDebugFormOptions,
  setMusicDebugNamedFormValue,
} from './music-debug-form.ts';

function createMusicDebugFormFieldMap(
  values: Record<string, string>
): Record<string, { value: string }> {
  const fields: Record<string, { value: string }> = {};
  for (const [name, value] of Object.entries(values)) {
    fields[name] = { value };
  }
  return fields;
}

function createMusicDebugFormStub(values: Record<string, string>) {
  const fields = createMusicDebugFormFieldMap(values);
  return {
    fields,
    form: {
      elements: {
        namedItem(name: string) {
          return fields[name] ?? null;
        },
      },
    },
  };
}

describe('music debug form helpers', () => {
  it('collects the full music debug option set from named controls', () => {
    const { form } = createMusicDebugFormStub({
      tileKind: 'forest',
      contextType: 'overworld',
      encounterMode: 'boss',
      weatherKind: 'heavy-rain',
      weatherIntensity: '0.75',
      combatIntensity: '0.65',
      dayProgress: '0.2',
      yearProgress: '0.8',
      clusterX: '12',
      clusterY: '-9',
    });

    expect(collectMusicDebugFormOptions(form)).toEqual({
      tileKind: 'forest',
      contextType: 'overworld',
      encounterMode: 'boss',
      weatherKind: 'heavy-rain',
      weatherIntensity: 0.75,
      combatIntensity: 0.65,
      dayProgress: 0.2,
      yearProgress: 0.8,
      clusterX: 12,
      clusterY: -9,
    });
  });

  it('updates named music debug form fields without touching missing controls', () => {
    const { fields, form } = createMusicDebugFormStub({
      combatIntensity: '0',
    });

    setMusicDebugNamedFormValue(form, 'combatIntensity', '0.55');
    setMusicDebugNamedFormValue(form, 'clusterX', '18');

    expect(fields.combatIntensity?.value).toBe('0.55');
    expect(fields.clusterX).toBeUndefined();
  });
});
