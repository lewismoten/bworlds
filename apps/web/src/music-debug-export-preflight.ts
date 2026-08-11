import type { MusicDebugSnapshot } from './music-debug.ts';
import { collectMusicDebugPatchQualityWarnings } from './music-debug-patch-quality.ts';

export type MusicDebugExportConfirm = (message: string) => boolean;

export function buildMusicDebugPatchWarningPreflightMessage(
  snapshot: Pick<MusicDebugSnapshot, 'instrumentBank'>
): string | null {
  const warnings = collectMusicDebugPatchQualityWarnings(snapshot.instrumentBank);
  if (warnings.length === 0) {
    return null;
  }

  const lines = warnings
    .slice(0, 3)
    .map((warning) => `- ${warning.message}`);
  if (warnings.length > 3) {
    lines.push(`- ${warnings.length - 3} more patch warning(s) not shown`);
  }

  return [
    'Patch quality warnings were detected before export.',
    '',
    ...lines,
    '',
    'Continue export?',
  ].join('\n');
}

export function confirmMusicDebugExportPreflight(
  snapshot: Pick<MusicDebugSnapshot, 'instrumentBank'>,
  options: {
    confirm?: MusicDebugExportConfirm | null;
  } = {}
): boolean {
  const message = buildMusicDebugPatchWarningPreflightMessage(snapshot);
  if (!message) {
    return true;
  }
  if (typeof options.confirm !== 'function') {
    return true;
  }
  return options.confirm(message);
}
