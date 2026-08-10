import { describe, expect, it } from 'vitest';
import type { SoundBankInstrumentDefinition } from './procedural-music-sound-bank.ts';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugQuietPercussionPatternNotes,
  createSoundBankDebugPercussionRangeAuditionNotes,
  createSoundBankDebugStandardPercussionPatternNotes,
  createSoundBankDebugSnapshot,
  normalizeSoundBankDebugGeneralMidiBrowserState,
  normalizeSoundBankDebugOptions,
  normalizeSoundBankDebugPercussionBrowserState,
  randomizeSoundBankDebugSeed,
  resolveSoundBankDebugGeneralMidiBrowserModel,
  resolveSoundBankDebugPreviewNoteRole,
} from './sound-bank-debug.ts';
import { registerSoundBankPluginInstruments } from './sound-bank-registry.ts';

describe('sound bank debug page', () => {
  it('normalizes partial debug options into a safe instrument-bank snapshot seed', () => {
    expect(
      normalizeSoundBankDebugOptions({
        tileKind: 'tower',
        contextType: 'town',
        clusterX: 12.8,
        clusterY: -5.2,
        dayProgress: 2,
        yearProgress: -1,
      })
    ).toEqual({
      tileKind: 'tower',
      contextType: 'town',
      clusterX: 13,
      clusterY: -5,
      dayProgress: 1,
      yearProgress: 0,
    });
  });

  it('builds a dedicated instrument-bank browser with preview controls', () => {
    const snapshot = createSoundBankDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
    });
    const normalizedMarkup = markup.replace(/\s+/g, ' ');

    expect(markup).toContain('<h1>Sound Bank Debug</h1>');
    expect(markup).toContain('/debug/');
    expect(markup).toContain('sound-bank-debug-form');
    expect(markup).toContain('sound-bank-debug-randomize');
    expect(markup).toContain('sound-bank-debug-reset');
    expect(markup).toContain('sound-bank-debug-audio-status');
    expect(markup).toContain('sound-bank-debug-start-audio');
    expect(markup).toContain('sound-bank-debug-resume-audio');
    expect(markup).toContain('sound-bank-debug-context-state');
    expect(markup).toContain('sound-bank-debug-sample-rate');
    expect(markup).toContain('sound-bank-debug-output-latency');
    expect(markup).toContain('sound-bank-debug-toggle-mute');
    expect(markup).toContain('sound-bank-debug-master-gain');
    expect(markup).toContain('Instrument Browser');
    expect(markup).toContain('Role Patches');
    expect(markup).toContain('Percussion Browser');
    expect(markup).toContain('sound-bank-debug-percussion-family-filter');
    expect(markup).toContain('sound-bank-debug-percussion-pad-grid');
    expect(markup).toContain('sound-bank-debug-percussion-pad');
    expect(markup).toContain('sound-bank-debug-percussion-pad-key');
    expect(markup).toContain('sound-bank-debug-percussion-standard-pattern');
    expect(markup).toContain('sound-bank-debug-percussion-quiet-pattern');
    expect(markup).toContain('sound-bank-debug-percussion-range-audition');
    expect(markup).toContain('Program Browser');
    expect(markup).toContain('sound-bank-debug-midi-search');
    expect(markup).toContain('sound-bank-debug-midi-family-filter');
    expect(markup).toContain('sound-bank-debug-midi-role-filter');
    expect(markup).toContain('sound-bank-debug-midi-range-filter');
    expect(markup).toContain('sound-bank-debug-midi-selected-program');
    expect(markup).toContain('sound-bank-debug-midi-sort');
    expect(markup).toContain('sound-bank-debug-midi-previous');
    expect(markup).toContain('sound-bank-debug-midi-next');
    expect(markup).toContain('music-debug-instrument-panel');
    expect(markup).toContain('sound-bank-debug-layout-compact');
    expect(markup).toContain('sound-bank-debug-layout-expanded');
    expect(markup).toContain('Play lead');
    expect(markup).toContain('Play harmony');
    expect(markup).toContain('Play bass');
    expect(markup).toContain('Play percussion / ');
    expect(markup).toContain('data-preview-id="percussion:');
    expect(normalizedMarkup).toContain('GM family: Synth Lead');
    expect(normalizedMarkup).toContain('GM name: Lead 1 (square)');
    expect(normalizedMarkup).toContain('GM program: 80');
    expect(normalizedMarkup).toContain('GM program: Percussion kit');
    expect(normalizedMarkup).toContain('Standard programs 0 through 127');
    expect(normalizedMarkup).toContain('Selected Program');
    expect(normalizedMarkup).toContain('Instrument ID');
    expect(normalizedMarkup).toContain('GM Program');
    expect(normalizedMarkup).toContain('GM Name');
    expect(normalizedMarkup).toContain('Supported Roles');
    expect(normalizedMarkup).toContain('Preferred Range');
    expect(normalizedMarkup).toContain('Playable Range');
    expect(normalizedMarkup).toContain('Patch Source');
    expect(normalizedMarkup).toContain('Generated');
    expect(normalizedMarkup).toContain('Validation Warnings');
    expect(normalizedMarkup).toContain('Placeholder patch');
    expect(normalizedMarkup).toContain('>Kick<');
    expect(normalizedMarkup).toContain('>36<');
    expect(normalizedMarkup).toContain('Kick Center');
    expect(normalizedMarkup).toContain('High Floor Tom');
    expect(normalizedMarkup).toContain('Missing patch');
    expect(normalizedMarkup).not.toContain(
      '<option value="percussion">Percussion</option>'
    );
    expect(normalizedMarkup).toContain('>Piano<');
    expect(normalizedMarkup).toContain('>0<');
    expect(normalizedMarkup).toContain('Acoustic Grand Piano');
    expect(normalizedMarkup).toContain('aria-disabled="true"');
    expect(normalizedMarkup).toContain('Unavailable');
    expect(normalizedMarkup).toContain('>Sound Effects<');
    expect(normalizedMarkup).toContain('>127<');
    expect(normalizedMarkup).toContain('Gunshot');

    const familyHeadings = [
      'Piano',
      'Chromatic Percussion',
      'Organ',
      'Guitar',
      'Bass',
      'Strings',
      'Ensemble',
      'Brass',
      'Reed',
      'Pipe',
      'Synth Lead',
      'Synth Pad',
      'Synth Effects',
      'Ethnic',
      'Percussive',
      'Sound Effects',
    ];

    expect(
      familyHeadings.every((familyName) =>
        normalizedMarkup.includes(`>${familyName}<`)
      )
    ).toBe(true);
  });

  it('renders the selected layout mode in the shell and toggle state', () => {
    const markup = buildSoundBankDebugMarkup(createSoundBankDebugSnapshot(), {
      audioStatus: 'Audio idle',
      layoutMode: 'compact',
    });

    expect(markup).toContain(
      'sound-bank-debug-shell sound-bank-debug-shell-compact'
    );
    expect(markup).toContain('id="sound-bank-debug-layout-compact"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('id="sound-bank-debug-layout-expanded"');
    expect(markup).toContain('aria-pressed="false"');
  });

  it('reflects audio context controls for idle and suspended states', () => {
    const idleMarkup = buildSoundBankDebugMarkup(
      createSoundBankDebugSnapshot(),
      {
        audioStatus: 'Audio idle',
        audioContextState: 'idle',
      }
    );
    const suspendedMarkup = buildSoundBankDebugMarkup(
      createSoundBankDebugSnapshot(),
      {
        audioStatus: 'Audio suspended',
        audioContextState: 'suspended',
      }
    );

    expect(idleMarkup).toContain('Context state:');
    expect(idleMarkup).toContain('id="sound-bank-debug-start-audio"');
    expect(idleMarkup).toContain('Start Audio');
    expect(idleMarkup).toContain(
      'id="sound-bank-debug-resume-audio"\n                type="button"\n                disabled'
    );
    expect(suspendedMarkup).toContain('Resume Audio');
    expect(suspendedMarkup).toContain('>suspended</span>');
  });

  it('shows browser-audio diagnostics and unavailable warnings in the status panel', () => {
    const runningMarkup = buildSoundBankDebugMarkup(
      createSoundBankDebugSnapshot(),
      {
        audioStatus: 'Audio ready',
        audioContextState: 'running',
        audioSampleRateHz: 48_000,
        outputLatencySeconds: 0.012,
      }
    );
    const unavailableMarkup = buildSoundBankDebugMarkup(
      createSoundBankDebugSnapshot(),
      {
        audioStatus: 'Audio unavailable',
        audioContextState: 'unavailable',
      }
    );

    expect(runningMarkup).toContain('48,000 Hz');
    expect(runningMarkup).toContain('12.0 ms');
    expect(unavailableMarkup).toContain(
      'Browser audio is unavailable. Web Audio previews cannot start here.'
    );
    expect(unavailableMarkup).toContain('Unavailable until audio starts');
  });

  it('shows master gain controls and muted warnings when audio output is muted', () => {
    const mutedMarkup = buildSoundBankDebugMarkup(
      createSoundBankDebugSnapshot(),
      {
        audioStatus: 'Audio muted',
        audioContextState: 'running',
        masterGain: 0,
        muted: true,
      }
    );

    expect(mutedMarkup).toContain('sound-bank-debug-master-gain-value');
    expect(mutedMarkup).toContain('Unmute Audio');
    expect(mutedMarkup).toContain(
      'Audio output is muted. Unmute or raise master gain to hear previews.'
    );
    expect(mutedMarkup).toContain('aria-pressed="true"');
    expect(mutedMarkup).toContain('value="0"');
  });

  it('randomizes the sound bank seed within the shared debug coordinate range', () => {
    expect(
      randomizeSoundBankDebugSeed(
        createSoundBankDebugSnapshot().options,
        () => 1
      )
    ).toEqual(
      expect.objectContaining({
        clusterX: 9_999,
        clusterY: 9_999,
      })
    );
  });

  it('shows invalid registered instruments in a warning list', () => {
    const invalidDefinition: SoundBankInstrumentDefinition = {
      id: 'plugin:bad:0:0',
      role: 'lead',
      generalMidiProgramNumber: 200,
      generalMidiInstrumentName: '',
      generalMidiFamilyName: 'Synth Lead',
      supportedRoles: ['lead'],
      recommendedMidiRange: { minMidiNote: 60, maxMidiNote: 84 },
      preferredMidiRange: { minMidiNote: 90, maxMidiNote: 92 },
      defaultVelocity: 108,
      defaultNoteDurationMs: 320,
    };
    const snapshot = createSoundBankDebugSnapshot(
      {},
      {
        registeredInstruments: registerSoundBankPluginInstruments({
          pluginName: 'broken-pack',
          definitions: [invalidDefinition],
        }),
      }
    );
    const normalizedMarkup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
    }).replace(/\s+/g, ' ');

    expect(normalizedMarkup).toContain('Instrument Validation');
    expect(normalizedMarkup).toContain('plugin:bad:0:0');
    expect(normalizedMarkup).toContain('from broken-pack');
    expect(normalizedMarkup).toContain(
      'General MIDI program number must be null or 0-127.'
    );
    expect(normalizedMarkup).toContain(
      'General MIDI instrument name is required.'
    );
  });

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

  it('normalizes percussion browser family filters into supported values', () => {
    expect(
      normalizeSoundBankDebugPercussionBrowserState({
        familyFilter: 'snare',
      })
    ).toEqual({
      familyFilter: 'snare',
    });
    expect(
      normalizeSoundBankDebugPercussionBrowserState({
        familyFilter: 'drums' as 'all',
      })
    ).toEqual({
      familyFilter: 'all',
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
    expect(markup).toContain('Patch Source');
    expect(markup).toContain('core-generated-bank');
    expect(markup).toContain('Generated');
    expect(markup).toContain('>Yes<');
    expect(markup).toContain('Validation Warnings');
    expect(markup).toContain('None');
  });

  it('builds fallback preview notes for percussion voices outside the current song seed', () => {
    const snapshot = createSoundBankDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
    });

    const note = resolveSoundBankDebugPreviewNoteRole(
      snapshot,
      'percussion:cymbals-51',
      9_000
    );

    expect(note).toEqual(
      expect.objectContaining({
        role: 'percussion',
        instrumentId: expect.stringContaining(':perc-cymbals-51:preview'),
        startMs: 9_004,
        waveform: 'square',
      })
    );
    expect(note?.durationMs).toBeGreaterThanOrEqual(96);
    expect(note?.attackMs).toBeGreaterThanOrEqual(4);
    expect(note?.releaseMs).toBeGreaterThanOrEqual(24);
  });

  it('filters the percussion browser to a selected drum family', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
      percussionBrowserState: {
        familyFilter: 'snare',
      },
    }).replace(/\s+/g, ' ');
    const percussionSection =
      markup.match(
        /<h2>Percussion Browser<\/h2>[\s\S]*?<section class="sound-bank-debug-panel"> <div class="sound-bank-debug-panel-head"> <div> <p class="sound-bank-debug-panel-kicker">General MIDI<\/p>/
      )?.[0] ?? markup;
    const percussionPadGrid =
      markup.match(
        /<div class="sound-bank-debug-percussion-pad-grid"[\s\S]*?<\/div> <div class="sound-bank-debug-percussion-browser">/
      )?.[0] ?? markup;

    expect(percussionSection).toContain('Snare');
    expect(percussionSection).toContain('Snare Main');
    expect(percussionSection).not.toContain('Kick Center');
    expect(percussionSection).not.toContain('Closed Hat');
    expect(percussionPadGrid).toContain('Snare Main');
    expect(percussionPadGrid).not.toContain('Kick Center');
    expect(percussionPadGrid).toContain('data-percussion-key="4"');
  });

  it('renders a compact drum pad grid for percussion previews', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
      percussionBrowserState: {
        familyFilter: 'kick',
      },
    }).replace(/\s+/g, ' ');
    const percussionPadGrid =
      markup.match(
        /<div class="sound-bank-debug-percussion-pad-grid"[\s\S]*?<\/div> <div class="sound-bank-debug-percussion-browser">/
      )?.[0] ?? markup;

    expect(percussionPadGrid).toContain('sound-bank-debug-percussion-pad-grid');
    expect(percussionPadGrid).toContain('data-preview-id="percussion:kick-36"');
    expect(percussionPadGrid).toContain('data-percussion-key="1"');
    expect(percussionPadGrid).toContain('data-percussion-key="3"');
    expect(percussionPadGrid).toContain('Kick Center');
    expect(percussionPadGrid).toContain('Floor Tom');
    expect(percussionPadGrid).not.toContain('High Floor Tom');
  });

  it('shows missing General MIDI percussion patches as unavailable browser rows', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
      percussionBrowserState: {
        familyFilter: 'kick',
      },
    }).replace(/\s+/g, ' ');

    expect(markup).toMatch(/High Floor Tom[\s\S]*Missing patch[\s\S]*>Unavailable</);
  });

  it('builds a percussion range audition from the visible drum-family filter', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const notes = createSoundBankDebugPercussionRangeAuditionNotes(
      snapshot,
      {
        familyFilter: 'kick',
      },
      12_000
    );

    expect(notes).toHaveLength(3);
    expect(notes.map((note) => note.instrumentId)).toEqual([
      expect.stringContaining(':perc-kick-36:'),
      expect.stringContaining(':perc-kick-35:'),
      expect.stringContaining(':perc-kick-41:'),
    ]);
    expect(notes.map((note) => note.startMs)).toEqual([
      12_004, 12_184, 12_364,
    ]);
  });

  it('builds a standard percussion pattern audition from visible drum voices', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const notes = createSoundBankDebugStandardPercussionPatternNotes(
      snapshot,
      {
        familyFilter: 'all',
      },
      16_000
    );

    expect(notes).toHaveLength(8);
    expect(notes.map((note) => note.instrumentId)).toEqual([
      expect.stringContaining(':perc-kick-36:'),
      expect.stringContaining(':perc-cymbals-42:'),
      expect.stringContaining(':perc-snare-38:'),
      expect.stringContaining(':perc-cymbals-42:'),
      expect.stringContaining(':perc-kick-36:'),
      expect.stringContaining(':perc-cymbals-42:'),
      expect.stringContaining(':perc-snare-38:'),
      expect.stringContaining(':perc-cymbals-46:'),
    ]);
    expect(notes.map((note) => note.startMs)).toEqual([
      16_004, 16_174, 16_344, 16_514, 16_684, 16_854, 17_024, 17_194,
    ]);
  });

  it('builds a quieter percussion pattern audition from visible drum voices', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const standardNotes = createSoundBankDebugStandardPercussionPatternNotes(
      snapshot,
      {
        familyFilter: 'all',
      },
      16_000
    );
    const quietNotes = createSoundBankDebugQuietPercussionPatternNotes(
      snapshot,
      {
        familyFilter: 'all',
      },
      16_000
    );

    expect(quietNotes).toHaveLength(8);
    expect(quietNotes.map((note) => note.instrumentId)).toEqual(
      standardNotes.map((note) => note.instrumentId)
    );
    expect(quietNotes.map((note) => note.startMs)).toEqual(
      standardNotes.map((note) => note.startMs)
    );
    expect(
      quietNotes.every(
        (note, index) => note.volume < standardNotes[index]!.volume
      )
    ).toBe(true);
    expect(
      quietNotes.every(
        (note, index) =>
          (note.velocity ?? 0) < (standardNotes[index]!.velocity ?? 0)
      )
    ).toBe(true);
  });
});
