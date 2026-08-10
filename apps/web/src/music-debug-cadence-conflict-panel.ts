import type { MusicDebugCadenceDetection } from './music-debug-cadence-validation.ts';

export function buildMusicDebugCadenceConflictPanelMarkup(
  detections: readonly MusicDebugCadenceDetection[]
): string {
  const conflicts = detections.filter((detection) => !detection.matchesHarmony);
  if (conflicts.length === 0) {
    return `
      <section class="music-debug-cadence-conflicts" aria-label="Cadence harmony conflicts">
        <div class="music-debug-cadence-conflicts-head">
          <h3>Cadence Harmony Conflicts</h3>
          <p>No conflicts</p>
        </div>
        <p class="music-debug-cadence-conflicts-empty">No cadence notes drifted outside the active harmony.</p>
      </section>
    `;
  }

  return `
    <section class="music-debug-cadence-conflicts" aria-label="Cadence harmony conflicts">
      <div class="music-debug-cadence-conflicts-head">
        <h3>Cadence Harmony Conflicts</h3>
        <p>${conflicts.length} issue${conflicts.length === 1 ? '' : 's'}</p>
      </div>
      <div class="music-debug-cadence-conflicts-list">
        ${conflicts.map((detection) => buildCadenceConflictCardMarkup(detection)).join('')}
      </div>
    </section>
  `;
}

function buildCadenceConflictCardMarkup(
  detection: MusicDebugCadenceDetection
): string {
  const harmonyPitchLabels = detection.harmonyPitchLabels;
  const leadConflicts =
    detection.leadPitchLabel !== null &&
    harmonyPitchLabels.length > 0 &&
    !harmonyPitchLabels.includes(detection.leadPitchLabel);
  const bassConflicts =
    detection.bassPitchLabel !== null &&
    harmonyPitchLabels.length > 0 &&
    !harmonyPitchLabels.includes(detection.bassPitchLabel);
  const measureLabel =
    detection.measureNumber === null
      ? 'unknown measure'
      : `measure ${detection.measureNumber}`;

  return `
    <article class="music-debug-cadence-conflict-card">
      <p class="music-debug-cadence-conflict-title">${detection.sectionLabel} ${detection.kind} cadence at ${measureLabel}</p>
      <div class="music-debug-cadence-conflict-pills">
        <span class="music-debug-cadence-pill music-debug-cadence-pill-harmony">
          Harmony ${harmonyPitchLabels.join(' / ') || 'open'}
        </span>
        <span class="music-debug-cadence-pill ${leadConflicts ? 'music-debug-cadence-pill-conflict' : 'music-debug-cadence-pill-match'}">
          Lead ${detection.leadNoteLabel ?? 'missing'}
        </span>
        <span class="music-debug-cadence-pill ${bassConflicts ? 'music-debug-cadence-pill-conflict' : 'music-debug-cadence-pill-match'}">
          Bass ${detection.bassNoteLabel ?? 'missing'}
        </span>
      </div>
    </article>
  `;
}
