import { describe, expect, it } from 'vitest';
import type { SoundBankInstrumentDefinition } from './procedural-music-sound-bank.ts';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugSnapshot,
  normalizeSoundBankDebugGeneralMidiBrowserState,
  resolveSoundBankDebugGeneralMidiBrowserModel,
} from './sound-bank-debug.ts';
import { registerSoundBankPluginInstruments } from './sound-bank-registry.ts';

describe('sound bank debug General MIDI browser', () => {
  it('normalizes General MIDI browser controls into safe search, family, and sort values', () => {
    expect(
      normalizeSoundBankDebugGeneralMidiBrowserState({
        searchQuery: '  lead  ',
        familyFilter: 'Synth Lead',
        roleFilter: 'lead',
        playableMidiNote: ' 80 ',
        selectedProgramNumber: ' 81 ',
        sortMode: 'name',
      })
    ).toEqual({
      searchQuery: 'lead',
      familyFilter: 'Synth Lead',
      roleFilter: 'lead',
      playableMidiNote: '80',
      selectedProgramNumber: '81',
      sortMode: 'name',
    });
    expect(
      normalizeSoundBankDebugGeneralMidiBrowserState({
        familyFilter: 'Unknown',
        roleFilter: 'drums' as 'all',
        playableMidiNote: '999',
        selectedProgramNumber: '-1',
        sortMode: 'sideways' as 'program',
      })
    ).toEqual({
      searchQuery: '',
      familyFilter: 'all',
      roleFilter: 'all',
      playableMidiNote: '127',
      selectedProgramNumber: '',
      sortMode: 'program',
    });
    expect(
      normalizeSoundBankDebugGeneralMidiBrowserState({
        roleFilter: 'percussion' as 'all',
        playableMidiNote: '42',
      })
    ).toEqual({
      searchQuery: '',
      familyFilter: 'all',
      roleFilter: 'all',
      playableMidiNote: '42',
      selectedProgramNumber: '',
      sortMode: 'program',
    });
  });

  it('filters, sorts, and tracks selection in the General MIDI browser', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const searchedModel = resolveSoundBankDebugGeneralMidiBrowserModel(
      snapshot.instrumentRegistry.entries,
      {
        searchQuery: 'bass',
        familyFilter: 'all',
        sortMode: 'name',
      }
    );
    const familyModel = resolveSoundBankDebugGeneralMidiBrowserModel(
      snapshot.instrumentRegistry.entries,
      {
        familyFilter: 'Synth Lead',
        sortMode: 'program',
      }
    );
    const roleModel = resolveSoundBankDebugGeneralMidiBrowserModel(
      snapshot.instrumentRegistry.entries,
      {
        roleFilter: 'harmony',
        sortMode: 'program',
      }
    );
    const rangeModel = resolveSoundBankDebugGeneralMidiBrowserModel(
      snapshot.instrumentRegistry.entries,
      {
        playableMidiNote: '75',
        sortMode: 'program',
      }
    );
    const sortedByFamilyModel = resolveSoundBankDebugGeneralMidiBrowserModel(
      snapshot.instrumentRegistry.entries,
      {
        sortMode: 'family',
      }
    );
    const selectedModel = resolveSoundBankDebugGeneralMidiBrowserModel(
      snapshot.instrumentRegistry.entries,
      {
        selectedProgramNumber: '80',
        sortMode: 'program',
      }
    );

    expect(searchedModel.sections).toHaveLength(1);
    expect(searchedModel.sections[0]?.heading).toBe('All Matching Programs');
    expect(
      searchedModel.sections[0]?.programs.every((program) =>
        program.instrumentName.toLowerCase().includes('bass')
      )
    ).toBe(true);
    expect(familyModel.sections).toHaveLength(1);
    expect(familyModel.sections[0]?.heading).toBe('Synth Lead');
    expect(familyModel.sections[0]?.programs[0]?.programNumber).toBe(80);
    expect(roleModel.sections).toHaveLength(1);
    expect(
      roleModel.sections[0]?.programs.map((program) => program.programNumber)
    ).toEqual([48]);
    expect(
      rangeModel.sections.flatMap((section) =>
        section.programs.map((program) => program.programNumber)
      )
    ).toEqual([48, 80]);
    expect(
      sortedByFamilyModel.sections.map((section) => section.heading).slice(0, 3)
    ).toEqual(['Bass', 'Brass', 'Chromatic Percussion']);
    expect(selectedModel.selectedProgramNumber).toBe(80);
    expect(selectedModel.previousProgramNumber).toBe(79);
    expect(selectedModel.nextProgramNumber).toBe(81);
    expect(
      selectedModel.sections.flatMap((section) =>
        section.programs.filter((program) => program.isSelected)
      )
    ).toEqual([
      expect.objectContaining({
        programNumber: 80,
        isSelected: true,
        usesPlaceholderPatch: true,
        usesCustomPatch: false,
      }),
    ]);
    expect(
      resolveSoundBankDebugGeneralMidiBrowserModel(
        snapshot.instrumentRegistry.entries,
        {
          sortMode: 'program',
        }
      ).selectedProgramNumber
    ).toBe(33);
  });

  it('marks plugin-provided General MIDI mappings as custom patches', () => {
    const customDefinition: SoundBankInstrumentDefinition = {
      id: 'plugin:piano:0:0',
      role: 'lead',
      generalMidiProgramNumber: 0,
      generalMidiInstrumentName: 'Acoustic Grand Piano',
      generalMidiFamilyName: 'Piano',
      supportedRoles: ['lead'],
      recommendedMidiRange: { minMidiNote: 60, maxMidiNote: 84 },
      preferredMidiRange: { minMidiNote: 64, maxMidiNote: 79 },
      defaultVelocity: 104,
      defaultNoteDurationMs: 320,
    };
    const snapshot = createSoundBankDebugSnapshot(
      {},
      {
        registeredInstruments: registerSoundBankPluginInstruments({
          pluginName: 'custom-bank',
          definitions: [customDefinition],
        }),
      }
    );
    const model = resolveSoundBankDebugGeneralMidiBrowserModel(
      snapshot.instrumentRegistry.entries,
      {
        selectedProgramNumber: '0',
        sortMode: 'program',
      }
    );
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
      generalMidiBrowserState: {
        selectedProgramNumber: '0',
        sortMode: 'program',
      },
    }).replace(/\s+/g, ' ');

    expect(
      model.sections.flatMap((section) =>
        section.programs.filter((program) => program.programNumber === 0)
      )
    ).toEqual([
      expect.objectContaining({
        programNumber: 0,
        usesCustomPatch: true,
        usesPlaceholderPatch: false,
      }),
    ]);
    expect(markup).toContain('Custom patch');
    expect(markup).toContain('Patch Source');
    expect(markup).toContain('custom-bank');
    expect(markup).toContain('Generated');
    expect(markup).toContain('>No<');
    expect(markup).toContain('Attack');
    expect(markup).toContain('Unknown');
    expect(markup).toContain('Release');
    expect(markup).toContain('Sustain');
    expect(markup).toContain('Primary Oscillator');
    expect(markup).toContain('Unknown');
    expect(markup).toContain('Primary Harmonics');
    expect(markup).toContain('Harmonic Oscillator');
    expect(markup).toContain('Harmonic Content');
    expect(markup).toContain('Active Oscillator Count');
    expect(markup).toContain('Filter Type');
    expect(markup).toContain(
      'Filter response preview unavailable for this patch source.'
    );
    expect(markup).toContain(
      'Waveform preview unavailable for this patch source.'
    );
    expect(markup).toContain('Uses Samples');
    expect(markup).toContain('Unknown');
    expect(markup).toContain('Uses Synthesis');
    expect(markup).toContain('Polyphony Limit');
    expect(markup).toContain('Estimated Complexity');
  });

  it('shows selected instrument details for the resolved General MIDI program', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
      generalMidiBrowserState: {
        selectedProgramNumber: '80',
      },
    }).replace(/\s+/g, ' ');

    expect(markup).toContain('Selected Program');
    expect(markup).toContain('Instrument ID');
    expect(markup).toContain(
      snapshot.musicSnapshot.instrumentBank.instruments.lead.id
    );
    expect(markup).toContain('GM Program');
    expect(markup).toContain('>80<');
    expect(markup).toContain('GM Name');
    expect(markup).toContain('Lead 1 (square)');
    expect(markup).toContain('Family');
    expect(markup).toContain('Synth Lead');
    expect(markup).toContain('Supported Roles');
    expect(markup).toContain('lead');
    expect(markup).toContain('Preferred Range');
    expect(markup).toContain('64-79');
    expect(markup).toContain('Playable Range');
    expect(markup).toContain('60-84');
    expect(markup).toContain('music-debug-instrument-waveform');
    expect(markup).toContain('music-debug-instrument-waveform-shape');
    expect(markup).toContain('Patch Source');
    expect(markup).toContain('core-generated-bank');
    expect(markup).toContain('Generated');
    expect(markup).toContain('>Yes<');
    expect(markup).toContain('Attack');
    expect(markup).toMatch(/>\d+ ms</);
    expect(markup).toContain('Release');
    expect(markup).toContain('Sustain');
    expect(markup).toContain('0.74');
    expect(markup).toContain('Primary Oscillator');
    expect(markup).toContain(
      snapshot.musicSnapshot.instrumentBank.instruments.lead.waveform
    );
    expect(markup).toContain('Primary Harmonics');
    expect(markup).toMatch(
      /Fundamental only|Odd harmonics with gentle rolloff|Odd harmonics with strong presence|Full harmonic series|Custom harmonic profile/
    );
    expect(markup).toContain('Harmonic Oscillator');
    expect(markup).toContain('Harmonic Content');
    expect(markup).toMatch(
      /Fundamental only|Odd harmonics with gentle rolloff|Odd harmonics with strong presence|Full harmonic series|Custom harmonic profile/
    );
    expect(markup).toContain('Active Oscillator Count');
    expect(markup).toContain('>2<');
    expect(markup).toContain('Filter Type');
    expect(markup).toContain('lowpass');
    expect(markup).toContain('music-debug-instrument-filter-response');
    expect(markup).toContain('aria-label="Filter response preview for');
    expect(markup).toContain('Uses Samples');
    expect(markup).toContain('>No<');
    expect(markup).toContain('Uses Synthesis');
    expect(markup).toContain('Polyphony Limit');
    expect(markup).toContain('>12 voices<');
    expect(markup).toContain('Estimated Complexity');
    expect(markup).toMatch(/>Low<|>Medium<|>High</);
    expect(markup).toContain('Validation Warnings');
    expect(markup).toContain('None');
  });
});
