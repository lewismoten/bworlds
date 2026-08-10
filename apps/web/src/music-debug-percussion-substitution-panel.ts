import type { ProceduralMusicNote } from './procedural-music.ts';
import {
  resolvePercussionFamilyFromInstrumentId,
  resolvePercussionGrooveRoleFromInstrumentId,
  resolvePercussionVoiceNameFromInstrumentId,
} from './procedural-music-percussion.ts';

type PercussionSubstitutionFinding = {
  noteIndex: number;
  grooveRole: string;
  family: string;
  voiceName: string;
  startMs: number;
  expectedFamilies: readonly string[];
};

const EXPECTED_PERCUSSION_FAMILIES_BY_GROOVE_ROLE: Record<
  'kick' | 'pulse' | 'texture' | 'accent',
  readonly string[]
> = {
  kick: ['kick'],
  pulse: ['shaker'],
  texture: ['hand-percussion'],
  accent: ['snare', 'cymbals', 'hand-percussion'],
};

export function buildMusicDebugPercussionSubstitutionPanelMarkup(
  notes: readonly ProceduralMusicNote[]
): string {
  const findings = collectUnexpectedPercussionSubstitutions(notes);
  if (findings.length === 0) {
    return `
      <section class="music-debug-percussion-substitutions" aria-label="Percussion substitutions">
        <div class="music-debug-percussion-substitutions-head">
          <h3>Percussion Substitutions</h3>
          <p>No unexpected substitutions</p>
        </div>
        <p class="music-debug-percussion-substitutions-empty">All percussion voices match their expected groove-role families.</p>
      </section>
    `;
  }

  return `
    <section class="music-debug-percussion-substitutions" aria-label="Percussion substitutions">
      <div class="music-debug-percussion-substitutions-head">
        <h3>Percussion Substitutions</h3>
        <p>${findings.length} issue${findings.length === 1 ? '' : 's'}</p>
      </div>
      <div class="music-debug-percussion-substitutions-list">
        ${findings.map((finding) => buildFindingMarkup(finding)).join('')}
      </div>
    </section>
  `;
}

export function collectUnexpectedPercussionSubstitutions(
  notes: readonly ProceduralMusicNote[]
): PercussionSubstitutionFinding[] {
  return notes.flatMap((note, noteIndex) => {
    if (note.role !== 'percussion') {
      return [];
    }

    const grooveRole = resolvePercussionGrooveRoleFromInstrumentId(
      note.instrumentId
    );
    const family = resolvePercussionFamilyFromInstrumentId(note.instrumentId);
    if (!grooveRole || !family) {
      return [];
    }

    const expectedFamilies =
      EXPECTED_PERCUSSION_FAMILIES_BY_GROOVE_ROLE[grooveRole];
    if (expectedFamilies.includes(family)) {
      return [];
    }

    return [
      {
        noteIndex,
        grooveRole,
        family,
        voiceName:
          resolvePercussionVoiceNameFromInstrumentId(note.instrumentId) ??
          family,
        startMs: note.startMs,
        expectedFamilies,
      },
    ];
  });
}

function buildFindingMarkup(finding: PercussionSubstitutionFinding): string {
  return `
    <article class="music-debug-percussion-substitution-card">
      <p class="music-debug-percussion-substitution-title">
        P${finding.noteIndex + 1} ${formatEventTime(finding.startMs)} ${finding.voiceName}
      </p>
      <div class="music-debug-percussion-substitution-pills">
        <span class="music-debug-percussion-pill music-debug-percussion-pill-role">
          Groove ${finding.grooveRole}
        </span>
        <span class="music-debug-percussion-pill music-debug-percussion-pill-conflict">
          Actual ${finding.family}
        </span>
        <span class="music-debug-percussion-pill music-debug-percussion-pill-expected">
          Expected ${finding.expectedFamilies.join(' / ')}
        </span>
      </div>
    </article>
  `;
}

function formatEventTime(startMs: number): string {
  const totalSeconds = Math.max(0, startMs) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}
