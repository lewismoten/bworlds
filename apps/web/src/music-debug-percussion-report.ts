import type { ProceduralMusicNote } from './procedural-music.ts';
import {
  resolvePercussionGrooveRoleFromInstrumentId,
  resolvePercussionFamilyFromInstrumentId,
  resolvePercussionVoiceIdFromInstrumentId,
  resolvePercussionVoiceNameFromInstrumentId,
} from './procedural-music-percussion.ts';

export type MusicDebugPercussionEventSummary = {
  noteIndex: number;
  startMs: number;
  durationMs: number;
  family: string | null;
  grooveRole: string | null;
  voiceId: string | null;
  voiceName: string;
};

export type MusicDebugPercussionVoiceCount = {
  family: string | null;
  grooveRole: string | null;
  voiceId: string | null;
  voiceName: string;
  noteCount: number;
};

export function createMusicDebugPercussionEventSummaries(
  notes: readonly ProceduralMusicNote[]
): MusicDebugPercussionEventSummary[] {
  return notes.flatMap((note, noteIndex) => {
    if (note.role !== 'percussion') {
      return [];
    }
    const family = resolvePercussionFamilyFromInstrumentId(note.instrumentId);
    const grooveRole = resolvePercussionGrooveRoleFromInstrumentId(
      note.instrumentId
    );
    const voiceId = resolvePercussionVoiceIdFromInstrumentId(note.instrumentId);
    const voiceName =
      resolvePercussionVoiceNameFromInstrumentId(note.instrumentId) ??
      family ??
      'percussion';
    return [
      {
        noteIndex,
        startMs: note.startMs,
        durationMs: note.durationMs,
        family,
        grooveRole,
        voiceId,
        voiceName,
      },
    ];
  });
}

export function createMusicDebugPercussionVoiceCounts(
  notes: readonly ProceduralMusicNote[]
): MusicDebugPercussionVoiceCount[] {
  const counts = new Map<string, MusicDebugPercussionVoiceCount>();

  for (const event of createMusicDebugPercussionEventSummaries(notes)) {
    const key = `${event.voiceId ?? 'unknown'}:${event.voiceName}`;
    const existing = counts.get(key);
    if (existing) {
      existing.noteCount += 1;
      continue;
    }
    counts.set(key, {
      family: event.family,
      grooveRole: event.grooveRole,
      voiceId: event.voiceId,
      voiceName: event.voiceName,
      noteCount: 1,
    });
  }

  return [...counts.values()];
}

export function formatMusicDebugPercussionEvents(
  notes: readonly ProceduralMusicNote[]
): string {
  const events = createMusicDebugPercussionEventSummaries(notes);
  if (events.length === 0) {
    return 'none';
  }
  return events
    .map(
      (event) =>
        `P${event.noteIndex + 1} ${formatMusicDebugEventTime(event.startMs)} ${formatMusicDebugPercussionRoleLabel(
          event.family,
          event.grooveRole
        )} ${formatMusicDebugPercussionVoiceLabel(event.voiceName)}`
    )
    .join(' | ');
}

export function formatMusicDebugPercussionVoiceCounts(
  notes: readonly ProceduralMusicNote[]
): string {
  const counts = createMusicDebugPercussionVoiceCounts(notes);
  if (counts.length === 0) {
    return 'none';
  }
  return counts
    .map(
      (entry) =>
        `${formatMusicDebugPercussionRoleLabel(
          entry.family,
          entry.grooveRole
        )} ${formatMusicDebugPercussionVoiceLabel(entry.voiceName)} ${entry.noteCount}`
    )
    .join(' | ');
}

function formatMusicDebugPercussionRoleLabel(
  family: string | null,
  grooveRole: string | null
): string {
  const familyLabel = family ? family.replaceAll('-', ' ') : 'percussion';
  const grooveLabel =
    grooveRole && grooveRole !== family ? ` / ${grooveRole}` : '';
  return `${familyLabel}${grooveLabel}`;
}

function formatMusicDebugPercussionVoiceLabel(voiceName: string): string {
  return `(${voiceName.replaceAll('-', ' ')})`;
}

function formatMusicDebugEventTime(startMs: number): string {
  const totalSeconds = Math.max(0, startMs) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}
