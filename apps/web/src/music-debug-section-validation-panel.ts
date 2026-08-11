import type { MusicDebugSectionValidationSummary } from './music-debug-section-validation-summary.ts';

export function buildMusicDebugSectionValidationPanelMarkup(
  sections: readonly MusicDebugSectionValidationSummary[]
): string {
  if (sections.length === 0) {
    return `
      <section class="music-debug-section-validation-panel" aria-label="Section validation">
        <div class="music-debug-section-validation-head">
          <h3>Section Validation</h3>
          <p>No section validation details were generated.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="music-debug-section-validation-panel" aria-label="Section validation">
      <div class="music-debug-section-validation-head">
        <h3>Section Validation</h3>
        <p>Each section shows explicit pass or fail status for harmony, bass, cadence, and density checks.</p>
      </div>
      <div class="music-debug-section-validation-grid">
        ${sections.map((section) => buildSectionValidationCardMarkup(section)).join('')}
      </div>
    </section>
  `;
}

function buildSectionValidationCardMarkup(
  section: MusicDebugSectionValidationSummary
): string {
  return `
    <article class="music-debug-section-validation-card music-debug-section-validation-card-${section.overall}">
      <div class="music-debug-section-validation-card-head">
        <div>
          <h4>${section.sectionLabel}</h4>
          <p>${section.reasons[0] ?? 'All section-local checks passed.'}</p>
        </div>
        <span class="music-debug-section-validation-status music-debug-section-validation-status-${section.overall}">
          ${section.overall}
        </span>
      </div>
      <dl class="music-debug-section-validation-checks">
        ${buildCheckMarkup('Harmony', section.harmony)}
        ${buildCheckMarkup('Bass', section.bass)}
        ${buildCheckMarkup('Cadence', section.cadence)}
        ${buildCheckMarkup('Density', section.density)}
      </dl>
      ${buildReasonsMarkup(section.reasons)}
    </article>
  `;
}

function buildCheckMarkup(label: string, status: 'pass' | 'fail'): string {
  return `<div><dt>${label}</dt><dd class="music-debug-section-validation-status-${status}">${status}</dd></div>`;
}

function buildReasonsMarkup(reasons: readonly string[]): string {
  if (reasons.length === 0) {
    return '<p class="music-debug-section-validation-reasons-empty">No section-specific issues detected.</p>';
  }

  return `
    <ul class="music-debug-section-validation-reasons">
      ${reasons.map((reason) => `<li>${reason}</li>`).join('')}
    </ul>
  `;
}
