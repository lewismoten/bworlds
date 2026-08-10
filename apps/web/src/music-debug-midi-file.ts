import { inspectMusicDebugMidiBytes } from './music-debug-midi-audit.ts';
import { resolveMusicDebugMidiExportRoles } from './music-debug-midi-export-variant.ts';
import {
  createMusicDebugMidiFileUnchecked,
  type MusicDebugMidiFile,
  type MusicDebugMidiMetadataOptions,
} from './music-debug-midi.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

export function createMusicDebugMidiFile(
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): MusicDebugMidiFile {
  const variant = metadataOptions.variant ?? 'full';
  const validationMessages = [
    ...snapshot.midiExportValidation.messages,
    ...snapshot.motifValidation.messages,
    ...snapshot.timingValidation.messages,
    ...snapshot.percussionValidation.messages,
    ...snapshot.songDnaValidation.messages,
  ];
  if (
    !snapshot.midiExportValidation.isValidForMidiExport ||
    !snapshot.motifValidation.isValidForMidiExport ||
    !snapshot.timingValidation.isValidForMidiExport ||
    !snapshot.percussionValidation.isValidForMidiExport ||
    !snapshot.songDnaValidation.isValidForMidiExport
  ) {
    throw new Error(`Cannot export MIDI: ${validationMessages.join(' ')}`);
  }
  const file = createMusicDebugMidiFileUnchecked(snapshot, metadataOptions);
  const midiAudit = inspectMusicDebugMidiBytes(file.bytes, snapshot, {
    includedRoles: resolveMusicDebugMidiExportRoles(variant),
  });
  if (!midiAudit.isConsistent) {
    throw new Error(
      `Cannot export MIDI: ${midiAudit.mismatchMessages.join(' ')}`
    );
  }
  return file;
}
