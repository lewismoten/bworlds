import { describe, expect, it } from 'vitest';
import type { SoundBankInstrumentDefinition } from './procedural-music.ts';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugSnapshot,
  normalizeSoundBankDebugOptions,
  randomizeSoundBankDebugSeed,
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
    expect(markup).toContain('music-debug-instrument-panel');
    expect(markup).toContain('sound-bank-debug-layout-compact');
    expect(markup).toContain('sound-bank-debug-layout-expanded');
    expect(markup).toContain('Play lead');
    expect(markup).toContain('Play harmony');
    expect(markup).toContain('Play bass');
    expect(markup).toContain('Play percussion');
    expect(normalizedMarkup).toContain('GM family: Synth Lead');
    expect(normalizedMarkup).toContain('GM name: Lead 1 (square)');
    expect(normalizedMarkup).toContain('GM program: 80');
    expect(normalizedMarkup).toContain('GM program: Percussion kit');
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
});
