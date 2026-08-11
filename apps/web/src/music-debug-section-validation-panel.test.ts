import { describe, expect, it } from 'vitest';

import { buildMusicDebugSectionValidationPanelMarkup } from './music-debug-section-validation-panel.ts';

describe('music debug section validation panel', () => {
  it('renders explicit pass or fail status for each section', () => {
    const markup = buildMusicDebugSectionValidationPanelMarkup([
      {
        sectionId: 'intro',
        sectionLabel: 'Intro',
        harmony: 'pass',
        bass: 'pass',
        cadence: 'pass',
        density: 'pass',
        overall: 'pass',
        reasons: [],
      },
      {
        sectionId: 'a',
        sectionLabel: 'A',
        harmony: 'fail',
        bass: 'pass',
        cadence: 'fail',
        density: 'fail',
        overall: 'fail',
        reasons: ['harmony m6 Em vs Dm', 'answer cadence harmony m8'],
      },
    ]);

    expect(markup).toContain('Section Validation');
    expect(markup).toContain('music-debug-section-validation-card-pass');
    expect(markup).toContain('music-debug-section-validation-card-fail');
    expect(markup).toContain('>Intro<');
    expect(markup).toContain('>A<');
    expect(markup).toContain('All section-local checks passed.');
    expect(markup).toContain('harmony m6 Em vs Dm');
    expect(markup).toContain('answer cadence harmony m8');
    expect(markup).toContain('>Harmony<');
    expect(markup).toContain('>Cadence<');
  });

  it('renders an empty state when no section details are available', () => {
    const markup = buildMusicDebugSectionValidationPanelMarkup([]);

    expect(markup).toContain('No section validation details were generated.');
  });
});
