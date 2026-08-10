import { describe, expect, it } from 'vitest';
import type { SoundBankInstrumentDefinition } from './procedural-music.ts';
import {
  createSoundBankInstrumentRegistry,
  registerSoundBankPluginInstruments,
} from './sound-bank-registry.ts';

function createDefinition(
  overrides: Partial<SoundBankInstrumentDefinition> = {}
): SoundBankInstrumentDefinition {
  return {
    id: 'plugin:lead:0:0',
    role: 'lead',
    generalMidiProgramNumber: 80,
    generalMidiInstrumentName: 'Lead 1 (square)',
    generalMidiFamilyName: 'Synth Lead',
    supportedRoles: ['lead'],
    recommendedMidiRange: { minMidiNote: 60, maxMidiNote: 84 },
    preferredMidiRange: { minMidiNote: 64, maxMidiNote: 79 },
    defaultVelocity: 108,
    defaultNoteDurationMs: 320,
    ...overrides,
  };
}

describe('sound bank registry', () => {
  it('lets plugins register sound bank instruments with a stable source label', () => {
    const registrations = registerSoundBankPluginInstruments({
      pluginName: 'example-pack',
      definitions: [createDefinition()],
    });
    const registry = createSoundBankInstrumentRegistry(registrations);

    expect(registry.entries).toHaveLength(1);
    expect(registry.entries[0]).toEqual(
      expect.objectContaining({
        id: 'plugin:lead:0:0',
        sourcePlugin: 'example-pack',
        isValid: true,
      })
    );
    expect(registry.warnings).toEqual([]);
  });

  it('rejects duplicate instrument ids and duplicate General MIDI program mappings', () => {
    const registry = createSoundBankInstrumentRegistry([
      {
        definition: createDefinition(),
        sourcePlugin: 'pack-a',
      },
      {
        definition: createDefinition({
          generalMidiInstrumentName: 'Lead 2 (sawtooth)',
          id: 'plugin:lead:0:0',
        }),
        sourcePlugin: 'pack-b',
      },
    ]);

    expect(registry.entries.every((entry) => entry.isValid)).toBe(false);
    expect(registry.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instrumentId: 'plugin:lead:0:0',
          sourcePlugin: 'pack-a',
          message: 'Duplicate instrument ID.',
        }),
        expect.objectContaining({
          instrumentId: 'plugin:lead:0:0',
          sourcePlugin: 'pack-b',
          message: 'Duplicate General MIDI program mapping.',
        }),
      ])
    );
  });

  it('validates malformed plugin instrument definitions and reports warning messages', () => {
    const registry = createSoundBankInstrumentRegistry([
      {
        definition: createDefinition({
          id: ' ',
          generalMidiProgramNumber: 140,
          generalMidiInstrumentName: '',
          generalMidiFamilyName: '',
          supportedRoles: ['lead', 'harmony'],
          preferredMidiRange: { minMidiNote: 90, maxMidiNote: 70 },
          defaultVelocity: 0,
          defaultNoteDurationMs: 0,
        }),
        sourcePlugin: 'broken-pack',
      },
    ]);

    expect(registry.entries[0]?.isValid).toBe(false);
    expect(registry.warnings.map((warning) => warning.message)).toEqual(
      expect.arrayContaining([
        'Instrument ID is required.',
        'General MIDI instrument name is required.',
        'General MIDI family name is required.',
        'General MIDI program number must be null or 0-127.',
        'preferred MIDI range must stay within 0-127 and use min <= max.',
        'Default velocity must be an integer from 1 to 127.',
        'Default note duration must be greater than zero.',
      ])
    );
  });
});
