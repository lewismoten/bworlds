import { describe, expect, it } from 'vitest';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugSnapshot,
} from './sound-bank-debug.ts';

describe('sound bank debug shell markup', () => {
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
    expect(markup).toContain('sound-bank-debug-preview-mode-processed');
    expect(markup).toContain('sound-bank-debug-preview-mode-dry');
    expect(markup).toContain('Processed previews');
    expect(markup).toContain('Dry previews');
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
    expect(markup).toContain('Play Melody');
    expect(markup).toContain('Play Phrase');
    expect(markup).toContain('Play Harmony');
    expect(markup).toContain('Play Bass');
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
    expect(normalizedMarkup).toContain('Patch Variant');
    expect(normalizedMarkup).toContain('music-debug-instrument-waveform');
    expect(normalizedMarkup).toContain('Waveform Preview');
    expect(normalizedMarkup).toContain('Spectrum Preview');
    expect(normalizedMarkup).toContain('Envelope Preview');
    expect(normalizedMarkup).toContain('Filter Response');
    expect(normalizedMarkup).toContain('Patch Source');
    expect(normalizedMarkup).toContain('Generated');
    expect(normalizedMarkup).toContain('Attack');
    expect(normalizedMarkup).toContain('Release');
    expect(normalizedMarkup).toContain('Sustain');
    expect(normalizedMarkup).toContain('Primary Oscillator');
    expect(normalizedMarkup).toContain('Primary Harmonics');
    expect(normalizedMarkup).toContain('Harmonic Oscillator');
    expect(normalizedMarkup).toContain('Harmonic Content');
    expect(normalizedMarkup).toContain('Active Oscillator Count');
    expect(normalizedMarkup).toContain('Filter Type');
    expect(normalizedMarkup).toContain('Uses Samples');
    expect(normalizedMarkup).toContain('Uses Synthesis');
    expect(normalizedMarkup).toContain('Polyphony Limit');
    expect(normalizedMarkup).toContain('Estimated Complexity');
    expect(normalizedMarkup).toContain('Validation Warnings');
    expect(normalizedMarkup).toContain('ADSR Envelope');
    expect(normalizedMarkup).toContain('sound-bank-debug-envelope-attack');
    expect(normalizedMarkup).toContain('sound-bank-debug-envelope-decay');
    expect(normalizedMarkup).toContain('sound-bank-debug-envelope-sustain');
    expect(normalizedMarkup).toContain('sound-bank-debug-envelope-release');
    expect(normalizedMarkup).toContain('Oscillator Toggles');
    expect(normalizedMarkup).toContain(
      'sound-bank-debug-oscillator-carrier-toggle'
    );
    expect(normalizedMarkup).toContain(
      'sound-bank-debug-oscillator-carrier-solo'
    );
    expect(normalizedMarkup).toContain(
      'sound-bank-debug-oscillator-harmonic-toggle'
    );
    expect(normalizedMarkup).toContain(
      'sound-bank-debug-oscillator-harmonic-solo'
    );
    expect(normalizedMarkup).toContain(
      'sound-bank-debug-oscillator-carrier-waveform'
    );
    expect(normalizedMarkup).toContain(
      'sound-bank-debug-oscillator-harmonic-waveform'
    );
    expect(normalizedMarkup).toContain(
      'sound-bank-debug-oscillator-carrier-gain'
    );
    expect(normalizedMarkup).toContain(
      'sound-bank-debug-oscillator-harmonic-gain'
    );
    expect(normalizedMarkup).toContain('Filter, Noise, and Detune');
    expect(normalizedMarkup).toContain('sound-bank-debug-timbre-detune');
    expect(normalizedMarkup).toContain('sound-bank-debug-timbre-filter-cutoff');
    expect(normalizedMarkup).toContain('sound-bank-debug-timbre-filter-q');
    expect(normalizedMarkup).toContain('sound-bank-debug-timbre-noise-mix');
    expect(normalizedMarkup).toContain('Compare to Reference Patch');
    expect(normalizedMarkup).toContain('Reference Patch Report');
    expect(normalizedMarkup).toContain('A/B Comparison');
    expect(normalizedMarkup).toContain('Instant A/B Phrase Preview');
    expect(normalizedMarkup).toContain('Play A: Current Patch');
    expect(normalizedMarkup).toContain('Play B: Reference Patch');
    expect(normalizedMarkup).toContain('data-ab-preview-mode="current"');
    expect(normalizedMarkup).toContain('data-ab-preview-mode="reference"');
    expect(normalizedMarkup).toContain('Reference Patch Library');
    expect(normalizedMarkup).toContain('Locked Role References');
    expect(normalizedMarkup).toContain('Locked reference');
    expect(normalizedMarkup).toContain('Play Reference Phrase');
    expect(normalizedMarkup).toContain('data-reference-patch-role="lead"');
    expect(normalizedMarkup).toContain('Breathy flute lead');
    expect(normalizedMarkup).toContain('Bowed string bed');
    expect(normalizedMarkup).toContain('Anchored upright bass');
    expect(normalizedMarkup).toContain('Punchy kick pulse');
    expect(normalizedMarkup).toContain('Family Match');
    expect(normalizedMarkup).toContain('Waveform Match');
    expect(normalizedMarkup).toContain('Closest Dimensions');
    expect(normalizedMarkup).toContain('Standard');
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

  it('renders the selected preview mode in the audio controls', () => {
    const markup = buildSoundBankDebugMarkup(createSoundBankDebugSnapshot(), {
      audioStatus: 'Audio idle',
      previewMode: 'dry',
    });

    expect(markup).toContain('id="sound-bank-debug-preview-mode-processed"');
    expect(markup).toContain('id="sound-bank-debug-preview-mode-dry"');
    expect(markup).toContain('Processed previews');
    expect(markup).toContain('Dry previews');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
  });

  it('shows the current generated patch variant for selected programs', () => {
    const standardMarkup = buildSoundBankDebugMarkup(
      createSoundBankDebugSnapshot({
        tileKind: 'plains',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      }),
      {
        audioStatus: 'Audio idle',
      }
    ).replace(/\s+/g, ' ');
    const historicalMarkup = buildSoundBankDebugMarkup(
      createSoundBankDebugSnapshot({
        tileKind: 'observatory',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      }),
      {
        audioStatus: 'Audio idle',
      }
    ).replace(/\s+/g, ' ');
    const ruinedMarkup = buildSoundBankDebugMarkup(
      createSoundBankDebugSnapshot({
        tileKind: 'ruins',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      }),
      {
        audioStatus: 'Audio idle',
      }
    ).replace(/\s+/g, ' ');

    expect(standardMarkup).toContain('<dt>Patch Variant</dt><dd>Standard</dd>');
    expect(historicalMarkup).toContain(
      '<dt>Patch Variant</dt><dd>Historical</dd>'
    );
    expect(ruinedMarkup).toContain('<dt>Patch Variant</dt><dd>Ruined</dd>');
  });
});
