import { describe, expect, it } from 'vitest';

import {
  buildMusicDebugPercussionSubstitutionPanelMarkup,
  collectUnexpectedPercussionSubstitutions,
} from './music-debug-percussion-substitution-panel.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('music debug percussion substitution panel', () => {
  it('flags percussion notes whose family does not match the groove role', () => {
    const notes = [
      createPercussionNote(
        'deep-forest:percussion:3:-2:perc-kick-36:0:groove-pulse',
        0
      ),
      createPercussionNote(
        'deep-forest:percussion:3:-2:perc-hand-percussion-54:1:groove-texture',
        750
      ),
    ];

    expect(collectUnexpectedPercussionSubstitutions(notes)).toEqual([
      expect.objectContaining({
        noteIndex: 0,
        grooveRole: 'pulse',
        family: 'kick',
        expectedFamilies: ['shaker'],
      }),
    ]);

    const markup = buildMusicDebugPercussionSubstitutionPanelMarkup(notes);
    expect(markup).toContain('Percussion Substitutions');
    expect(markup).toContain('P1 0:00.0 kick-center');
    expect(markup).toContain('Groove pulse');
    expect(markup).toContain('Actual kick');
    expect(markup).toContain('Expected shaker');
    expect(markup).toContain('music-debug-percussion-pill-conflict');
  });

  it('renders an empty state when all groove-role families are expected', () => {
    const markup = buildMusicDebugPercussionSubstitutionPanelMarkup([
      createPercussionNote(
        'deep-forest:percussion:3:-2:perc-shaker-69:0:groove-pulse',
        0
      ),
    ]);

    expect(markup).toContain('No unexpected substitutions');
    expect(markup).toContain(
      'All percussion voices match their expected groove-role families.'
    );
  });
});

function createPercussionNote(
  instrumentId: string,
  startMs: number
): ProceduralMusicNote {
  return {
    themeId: 'deep-forest',
    instrumentId,
    role: 'percussion',
    startMs,
    durationMs: 120,
    frequency: 440,
    volume: 0.02,
    velocity: 96,
    waveform: 'triangle',
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 1,
      filterType: 'bandpass',
      filterCutoffHz: 1000,
      filterQ: 1,
    },
    attackMs: 8,
    releaseMs: 60,
    detuneCents: 0,
    harmonicGain: 0.1,
    pulseRate: 1,
  };
}
