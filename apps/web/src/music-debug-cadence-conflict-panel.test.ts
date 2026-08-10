import { describe, expect, it } from 'vitest';

import { buildMusicDebugCadenceConflictPanelMarkup } from './music-debug-cadence-conflict-panel.ts';
import type { MusicDebugCadenceDetection } from './music-debug-cadence-validation.ts';

describe('music debug cadence conflict panel', () => {
  it('highlights lead and bass notes that drift outside the active harmony', () => {
    const markup = buildMusicDebugCadenceConflictPanelMarkup([
      createDetection({
        sectionLabel: 'Outro',
        kind: 'answer',
        measureNumber: 16,
        harmonyPitchLabels: ['C', 'E', 'G'],
        leadPitchLabel: 'D',
        leadNoteLabel: 'D4',
        bassPitchLabel: 'A',
        bassNoteLabel: 'A3',
        matchesHarmony: false,
      }),
    ]);

    expect(markup).toContain('Cadence Harmony Conflicts');
    expect(markup).toContain('Outro answer cadence at measure 16');
    expect(markup).toContain('Harmony C / E / G');
    expect(markup).toContain('Lead D4');
    expect(markup).toContain('Bass A3');
    expect(markup).toContain('music-debug-cadence-pill-conflict');
  });

  it('renders an empty state when cadence harmony matches', () => {
    const markup = buildMusicDebugCadenceConflictPanelMarkup([
      createDetection({
        matchesHarmony: true,
      }),
    ]);

    expect(markup).toContain('No conflicts');
    expect(markup).toContain(
      'No cadence notes drifted outside the active harmony.'
    );
  });
});

function createDetection(
  overrides: Partial<MusicDebugCadenceDetection>
): MusicDebugCadenceDetection {
  return {
    sectionId: 'outro',
    sectionLabel: 'Outro',
    kind: 'answer',
    measureNumber: 16,
    leadPitchLabel: 'C',
    bassPitchLabel: 'C',
    leadNoteLabel: 'C4',
    bassNoteLabel: 'C3',
    harmonyPitchLabels: ['C', 'E', 'G'],
    matchesCadenceTarget: true,
    matchesHarmony: true,
    ...overrides,
  };
}
