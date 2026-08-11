import { describe, expect, it } from 'vitest';
import type { SoundBankInstrumentDefinition } from './procedural-music-sound-bank.ts';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugSnapshot,
} from './sound-bank-debug.ts';
import { registerSoundBankPluginInstruments } from './sound-bank-registry.ts';

describe('sound bank debug shell audio and validation', () => {
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
